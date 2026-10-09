/* =====================================================================
   Certificate PDF generator — Odia Roots Manabasa Gurubar 2026
   Uses jsPDF (loaded via CDN). Every certificate uses the SAME designed
   background picture: assets/certificate-template.png (A4 landscape).
   The code only prints the text on top of it. Three certificate types:
     1. "Keeper of Odia Tradition"       — participation (video submitted)
     2. "Young Keeper of Odia Culture"   — children's (entry lists children)
     3. "Award of Excellence"            — category winner (award name per category)

   To change the design later: replace assets/certificate-template.png with a
   new A4-landscape picture (same shape: 2000 x 1414 px) that keeps the same
   blank areas. Nothing else needs to change.
   ===================================================================== */

const ORMCert = (() => {
  'use strict';

  const TEMPLATE_URL = 'assets/certificate-template.png';
  const W = 297, H = 210;             // A4 landscape in mm

  const MAROON = [123, 30, 58];
  const MAROON_DARK = [92, 18, 41];
  const GOLD = [201, 162, 39];
  const GOLD_DARK = [155, 122, 25];
  const CREAM = [255, 248, 231];
  const INK = [58, 42, 46];

  /* Load the background picture once, reuse it for every certificate */
  let _templatePromise = null;
  function loadTemplate() {
    if (!_templatePromise) {
      _templatePromise = new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => { _templatePromise = null; reject(new Error('Could not load the certificate design. Please check your internet connection and try again.')); };
        img.src = TEMPLATE_URL;
      });
    }
    return _templatePromise;
  }

  async function baseDoc() {
    if (!window.jspdf) throw new Error('The PDF tool did not load. Please refresh the page and try again.');
    const img = await loadTemplate();
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    doc.addImage(img, 'PNG', 0, 0, W, H, undefined, 'FAST');
    return doc;
  }

  /* Top: the picture already says "CERTIFICATE" — we add the certificate's own title under it */
  function heading(doc, certTitle) {
    doc.setFont('times', 'bolditalic');
    doc.setFontSize(23);
    doc.setTextColor(...MAROON);
    doc.text(certTitle, W / 2, 41, { align: 'center' });

    doc.setDrawColor(...GOLD);
    doc.setLineWidth(0.6);
    doc.line(W / 2 - 38, 45.5, W / 2 + 38, 45.5);

    doc.setFont('times', 'italic');
    doc.setFontSize(11.5);
    doc.setTextColor(...GOLD_DARK);
    doc.text('Odia Roots — Manabasa Gurubar Heritage Competition 2026', W / 2, 52, { align: 'center' });
  }

  /* The picture already prints "This certificate is presented to" and the line under the name */
  function nameOnLine(doc, name) {
    let size = 34;
    doc.setFont('times', 'bolditalic');
    doc.setTextColor(...MAROON_DARK);
    doc.setFontSize(size);
    while (doc.getTextWidth(name) > 165 && size > 14) { size -= 1; doc.setFontSize(size); }
    doc.text(name, W / 2, 112, { align: 'center' });
  }

  function bodyText(doc, lines, y, maxWidth = 165) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11.5);
    doc.setTextColor(...INK);
    let row = 0;
    lines.forEach(ln => {
      doc.splitTextToSize(ln, maxWidth).forEach(part => {
        doc.text(part, W / 2, y + row * 6.2, { align: 'center' });
        row++;
      });
    });
    return y + row * 6.2;
  }

  function metaLine(doc, entry, y) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9.5);
    doc.setTextColor(...GOLD_DARK);
    doc.text(`Entry ${entry.entry_id} · ${entry.city}, ${entry.state}`, W / 2, y, { align: 'center' });
  }

  /* Under the two signature lines + bottom centre */
  function footer(doc) {
    doc.setFont('times', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...MAROON);
    doc.text('Organizing Committee', 72, 179, { align: 'center' });
    doc.text('Odia Roots', 225, 179, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...INK);
    doc.text('Manabasa Gurubar Heritage Competition', 72, 184.5, { align: 'center' });
    doc.text('OdiaRoots.org · 2026', 225, 184.5, { align: 'center' });
  }

  /* ---------- 1. Participation: "Keeper of Odia Tradition" ---------- */
  async function participation(entry) {
    const doc = await baseDoc();
    heading(doc, '“Keeper of Odia Tradition”');
    nameOnLine(doc, entry.participant_name);
    const end = bodyText(doc, [
      'for participating in the Manabasa Gurubar Heritage Competition 2026 with the entry',
      `“${entry.submission_title}” in the category “${entry.category}”,`,
      'and for keeping the sacred traditions of Maa Lakshmi alive in an Odia home in America.'
    ], 128);
    metaLine(doc, entry, Math.min(end + 3, 166));
    footer(doc);
    doc.save(`${entry.entry_id}-Keeper-of-Odia-Tradition.pdf`);
  }

  /* ---------- 2. Children's: "Young Keeper of Odia Culture" ---------- */
  async function children(entry) {
    const doc = await baseDoc();
    heading(doc, '“Young Keeper of Odia Culture”');
    nameOnLine(doc, entry.participant_name);
    let y = bodyText(doc, [
      'and the young participants of the family, in joyful recognition of the children who took part in',
      `the family's Manabasa Gurubar celebration — entry “${entry.submission_title}” —`,
      'carrying the light of Odia culture into the next generation.'
    ], 127);
    const kids = String(entry.children_info || '').trim();
    if (kids) {
      doc.setFont('times', 'bolditalic');
      doc.setFontSize(12);
      doc.setTextColor(...MAROON);
      doc.splitTextToSize('Participating children: ' + kids, 165).slice(0, 2)
        .forEach((ln, i) => doc.text(ln, W / 2, y + 2 + i * 5.8, { align: 'center' }));
      y += 2 + Math.min(doc.splitTextToSize('Participating children: ' + kids, 165).length, 2) * 5.8;
    }
    metaLine(doc, entry, Math.min(y + 3, 167));
    footer(doc);
    doc.save(`${entry.entry_id}-Young-Keeper-of-Odia-Culture.pdf`);
  }

  /* ---------- 3. Winner: "Award of Excellence" ---------- */
  async function winner(entry, awardName, scoreLabel) {
    const doc = await baseDoc();
    heading(doc, '“Award of Excellence”');
    nameOnLine(doc, entry.participant_name);

    // Award name banner
    doc.setFillColor(...MAROON);
    doc.roundedRect(W / 2 - 62, 121, 124, 12, 2.5, 2.5, 'F');
    doc.setFont('times', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(...GOLD);
    let aSize = 14;
    while (doc.getTextWidth(awardName) > 114 && aSize > 9) { aSize -= 1; doc.setFontSize(aSize); }
    doc.text(awardName, W / 2, 129, { align: 'center' });

    const end = bodyText(doc, [
      `Winner of the category \u201c${entry.category}\u201d`,
      `with the entry \u201c${entry.submission_title}\u201d`,
      scoreLabel ? scoreLabel + ' \u2014 Manabasa Gurubar Heritage Competition 2026' : 'Manabasa Gurubar Heritage Competition 2026'
    ], 141);
    metaLine(doc, entry, Math.min(end + 2, 168));
    footer(doc);
    doc.save(`${entry.entry_id}-Award-of-Excellence.pdf`);
  }

  return { participation, children, winner };
})();
