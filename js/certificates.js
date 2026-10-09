/* =====================================================================
   Certificate PDF generator — Odia Roots Manabasa Gurubar 2026
   Uses jsPDF (loaded via CDN). Three certificate types:
     1. "Keeper of Odia Tradition"       — participation (video submitted)
     2. "Young Keeper of Odia Culture"   — children's (entry lists children)
     3. "Award of Excellence"            — category winner (award name per category)
   Design: cream background, thick gold/maroon double border, serif
   "CERTIFICATE OF ACHIEVEMENT" title, gold medallion seal, footer.
   ===================================================================== */

const ORMCert = (() => {
  'use strict';

  const MAROON = [123, 30, 58];
  const MAROON_DARK = [92, 18, 41];
  const GOLD = [201, 162, 39];
  const GOLD_DARK = [155, 122, 25];
  const CREAM = [255, 248, 231];
  const INK = [58, 42, 46];

  function baseDoc() {
    const { jsPDF } = window.jspdf;
    // A4 landscape: 297 x 210 mm
    return new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  }

  /* Shared frame: cream bg + thick double border + corner motifs */
  function drawFrame(doc) {
    const W = 297, H = 210;
    doc.setFillColor(...CREAM);
    doc.rect(0, 0, W, H, 'F');

    // Outer thick gold band
    doc.setDrawColor(...GOLD);
    doc.setLineWidth(3.2);
    doc.rect(8, 8, W - 16, H - 16);

    // Inner maroon line
    doc.setDrawColor(...MAROON);
    doc.setLineWidth(1.1);
    doc.rect(13, 13, W - 26, H - 26);

    // Thin inner gold line
    doc.setDrawColor(...GOLD_DARK);
    doc.setLineWidth(0.4);
    doc.rect(15.5, 15.5, W - 31, H - 31);

    // Corner dots (jhoti-inspired)
    doc.setFillColor(...MAROON);
    [[13, 13], [W - 13, 13], [13, H - 13], [W - 13, H - 13]].forEach(([x, y]) => {
      doc.circle(x, y, 2.4, 'F');
      doc.setFillColor(...GOLD);
      doc.circle(x, y, 1.2, 'F');
      doc.setFillColor(...MAROON);
    });
  }

  /* Gold medallion seal with ribbon */
  function drawSeal(doc, cx, cy) {
    // Ribbon tails
    doc.setFillColor(...MAROON);
    doc.triangle(cx - 6, cy + 6, cx - 2, cy + 22, cx - 10, cy + 20, 'F');
    doc.triangle(cx + 6, cy + 6, cx + 10, cy + 20, cx + 2, cy + 22, 'F');
    // Scalloped seal edge
    doc.setFillColor(...GOLD);
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      doc.circle(cx + Math.cos(a) * 9.5, cy + Math.sin(a) * 9.5, 2.6, 'F');
    }
    doc.circle(cx, cy, 10.5, 'F');
    doc.setFillColor(...CREAM);
    doc.circle(cx, cy, 8.2, 'F');
    doc.setFillColor(...GOLD);
    doc.circle(cx, cy, 7.2, 'F');
    // Inner monogram
    doc.setTextColor(...MAROON_DARK);
    doc.setFont('times', 'bold');
    doc.setFontSize(9);
    doc.text('ODIA', cx, cy - 1, { align: 'center' });
    doc.text('ROOTS', cx, cy + 3.2, { align: 'center' });
  }

  function footer(doc) {
    const W = 297, H = 210;
    doc.setDrawColor(...GOLD);
    doc.setLineWidth(0.4);
    doc.line(60, H - 30, W - 60, H - 30);
    doc.setFont('times', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...MAROON);
    doc.text('Odia Roots · Organizing Committee', W / 2, H - 24, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...INK);
    doc.text('OdiaRoots.org · Manabasa Gurubar 2026', W / 2, H - 19, { align: 'center' });
  }

  function heading(doc, certTitle) {
    const W = 297;
    doc.setFont('times', 'bold');
    doc.setFontSize(26);
    doc.setTextColor(...MAROON_DARK);
    doc.text('CERTIFICATE OF ACHIEVEMENT', W / 2, 40, { align: 'center', charSpace: 1.5 });

    doc.setDrawColor(...GOLD);
    doc.setLineWidth(0.7);
    doc.line(85, 45, W - 85, 45);

    doc.setFont('times', 'italic');
    doc.setFontSize(13);
    doc.setTextColor(...GOLD_DARK);
    doc.text('Odia Roots — Manabasa Gurubar Heritage Competition 2026', W / 2, 53, { align: 'center' });

    doc.setFont('times', 'bolditalic');
    doc.setFontSize(21);
    doc.setTextColor(...MAROON);
    doc.text(certTitle, W / 2, 70, { align: 'center' });
  }

  function nameBlock(doc, presentedTo, name, y = 92) {
    const W = 297;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(...INK);
    doc.text(presentedTo, W / 2, y - 8, { align: 'center' });

    doc.setFont('times', 'bold');
    doc.setFontSize(30);
    doc.setTextColor(...MAROON_DARK);
    doc.text(name, W / 2, y + 4, { align: 'center' });

    const nw = Math.min(doc.getTextWidth(name) + 20, 220);
    doc.setDrawColor(...GOLD);
    doc.setLineWidth(0.6);
    doc.line(W / 2 - nw / 2, y + 9, W / 2 + nw / 2, y + 9);
  }

  function bodyText(doc, lines, y) {
    const W = 297;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11.5);
    doc.setTextColor(...INK);
    lines.forEach((ln, i) => doc.text(ln, W / 2, y + i * 6.4, { align: 'center' }));
  }

  function metaLine(doc, entry, y) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9.5);
    doc.setTextColor(...GOLD_DARK);
    doc.text(`Entry ${entry.entry_id} · ${entry.city}, ${entry.state}`, 297 / 2, y, { align: 'center' });
  }

  /* ---------- 1. Participation: "Keeper of Odia Tradition" ---------- */
  function participation(entry) {
    const doc = baseDoc();
    drawFrame(doc);
    heading(doc, '“Keeper of Odia Tradition”');
    nameBlock(doc, 'This certificate is proudly presented to', entry.participant_name);
    bodyText(doc, [
      `for participating in the Manabasa Gurubar Heritage Competition 2026 with the entry`,
      `“${entry.submission_title}” in the category “${entry.category}”,`,
      'and for keeping the sacred traditions of Maa Lakshmi alive in an Odia home in America.'
    ], 112);
    metaLine(doc, entry, 134);
    drawSeal(doc, 262, 158);
    footer(doc);
    doc.save(`${entry.entry_id}-Keeper-of-Odia-Tradition.pdf`);
  }

  /* ---------- 2. Children's: "Young Keeper of Odia Culture" ---------- */
  function children(entry) {
    const doc = baseDoc();
    drawFrame(doc);
    heading(doc, '“Young Keeper of Odia Culture”');
    const kids = String(entry.children_info || '').trim();
    nameBlock(doc, 'Awarded to the young participants of the family of', entry.participant_name);
    const lines = [
      'in joyful recognition of the children who took part in the family\'s',
      `Manabasa Gurubar celebration — entry “${entry.submission_title}” —`,
      'carrying the light of Odia culture into the next generation.'
    ];
    bodyText(doc, lines, 112);
    if (kids) {
      doc.setFont('times', 'bolditalic');
      doc.setFontSize(12.5);
      doc.setTextColor(...MAROON);
      const wrapped = doc.splitTextToSize('Participating children: ' + kids, 200);
      wrapped.slice(0, 2).forEach((ln, i) => doc.text(ln, 297 / 2, 134 + i * 6, { align: 'center' }));
      metaLine(doc, entry, 134 + Math.min(wrapped.length, 2) * 6 + 3);
    } else {
      metaLine(doc, entry, 134);
    }
    drawSeal(doc, 262, 158);
    footer(doc);
    doc.save(`${entry.entry_id}-Young-Keeper-of-Odia-Culture.pdf`);
  }

  /* ---------- 3. Winner: "Award of Excellence" ---------- */
  function winner(entry, awardName, scoreLabel) {
    const doc = baseDoc();
    drawFrame(doc);
    heading(doc, '“Award of Excellence”');
    nameBlock(doc, 'This highest honor is presented to', entry.participant_name, 90);

    // Award name banner
    const W = 297;
    doc.setFillColor(...MAROON);
    doc.roundedRect(W / 2 - 85, 102, 170, 13, 2.5, 2.5, 'F');
    doc.setFont('times', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(...GOLD);
    doc.text(awardName, W / 2, 110.5, { align: 'center' });

    bodyText(doc, [
      `Winner of the category “${entry.category}”`,
      `with the entry “${entry.submission_title}”${scoreLabel ? ' · ' + scoreLabel : ''}`,
      'in the Manabasa Gurubar Heritage Competition 2026.'
    ], 124);
    metaLine(doc, entry, 146);
    drawSeal(doc, 262, 158);
    footer(doc);
    doc.save(`${entry.entry_id}-Award-of-Excellence.pdf`);
  }

  return { participation, children, winner };
})();
