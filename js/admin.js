/* Admin Dashboard — Odia Roots Manabasa 2026 */
(() => {
  'use strict';

  let entries = [], scorecards = [], engagement = [], aggregates = {};

  /* ---------- Auth ---------- */
  ORM.useRole('admin');
  const loginShell = document.getElementById('login-shell');
  const dashboard = document.getElementById('dashboard');

  document.getElementById('login-form').addEventListener('submit', async e => {
    e.preventDefault();
    const alertEl = document.getElementById('login-alert');
    alertEl.classList.add('hidden');
    try {
      if (await ORM.tryLogin('admin', document.getElementById('admin-pass').value.trim())) {
        enter();
      } else {
        alertEl.textContent = 'Incorrect password.';
        alertEl.classList.remove('hidden');
      }
    } catch (err) {
      alertEl.textContent = 'Could not sign in: ' + err.message;
      alertEl.classList.remove('hidden');
    }
  });
  document.getElementById('logout-btn').addEventListener('click', () => ORM.logout('admin'));

  function enter() {
    loginShell.classList.add('hidden');
    dashboard.classList.remove('hidden');
    loadAll();
  }
  if (ORM.isAuthed('admin')) enter();

  /* ---------- Tabs ---------- */
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
    });
  });

  function flash(msg, isError = false) {
    const el = document.getElementById('admin-alert');
    el.textContent = msg;
    el.className = 'alert ' + (isError ? 'alert-error' : 'alert-success');
    el.classList.remove('hidden');
    setTimeout(() => el.classList.add('hidden'), 4000);
  }

  /* ---------- Data load ---------- */
  async function loadAll() {
    try {
      [entries, scorecards, engagement] = await Promise.all([
        ORM.apiListAll('entries'),
        ORM.apiListAll('scorecards'),
        ORM.apiListAll('engagement')
      ]);
      aggregates = ORM.aggregateScores(scorecards);
      renderOverview();
      renderEntries();
      renderLeaderboard();
      renderPeoplesChoice();
      renderSettings();
    } catch (err) {
      flash('Failed to load data: ' + err.message, true);
    }
  }

  /* ---------- Overview ---------- */
  function renderOverview() {
    const total = entries.length;
    const submitted = entries.filter(e => e.video_submitted).length;
    const pending = entries.filter(e => !e.video_submitted);
    const judgedIds = new Set(Object.keys(aggregates));
    const judged = entries.filter(e => judgedIds.has((e.entry_id || '').toUpperCase())).length;
    const latestCards = ORM.latestScorecards(scorecards);

    document.getElementById('stat-cards').innerHTML = `
      ${stat(total, 'Total Registrations', 'fa-users')}
      ${stat(submitted, 'Videos Submitted', 'fa-video')}
      ${stat(pending.length, 'Videos Pending', 'fa-hourglass-half')}
      ${stat(judged + ' / ' + total, 'Entries Judged (' + latestCards.length + ' scorecards)', 'fa-scale-balanced')}
    `;

    // By category
    const catCounts = {};
    ORM.CATEGORIES.forEach(c => catCounts[c] = 0);
    entries.forEach(e => { if (catCounts[e.category] !== undefined) catCounts[e.category]++; });
    document.getElementById('by-category').innerHTML = bars(catCounts);

    // By state
    const stCounts = {};
    entries.forEach(e => { const s = e.state || 'Unknown'; stCounts[s] = (stCounts[s] || 0) + 1; });
    const sorted = Object.fromEntries(Object.entries(stCounts).sort((a, b) => b[1] - a[1]));
    document.getElementById('by-state').innerHTML =
      Object.keys(sorted).length ? bars(sorted) : '<p class="muted">No registrations yet.</p>';

    // Pending follow-up
    const tbody = document.querySelector('#pending-table tbody');
    tbody.innerHTML = pending.length
      ? pending.map(e => `<tr>
          <td><strong>${ORM.esc(e.entry_id)}</strong></td>
          <td>${ORM.esc(e.participant_name)}</td>
          <td>${ORM.esc(e.category)}</td>
          <td><a href="mailto:${ORM.esc(e.email)}">${ORM.esc(e.email)}</a></td>
          <td>${ORM.esc(e.phone)}</td>
          <td>${ORM.fmtDate(e.submitted_at)}</td>
        </tr>`).join('')
      : '<tr><td colspan="6" class="text-center muted">Everyone who registered has submitted a video. 🎉</td></tr>';
  }

  const stat = (num, lbl, icon) => `
    <div class="stat-card">
      <div class="stat-num"><i class="fa-solid ${icon}" style="font-size:1.1rem;color:var(--gold);margin-right:0.4rem;"></i>${num}</div>
      <div class="stat-lbl">${lbl}</div>
    </div>`;

  function bars(counts) {
    const max = Math.max(1, ...Object.values(counts));
    return Object.entries(counts).map(([k, v]) => `
      <div class="bar-row">
        <div class="bar-label" title="${ORM.esc(k)}">${ORM.esc(k)}</div>
        <div class="bar-track"><div class="bar-fill" style="width:${(v / max) * 100}%"></div></div>
        <div class="bar-val">${v}</div>
      </div>`).join('');
  }

  /* ---------- Entries tab ---------- */
  const catFilter = document.getElementById('entry-cat-filter');
  ORM.CATEGORIES.forEach(c => catFilter.add(new Option(c, c)));
  ['entry-search', 'entry-cat-filter', 'entry-status-filter'].forEach(id =>
    document.getElementById(id).addEventListener('input', renderEntries));

  function renderEntries() {
    const q = document.getElementById('entry-search').value.trim().toLowerCase();
    const cat = catFilter.value;
    const st = document.getElementById('entry-status-filter').value;

    const rows = entries.filter(e => {
      if (cat && e.category !== cat) return false;
      if (st && e.status !== st) return false;
      if (q) {
        const hay = [e.entry_id, e.participant_name, e.city, e.state, e.email, e.submission_title].join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    }).sort((a, b) => (a.entry_id || '').localeCompare(b.entry_id || ''));

    const tbody = document.querySelector('#entries-table tbody');
    tbody.innerHTML = rows.length ? rows.map(e => {
      const agg = aggregates[(e.entry_id || '').toUpperCase()];
      return `<tr>
        <td><strong>${ORM.esc(e.entry_id)}</strong></td>
        <td>${ORM.esc(e.participant_name)}</td>
        <td>${ORM.esc(e.city)}, ${ORM.esc(e.state)}</td>
        <td>${ORM.esc(e.category)}</td>
        <td>${ORM.esc(e.submission_title)}</td>
        <td>${e.video_submitted ? '<span class="badge badge-green">Yes</span>' : '<span class="badge badge-red">Pending</span>'}</td>
        <td>${statusBadge(e.status)}</td>
        <td>${agg ? `<span class="badge badge-gold">${agg.avg.toFixed(2)}</span> <span class="muted" style="font-size:0.72rem;">(${agg.judges} judge${agg.judges > 1 ? 's' : ''})</span>` : '<span class="muted">—</span>'}</td>
        <td><button class="btn btn-sm btn-maroon" data-view="${ORM.esc(e.id)}"><i class="fa-solid fa-eye"></i></button></td>
      </tr>`;
    }).join('') : '<tr><td colspan="9" class="text-center muted">No entries match the current filters.</td></tr>';

    tbody.querySelectorAll('[data-view]').forEach(b =>
      b.addEventListener('click', () => showDetail(b.dataset.view)));
  }

  // The video link is either a Facebook link or a Google Drive link; only real web links are clickable.
  function videoLink(e) {
    const u = e.facebook_link || e.drive_link || '';
    return /^https?:\/\//i.test(u) ? u : '';
  }

  function statusBadge(s) {
    const map = { 'Registered': 'badge-grey', 'Video Submitted': 'badge-gold', 'Judged': 'badge-maroon', 'Winner': 'badge-green' };
    return `<span class="badge ${map[s] || 'badge-grey'}">${ORM.esc(s || '—')}</span>`;
  }

  function showDetail(id) {
    const e = entries.find(x => x.id === id);
    if (!e) return;
    const agg = aggregates[(e.entry_id || '').toUpperCase()];
    const cards = ORM.latestScorecards(scorecards).filter(sc => (sc.entry_id || '').toUpperCase() === (e.entry_id || '').toUpperCase());
    const el = document.getElementById('entry-detail');
    el.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:1rem;flex-wrap:wrap;">
        <h3>${ORM.esc(e.entry_id)} — ${ORM.esc(e.participant_name)}</h3>
        <button class="btn btn-sm btn-maroon" id="close-detail"><i class="fa-solid fa-xmark"></i> Close</button>
      </div>
      <div class="grid grid-2 mt-2" style="font-size:0.9rem;gap:0.5rem 1.5rem;">
        <div><strong>Location:</strong> ${ORM.esc(e.city)}, ${ORM.esc(e.state)}</div>
        <div><strong>Email:</strong> ${ORM.esc(e.email)} · <strong>Phone:</strong> ${ORM.esc(e.phone)}</div>
        <div><strong>Category:</strong> ${ORM.esc(e.category)}</div>
        <div><strong>Title:</strong> ${ORM.esc(e.submission_title)}</div>
        <div><strong>Method:</strong> ${ORM.esc(e.submission_method)} ${videoLink(e) ? `— <a href="${ORM.esc(videoLink(e))}" target="_blank" rel="noopener noreferrer">open video</a>` : ''}</div>
        <div><strong>FB profile:</strong> ${ORM.esc(e.facebook_profile || '—')}</div>
        <div><strong>Children:</strong> ${ORM.esc(e.children_info || '—')}</div>
        <div><strong>Consent to publish:</strong> ${ORM.esc(e.consent_publish)}</div>
        <div style="grid-column:1/-1;"><strong>Description:</strong> ${ORM.esc(e.description)}</div>
      </div>
      <h4 class="mt-3" style="font-size:1rem;">Judge Scorecards ${agg ? `— official average <span class="badge badge-gold">${agg.avg.toFixed(2)} / 100</span>` : '(none yet)'}</h4>
      ${cards.length ? `<div class="table-wrap mt-1"><table class="data-table"><thead><tr>
        <th>Judge</th><th>CA (25%)</th><th>PQ (20%)</th><th>ES (20%)</th><th>FYP (15%)</th><th>CR (10%)</th><th>OVP (10%)</th><th>Final</th><th>Comments</th>
      </tr></thead><tbody>
      ${cards.map(sc => `<tr>
        <td>${ORM.esc(sc.judge_name)}</td>
        <td>${sc.cultural_authenticity}</td><td>${sc.presentation_quality}</td><td>${sc.explanation_storytelling}</td>
        <td>${sc.family_youth_participation}</td><td>${sc.creativity}</td><td>${sc.overall_video_presentation}</td>
        <td><strong>${Number(sc.final_score).toFixed(2)}</strong></td>
        <td>${ORM.esc(sc.comments || '—')}</td>
      </tr>`).join('')}</tbody></table></div>` : ''}
    `;
    el.classList.remove('hidden');
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    document.getElementById('close-detail').addEventListener('click', () => el.classList.add('hidden'));
  }

  /* ---------- CSV export (for reconciliation with odiaroots.org Competition Manager) ---------- */
  document.getElementById('export-csv').addEventListener('click', () => {
    const cols = ['entry_id','participant_name','city','state','email','phone','children_info','category',
      'submission_title','submission_method','facebook_link','drive_link','facebook_profile',
      'description','consent_publish','video_submitted','status','submitted_at'];
    const csvCell = v => '"' + String(v ?? '').replace(/"/g, '""') + '"';
    const header = cols.join(',') + ',avg_final_score,judge_count';
    const body = entries.map(e => {
      const agg = aggregates[(e.entry_id || '').toUpperCase()];
      return cols.map(c => csvCell(e[c])).join(',') + ',' + (agg ? agg.avg : '') + ',' + (agg ? agg.judges : 0);
    });
    const blob = new Blob([[header].concat(body).join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'odia-roots-manabasa-2026-entries.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  });

  /* ---------- Leaderboard ---------- */
  function renderLeaderboard() {
    const wrap = document.getElementById('leaderboard-wrap');
    const judgedCats = ORM.CATEGORIES.filter(c => c !== ORM.PEOPLES_CHOICE);
    wrap.innerHTML = judgedCats.map(cat => {
      const ranked = ORM.rankCategory(entries, aggregates, cat);
      const totalInCat = entries.filter(e => e.category === cat).length;
      return `<div class="card mb-3">
        <h3>${ORM.esc(cat)} <span class="muted" style="font-size:0.78rem;font-weight:400;">${ranked.length} judged / ${totalInCat} entries</span></h3>
        <div class="award-name" style="font-size:0.82rem;color:var(--gold);font-style:italic;">Winner receives: ${ORM.esc(ORM.AWARD_NAMES[cat])}</div>
        ${ranked.length ? `<ol class="rank-list">
          ${ranked.map((r, i) => `<li>
            <span class="rk">#${i + 1}${i === 0 ? ' <i class="fa-solid fa-crown"></i>' : ''}</span>
            <span class="nm"><strong>${ORM.esc(r.entry.entry_id)}</strong> · ${ORM.esc(r.entry.participant_name)} — "${ORM.esc(r.entry.submission_title)}"</span>
            <span class="sc">${r.score.toFixed(2)} <span class="muted" style="font-weight:400;font-size:0.75rem;">(${r.judges}j)</span></span>
          </li>`).join('')}
        </ol>` : '<p class="muted mt-1" style="font-size:0.88rem;">No judged entries yet in this category.</p>'}
      </div>`;
    }).join('');
  }

  /* ---------- People's Choice ---------- */
  function engagementFor(entryId) {
    return engagement.find(g => (g.entry_id || '').toUpperCase() === (entryId || '').toUpperCase());
  }

  function renderPeoplesChoice() {
    const tbody = document.querySelector('#pc-table tbody');
    const pcEntries = entries.filter(e => e.category === ORM.PEOPLES_CHOICE);
    if (!pcEntries.length) {
      tbody.innerHTML = '<tr><td colspan="9" class="text-center muted">No entries in the People\'s Choice Award category yet.</td></tr>';
      return;
    }
    const rows = pcEntries.map(e => {
      const g = engagementFor(e.entry_id);
      return {
        e, g,
        score: g ? ORM.computeEngagementScore(g.likes, g.comments, g.shares) : 0,
        flagged: g?.flag_status || 'No'
      };
    }).sort((a, b) => {
      // Disqualified sink to the bottom; others by engagement score desc
      const da = a.flagged === 'Disqualified' ? 1 : 0, db = b.flagged === 'Disqualified' ? 1 : 0;
      return da - db || b.score - a.score;
    });

    let rank = 0;
    tbody.innerHTML = rows.map(r => {
      const disq = r.flagged === 'Disqualified';
      if (!disq) rank++;
      return `<tr data-eid="${ORM.esc(r.e.entry_id)}">
        <td>${disq ? '<span class="badge badge-red">DQ</span>' : '<strong>#' + rank + '</strong>' + (rank === 1 && r.score > 0 ? ' <i class="fa-solid fa-crown" style="color:var(--gold)"></i>' : '')}</td>
        <td><strong>${ORM.esc(r.e.entry_id)}</strong></td>
        <td>${ORM.esc(r.e.participant_name)}<br><span class="muted" style="font-size:0.75rem;">${r.e.facebook_link ? `<a href="${ORM.esc(r.e.facebook_link)}" target="_blank" rel="noopener">FB video</a>` : 'no FB link'}</span></td>
        <td><input type="number" min="0" class="pc-in" data-f="likes" value="${r.g?.likes ?? 0}" style="width:80px;" aria-label="Likes for ${ORM.esc(r.e.entry_id)}"></td>
        <td><input type="number" min="0" class="pc-in" data-f="comments" value="${r.g?.comments ?? 0}" style="width:80px;" aria-label="Comments"></td>
        <td><input type="number" min="0" class="pc-in" data-f="shares" value="${r.g?.shares ?? 0}" style="width:80px;" aria-label="Shares"></td>
        <td><span class="badge badge-gold pc-score">${r.score}</span></td>
        <td><select class="pc-in" data-f="flag_status" aria-label="Flagged status" style="width:auto;">
          ${['No', 'Under Review', 'Disqualified'].map(o => `<option ${o === r.flagged ? 'selected' : ''}>${o}</option>`).join('')}
        </select></td>
        <td><button class="btn btn-sm btn-gold pc-save"><i class="fa-solid fa-floppy-disk"></i> Save</button></td>
      </tr>`;
    }).join('');

    // live score preview per row
    tbody.querySelectorAll('tr').forEach(tr => {
      const upd = () => {
        const v = f => Number(tr.querySelector(`[data-f="${f}"]`)?.value) || 0;
        tr.querySelector('.pc-score').textContent = ORM.computeEngagementScore(v('likes'), v('comments'), v('shares'));
      };
      tr.querySelectorAll('input.pc-in').forEach(i => i.addEventListener('input', upd));
      tr.querySelector('.pc-save')?.addEventListener('click', () => savePc(tr));
    });
  }

  async function savePc(tr) {
    const eid = tr.dataset.eid;
    const v = f => tr.querySelector(`[data-f="${f}"]`).value;
    const likes = Number(v('likes')) || 0, comments = Number(v('comments')) || 0, shares = Number(v('shares')) || 0;
    const payload = {
      entry_id: eid, likes, comments, shares,
      engagement_score: ORM.computeEngagementScore(likes, comments, shares),
      flag_status: v('flag_status'),
      updated_by: 'admin',
      logged_at: new Date().toISOString()
    };
    try {
      const existing = engagementFor(eid);
      if (existing) {
        await ORM.apiUpdate('engagement', existing.id, payload);
        Object.assign(existing, payload);
      } else {
        const created = await ORM.apiCreate('engagement', payload);
        engagement.push(created);
      }
      flash(`Engagement saved for ${eid} — score ${payload.engagement_score}.`);
      renderPeoplesChoice();
    } catch (err) {
      flash('Failed to save engagement: ' + err.message, true);
    }
  }

  /* ---------- Settings ---------- */
  async function renderSettings() {
    const s = await ORM.getSettings(true);
    const pub = s.results_published?.value === 'true';
    const el = document.getElementById('publish-state');
    el.textContent = pub
      ? 'Results are PUBLISHED — winners are visible on the public Results page.'
      : 'Results are NOT published — the public Results page shows a "coming soon" notice.';
    el.className = 'alert ' + (pub ? 'alert-success' : 'alert-info');
    document.getElementById('toggle-publish').innerHTML = pub
      ? '<i class="fa-solid fa-eye-slash"></i> Unpublish Results'
      : '<i class="fa-solid fa-bullhorn"></i> Publish Results Now';
    document.getElementById('deadline-input').value = s.registration_deadline?.value || 'To Be Announced';
  }

  document.getElementById('toggle-publish').addEventListener('click', async () => {
    const s = await ORM.getSettings(true);
    const pub = s.results_published?.value === 'true';
    if (!pub && !confirm('Publish results to the public Results page now?')) return;
    await ORM.setSetting('results_published', pub ? 'false' : 'true');
    flash(pub ? 'Results unpublished.' : 'Results are now live on the public Results page!');
    renderSettings();
  });

  document.getElementById('save-deadline').addEventListener('click', async () => {
    const val = document.getElementById('deadline-input').value.trim() || 'To Be Announced';
    await ORM.setSetting('registration_deadline', val);
    flash('Registration deadline updated to: ' + val);
  });
})();
