/* Judge Portal — Odia Roots Manabasa 2026
   - Password gate (real Supabase login; the database checks the role)
   - Scorecard with live weighted score
   - Overwrite semantics: same judge + same entry → replace previous scorecard */
(() => {
  'use strict';

  ORM.useRole('judge');
  const loginShell = document.getElementById('login-shell');
  const portal = document.getElementById('portal');
  let entries = [];

  /* ---------- Auth ---------- */
  function showPortal() {
    loginShell.classList.add('hidden');
    portal.classList.remove('hidden');
    initPortal();
  }

  document.getElementById('login-form').addEventListener('submit', async e => {
    e.preventDefault();
    const pass = document.getElementById('judge-pass').value.trim();
    const alertEl = document.getElementById('login-alert');
    alertEl.classList.add('hidden');
    try {
      if (await ORM.tryLogin('judge', pass)) {
        showPortal();
      } else {
        alertEl.textContent = 'Incorrect password. Please check with the Organizing Committee.';
        alertEl.classList.remove('hidden');
      }
    } catch (err) {
      alertEl.textContent = 'Could not sign in: ' + err.message;
      alertEl.classList.remove('hidden');
    }
  });

  document.getElementById('logout-btn').addEventListener('click', () => ORM.logout('judge'));


  /* ---------- Portal ---------- */
  const grid = document.getElementById('score-grid');
  const liveScore = document.getElementById('live-score');
  const entrySel = document.getElementById('sc-entry');
  const judgeInput = document.getElementById('sc-judge');

  function buildScoreInputs() {
    grid.innerHTML = '';
    ORM.CRITERIA.forEach(c => {
      const label = document.createElement('label');
      label.className = 'crit-label';
      label.htmlFor = 'crit-' + c.key;
      label.innerHTML = `${ORM.esc(c.label)} <span class="wt">${Math.round(c.weight * 100)}%</span>`;
      const input = document.createElement('input');
      input.type = 'number';
      input.id = 'crit-' + c.key;
      input.min = '0'; input.max = '10'; input.step = '0.5';
      input.inputMode = 'decimal';
      input.setAttribute('aria-label', c.label + ' score, 0 to 10');
      input.addEventListener('input', updateLiveScore);
      grid.appendChild(label);
      grid.appendChild(input);
    });
  }

  function readScores() {
    const scores = {};
    for (const c of ORM.CRITERIA) {
      const raw = document.getElementById('crit-' + c.key).value;
      if (raw === '') return null;
      const v = Number(raw);
      if (isNaN(v) || v < 0 || v > 10) return null;
      scores[c.key] = v;
    }
    return scores;
  }

  function updateLiveScore() {
    const scores = {};
    ORM.CRITERIA.forEach(c => {
      scores[c.key] = Number(document.getElementById('crit-' + c.key).value) || 0;
    });
    liveScore.textContent = ORM.computeFinalScore(scores).toFixed(2);
  }

  async function initPortal() {
    buildScoreInputs();
    try {
      entries = await ORM.rpc('orm_judge_entries');
      entries
        .filter(e => e.entry_id)
        .sort((a, b) => a.entry_id.localeCompare(b.entry_id))
        .forEach(e => {
          entrySel.add(new Option(
            `${e.entry_id} — ${e.participant_name} (${e.category})`, e.entry_id));
        });
    } catch (err) {
      showError('Could not load entries: ' + err.message);
    }
  }

  entrySel.addEventListener('change', () => {
    const preview = document.getElementById('entry-preview');
    const e = entries.find(x => x.entry_id === entrySel.value);
    if (!e) { preview.classList.add('hidden'); return; }
    preview.innerHTML = `<strong>${ORM.esc(e.entry_id)}</strong> · ${ORM.esc(e.participant_name)} — ${ORM.esc(e.city)}, ${ORM.esc(e.state)}<br>
      <em>"${ORM.esc(e.submission_title)}"</em> · Category: ${ORM.esc(e.category)}<br>
      ${videoLinkHtml(e)}`;
    preview.classList.remove('hidden');
  });

  function videoLinkHtml(e) {
    const ok = u => /^https?:\/\//i.test(u || '');
    if (ok(e.facebook_link)) return `<a href="${ORM.esc(e.facebook_link)}" target="_blank" rel="noopener noreferrer">Watch video on Facebook <i class="fa-solid fa-arrow-up-right-from-square"></i></a>`;
    if (ok(e.drive_link)) return `<a href="${ORM.esc(e.drive_link)}" target="_blank" rel="noopener noreferrer">Watch video on Google Drive <i class="fa-solid fa-arrow-up-right-from-square"></i></a>`;
    return 'No video link on file';
  }

  judgeInput.addEventListener('blur', refreshMyScores);

  function showError(msg) {
    const el = document.getElementById('sc-alert');
    el.textContent = msg;
    el.classList.remove('hidden');
    document.getElementById('sc-success').classList.add('hidden');
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  function showSuccess(msg) {
    const el = document.getElementById('sc-success');
    el.innerHTML = msg;
    el.classList.remove('hidden');
    document.getElementById('sc-alert').classList.add('hidden');
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  /* ---------- Submit scorecard ---------- */
  document.getElementById('scorecard-form').addEventListener('submit', async e => {
    e.preventDefault();
    document.getElementById('sc-alert').classList.add('hidden');
    document.getElementById('sc-success').classList.add('hidden');

    const entryId = entrySel.value;
    const judgeName = judgeInput.value.trim();
    let ok = true;

    document.getElementById('err-sc-entry').classList.toggle('show', !entryId);
    if (!entryId) ok = false;
    document.getElementById('err-sc-judge').classList.toggle('show', !judgeName);
    if (!judgeName) ok = false;

    const scores = readScores();
    document.getElementById('err-scores').classList.toggle('show', !scores);
    if (!scores) ok = false;

    if (!ok) { showError('Please complete the highlighted fields — every criterion needs a 0–10 score.'); return; }

    const btn = document.getElementById('sc-submit');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving…';

    try {
      // The database recalculates the official weighted score and replaces
      // this judge's earlier scorecard for the same entry, if there is one.
      const saved = await ORM.rpc('orm_submit_scorecard', { p: {
        entry_id: entryId,
        judge_name: judgeName,
        ...scores,
        comments: document.getElementById('sc-comments').value.trim()
      }});
      const finalScore = Number(saved.final_score);

      const entry = entries.find(x => x.entry_id === entryId);
      if (entry) entry.status = 'Judged';

      showSuccess(`<strong>Scorecard saved.</strong> ${saved.replaced ? 'Your previous scorecard for this entry was replaced.' : ''} Entry <strong>${ORM.esc(entryId)}</strong> — your weighted final score: <strong>${finalScore.toFixed(2)} / 100</strong>.`);

      // Reset scores (keep judge name for convenience)
      ORM.CRITERIA.forEach(c => document.getElementById('crit-' + c.key).value = '');
      document.getElementById('sc-comments').value = '';
      entrySel.value = '';
      document.getElementById('entry-preview').classList.add('hidden');
      updateLiveScore();
      refreshMyScores();
    } catch (err) {
      console.error(err);
      showError('Could not save the scorecard: ' + err.message);
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Submit Scorecard';
    }
  });

  /* ---------- My scorecards table ---------- */
  async function refreshMyScores() {
    const judgeName = judgeInput.value.trim();
    const tbody = document.querySelector('#my-scores-table tbody');
    if (!judgeName) return;
    try {
      const mine = await ORM.rpc('orm_my_scorecards', { p_judge_name: judgeName });
      if (!mine.length) {
        tbody.innerHTML = '<tr><td colspan="5" class="muted text-center">No scorecards yet.</td></tr>';
        return;
      }
      tbody.innerHTML = mine.map(sc => {
        return `<tr>
          <td><strong>${ORM.esc(sc.entry_id)}</strong></td>
          <td>${ORM.esc(sc.participant_name || '—')}</td>
          <td>${ORM.esc(sc.category || '—')}</td>
          <td><span class="badge badge-gold">${Number(sc.final_score).toFixed(2)}</span></td>
          <td>${ORM.fmtDate(sc.scored_at)}</td>
        </tr>`;
      }).join('');
    } catch (err) {
      console.warn(err);
    }
  }

  // Already signed in earlier in this tab? Open the portal straight away.
  // (Must run last so every variable above exists first.)
  if (ORM.isAuthed('judge')) showPortal();
})();
