/* =========================================================
   Page Book a demo : formulaire puis ouverture du calendrier Cal.com
   ========================================================= */
(() => {
  const form = document.getElementById('demoForm');
  if (!form) return;
  const CAL = 'https://app.cal.com/team/kanal/demo';
  const chips = [...form.querySelectorAll('.dform__chips button')];
  const cal = document.getElementById('demoCal');
  let revenue = '';

  // tranche de chiffre d'affaires : boutons radio en pastilles (un clic de plus la désélectionne)
  chips.forEach((chip) => chip.addEventListener('click', () => {
    const on = chip.getAttribute('aria-checked') !== 'true';
    chips.forEach((c) => c.setAttribute('aria-checked', String(on && c === chip)));
    revenue = on ? chip.dataset.v : '';
  }));

  const validEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
  const validStore = (v) => /^(https?:\/\/)?[^\s.]+\.[^\s]{2,}$/.test(v);
  const check = (input, ok) => { input.closest('.dform__field').classList.toggle('is-invalid', !ok); return ok; };

  form.addEventListener('input', (e) => {
    const f = e.target.closest('.dform__field');
    if (f && f.classList.contains('is-invalid')) f.classList.remove('is-invalid');
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = form.email.value.trim(), store = form.store.value.trim();
    const okEmail = check(form.email, validEmail(email));
    const okStore = check(form.store, validStore(store));
    if (!okEmail) { form.email.focus(); return; }
    if (!okStore) { form.store.focus(); return; }

    const notes = `Store: ${store}` + (revenue ? `\nMonthly revenue: ${revenue}` : '');
    const url = `${CAL}?email=${encodeURIComponent(email)}&notes=${encodeURIComponent(notes)}`
      + '&utm_source=getkanal&utm_medium=website&utm_campaign=site-demo';
    cal.href = url;
    form.classList.add('is-done');
    window.open(url, '_blank', 'noopener');
  });

  document.getElementById('demoBack').addEventListener('click', () => {
    form.classList.remove('is-done');
    form.email.focus();
  });
})();
