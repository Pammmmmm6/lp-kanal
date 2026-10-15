/* =========================================================
   Page Affiliate : simulateur de commissions
   ========================================================= */
(() => {
  const PRICE = 149;  // plan Scale, €/mois
  const RATE = 0.15;  // commission récurrente

  const range = document.getElementById('refs');
  if (!range) return;

  const $ = (id) => document.getElementById(id);
  const out = $('refsOut'), fill = $('refsFill'), refs = $('calcRefs');
  const monthly = $('calcMonthly'), yearly = $('calcYearly');
  const bars = [...$('calcChart').children];
  const min = +range.min, max = +range.max;

  const eur = (n) => n.toLocaleString('en-US', {
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
    maximumFractionDigits: 2,
  }) + '€';
  const round2 = (n) => Math.round(n * 100) / 100;

  const tick = (el) => { el.classList.remove('is-ticking'); void el.offsetWidth; el.classList.add('is-ticking'); };

  let last = null;
  const render = () => {
    const n = Math.min(max, Math.max(min, Math.round(+range.value)));
    if (n === last) return;
    const animate = last !== null;
    last = n;
    const p = (n - min) / (max - min);
    const m = round2(n * PRICE * RATE);

    fill.style.width = `calc(12px + (100% - 24px) * ${p})`;
    out.textContent = n;
    refs.textContent = n;
    monthly.textContent = eur(m);
    yearly.textContent = eur(round2(m * 12));
    range.setAttribute('aria-valuetext', `${n} customers, ${eur(m)} per month`);

    // cumul sur 12 mois : la dernière barre va de 30 % (1 client) à 100 % (200 clients)
    const top = 30 + 70 * p;
    bars.forEach((b, i) => { b.style.height = (top * (i + 1)) / 12 + '%'; });

    if (animate) tick(monthly);
  };

  const set = (n) => { range.value = n; render(); };

  range.addEventListener('input', render);
  range.addEventListener('change', render);
  document.querySelectorAll('.calc__step').forEach((btn) => {
    btn.addEventListener('click', () => set(+range.value + +btn.dataset.step));
  });
  document.querySelectorAll('.calc__scale button').forEach((btn) => {
    btn.addEventListener('click', () => set(+btn.dataset.set));
  });

  render();
})();
