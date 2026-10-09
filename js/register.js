/* Registration & Submission form logic — Odia Roots Manabasa 2026 */
(() => {
  'use strict';

  const form = document.getElementById('entry-form');
  const alertBox = document.getElementById('form-alert');
  const submitBtn = document.getElementById('submit-btn');
  const fbBlock = document.getElementById('fb-block');
  const driveBlock = document.getElementById('drive-block');

  /* Populate dropdowns */
  const stateSel = document.getElementById('state');
  ORM.US_STATES.forEach(s => stateSel.add(new Option(s, s)));

  const catSel = document.getElementById('category');
  ORM.CATEGORIES.forEach(c => catSel.add(new Option(c, c)));

  catSel.addEventListener('change', () => {
    document.getElementById('pc-hint').style.display =
      catSel.value === ORM.PEOPLES_CHOICE ? 'block' : 'none';
  });

  /* Conditional submission-method blocks */
  document.querySelectorAll('input[name="submission_method"]').forEach(r => {
    r.addEventListener('change', () => {
      const v = r.value;
      fbBlock.classList.toggle('show', v === 'Facebook Link');
      driveBlock.classList.toggle('show', v === 'Google Drive Link');
      clearError('submission_method');
    });
  });

  /* Validation helpers */
  function setError(name, show) {
    const err = document.getElementById('err-' + name);
    const field = document.getElementById(name);
    if (err) err.classList.toggle('show', show);
    if (field) field.classList.toggle('invalid', show);
  }
  function clearError(name) { setError(name, false); }

  ['participant_name','city','state','email','phone','submission_title','description','facebook_link','drive_link','category']
    .forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('input', () => clearError(id));
    });

  function validate() {
    let firstBad = null;
    const bad = (name, el) => { setError(name, true); if (!firstBad) firstBad = el; };

    const val = id => document.getElementById(id).value.trim();

    if (!val('participant_name')) bad('participant_name', form.participant_name);
    if (!val('city')) bad('city', form.city);
    if (!val('state')) bad('state', form.state);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val('email'))) bad('email', form.email);
    if (!/^[\d\s()+.\-]{7,}$/.test(val('phone'))) bad('phone', form.phone);
    if (!val('category')) bad('category', form.category);
    if (!val('submission_title')) bad('submission_title', form.submission_title);

    const method = form.querySelector('input[name="submission_method"]:checked')?.value;
    if (!method) bad('submission_method', form.querySelector('input[name="submission_method"]'));

    if (method === 'Facebook Link') {
      const link = val('facebook_link');
      if (!/^https?:\/\/.+/.test(link)) bad('facebook_link', document.getElementById('facebook_link'));
    }
    if (method === 'Google Drive Link') {
      const link = val('drive_link');
      if (!/^https?:\/\/(drive|docs)\.google\.com\/.+/i.test(link)) bad('drive_link', document.getElementById('drive_link'));
    }

    if (!val('description')) bad('description', form.description);
    if (!form.querySelector('input[name="consent_publish"]:checked')) {
      setError('consent_publish', true);
      if (!firstBad) firstBad = form.querySelector('input[name="consent_publish"]');
    }

    return firstBad;
  }

  form.querySelectorAll('input[name="consent_publish"]').forEach(r =>
    r.addEventListener('change', () => clearError('consent_publish')));

  function showAlert(msg) {
    alertBox.textContent = msg;
    alertBox.classList.remove('hidden');
    alertBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  /* Submit */
  form.addEventListener('submit', async e => {
    e.preventDefault();
    alertBox.classList.add('hidden');

    const firstBad = validate();
    if (firstBad) {
      showAlert('Please fix the highlighted fields below, then submit again.');
      firstBad.focus({ preventScroll: false });
      firstBad.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Submitting…';

    try {
      const method = form.querySelector('input[name="submission_method"]:checked').value;
      const videoLink = (method === 'Facebook Link' ? document.getElementById('facebook_link').value : document.getElementById('drive_link').value).trim();

      // The database checks every field again and creates the Entry ID itself,
      // so two families can never receive the same number.
      const created = await ORM.rpc('orm_register_entry', {
        p: {
          participant_name: form.participant_name.value.trim(),
          city: form.city.value.trim(),
          state: form.state.value,
          email: form.email.value.trim(),
          phone: form.phone.value.trim(),
          children_info: form.children_info.value.trim(),
          category: form.category.value,
          submission_title: form.submission_title.value.trim(),
          submission_method: method,
          video_link: videoLink,
          facebook_profile: form.facebook_profile.value.trim(),
          description: form.description.value.trim(),
          consent_publish: form.querySelector('input[name="consent_publish"]:checked').value
        }
      });

      // Email confirmation — prepared but inactive until a provider is configured.
      ORM.sendConfirmationEmail(created);

      // Show confirmation
      document.getElementById('confirm-entry-id').textContent = created.entry_id;
      document.getElementById('confirm-summary').innerHTML = `
        <div><strong>Name:</strong> ${ORM.esc(created.participant_name)}</div>
        <div><strong>Category:</strong> ${ORM.esc(created.category)}</div>
        <div><strong>Submission:</strong> ${ORM.esc(created.submission_title)}</div>
        <div><strong>Method:</strong> ${ORM.esc(created.submission_method)}</div>
        <div><strong>Status:</strong> ${ORM.esc(created.status)}</div>`;
      document.getElementById('form-shell').classList.add('hidden');
      document.getElementById('confirm-shell').classList.remove('hidden');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error(err);
      showAlert('Sorry, something went wrong while submitting your entry: ' + err.message + ' Please try again.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Submit My Entry';
    }
  });
})();
