/* Public Results page — Odia Roots Manabasa 2026
   Read-only. Shows winners per category ONLY when the admin has
   published results (settings.results_published === 'true'). */
(() => {
  'use strict';

  async function init() {
    const loading = document.getElementById('loading');
    try {
      // The database only returns results once the admin has published them,
      // and never includes emails, phone numbers or judge names.
      const data = await ORM.rpc('orm_public_results');
      loading.classList.add('hidden');

      if (!data.published) {
        document.getElementById('not-published').classList.remove('hidden');
        return;
      }

      document.getElementById('winners-grid').innerHTML =
        data.categories.map(c => winnerCard(c)).join('');
      document.getElementById('results-wrap').classList.remove('hidden');
    } catch (err) {
      loading.innerHTML = 'Could not load results: ' + ORM.esc(err.message);
    }
  }

  function winnerCard(c) {
    const isPC = c.mode === 'engagement';
    const fmt = v => isPC ? String(Number(v)) : Number(v).toFixed(2);
    const winner = c.ranked[0];
    const label = ORM.esc(c.category) + (isPC
      ? ' <span style="text-transform:none;letter-spacing:0;">· by community engagement</span>' : '');
    return `<article class="winner-card">
      <div class="cat-label">${label}</div>
      ${winner ? `
        <h3><i class="fa-solid fa-crown" style="color:var(--gold);" aria-hidden="true"></i> ${ORM.esc(winner.participant_name)}</h3>
        <div class="award-title">${ORM.esc(ORM.AWARD_NAMES[c.category])}</div>
        <div class="score-line">
          "${ORM.esc(winner.submission_title)}" · ${ORM.esc(winner.city)}, ${ORM.esc(winner.state)}<br>
          Entry ${ORM.esc(winner.entry_id)} · ${isPC ? 'Engagement Score' : 'Final Score'} <strong>${fmt(winner.score)}${isPC ? '' : ' / 100'}</strong>
        </div>
        ${c.ranked.length > 1 ? `<ol class="rank-list">${c.ranked.slice(1, 3).map(r => `
          <li><span class="rk">#${r.rank}</span>
          <span class="nm">${ORM.esc(r.participant_name)} — "${ORM.esc(r.submission_title)}"</span>
          <span class="sc">${fmt(r.score)}</span></li>`).join('')}</ol>` : ''}
      ` : `
        <h3 class="muted" style="font-size:1.05rem;">No winner declared</h3>
        <div class="score-line">${isPC ? 'No eligible engagement recorded in this category.' : 'No judged entries in this category.'}</div>
      `}
    </article>`;
  }

  init();
})();
