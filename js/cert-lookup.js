/* Certificates page — find an entry by Entry ID + registered email,
   then offer the certificates that entry has earned:
   1. Participation ("Keeper of Odia Tradition") — video submitted
   2. Children's ("Young Keeper of Odia Culture") — entry lists children
   3. Winner ("Award of Excellence") — category winner, only after results are published */
(() => {
  'use strict';

  const form = document.getElementById('lookup-form');
  const alertEl = document.getElementById('lookup-alert');
  const list = document.getElementById('cert-list');
  const cardsEl = document.getElementById('cert-cards');

  function fail(msg) {
    alertEl.textContent = msg;
    alertEl.classList.remove('hidden');
    list.classList.add('hidden');
  }

  form.addEventListener('submit', async e => {
    e.preventDefault();
    alertEl.classList.add('hidden');
    const eid = document.getElementById('lk-entry').value.trim().toUpperCase();
    const email = document.getElementById('lk-email').value.trim().toLowerCase();
    if (!/^ORM2026-\d{4,}$/.test(eid)) {
      return fail('Please enter a valid Entry ID in the format ORM2026-0001.');
    }

    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Searching…';
    try {
      const result = await ORM.rpc('orm_lookup_certificate', { p_entry_id: eid, p_email: email });
      if (!result.found) {
        return fail('No entry found with that Entry ID and email combination. Both must match your registration exactly.');
      }
      const entry = result.entry;
      const winnerInfo = result.is_winner ? {
        awardName: ORM.AWARD_NAMES[entry.category],
        scoreLabel: entry.category === ORM.PEOPLES_CHOICE
          ? 'Engagement Score ' + result.winner_score
          : 'Final Score ' + Number(result.winner_score).toFixed(2) + ' / 100'
      } : null;

      renderCards(entry, winnerInfo, !!result.published);
    } catch (err) {
      fail('Could not look up your entry: ' + err.message);
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-magnifying-glass"></i> Find My Certificates';
    }
  });

  function certCard({ icon, title, desc, available, note, onDownload }) {
    const div = document.createElement('div');
    div.className = 'card';
    div.innerHTML = `
      <div style="display:flex;align-items:center;gap:1rem;flex-wrap:wrap;">
        <div class="icon-circle" style="margin:0;flex-shrink:0;"><i class="fa-solid ${icon}" aria-hidden="true"></i></div>
        <div style="flex:1;min-width:200px;">
          <h3 style="margin-bottom:0.15rem;">${title}</h3>
          <p style="font-size:0.85rem;margin:0;">${desc}</p>
          ${note ? `<p class="muted" style="font-size:0.78rem;margin:0.25rem 0 0;">${note}</p>` : ''}
        </div>
        <button class="btn ${available ? 'btn-gold' : 'btn-maroon'}" ${available ? '' : 'disabled style="opacity:0.45;cursor:not-allowed;"'}>
          <i class="fa-solid fa-file-pdf" aria-hidden="true"></i> ${available ? 'Download PDF' : 'Not available'}
        </button>
      </div>`;
    if (available) div.querySelector('button').addEventListener('click', onDownload);
    return div;
  }

  function renderCards(entry, winnerInfo, published) {
    document.getElementById('cert-owner').textContent =
      `${entry.entry_id} — ${entry.participant_name}`;
    cardsEl.innerHTML = '';

    const hasVideo = !!entry.video_submitted;
    const hasKids = !!String(entry.children_info || '').trim();

    cardsEl.appendChild(certCard({
      icon: 'fa-scroll',
      title: '“Keeper of Odia Tradition”',
      desc: 'Participation certificate for every entry with a submitted video.',
      available: hasVideo,
      note: hasVideo ? '' : 'Available once your video is submitted. Contact the committee if you have submitted but still see this.',
      onDownload: () => ORMCert.participation(entry)
    }));

    cardsEl.appendChild(certCard({
      icon: 'fa-child-reaching',
      title: '“Young Keeper of Odia Culture”',
      desc: 'Children\u2019s certificate — auto-generated because your entry lists participating children.',
      available: hasVideo && hasKids,
      note: hasKids ? (hasVideo ? '' : 'Available once your video is submitted.')
                    : 'Your entry did not list participating children, so this certificate does not apply.',
      onDownload: () => ORMCert.children(entry)
    }));

    cardsEl.appendChild(certCard({
      icon: 'fa-trophy',
      title: '“Award of Excellence”',
      desc: winnerInfo
        ? `Congratulations! Winner of “${entry.category}” — ${winnerInfo.awardName}.`
        : 'Category winner certificate featuring your category\u2019s named award.',
      available: !!winnerInfo,
      note: winnerInfo ? '' : (published
        ? 'Your entry was not declared the winner of its category.'
        : 'Available to category winners after results are published.'),
      onDownload: () => ORMCert.winner(entry, winnerInfo.awardName, winnerInfo.scoreLabel)
    }));

    list.classList.remove('hidden');
    list.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
})();
