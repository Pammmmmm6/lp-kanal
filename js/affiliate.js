/* =========================================================
   Page Affiliate : calculateur de commissions + prise de rendez-vous
   ========================================================= */
(() => {
  const PRICE = 149;  // plan Scale, €/mois
  const RATE = 0.15;  // commission récurrente

  const eur = (n) => n.toLocaleString('en-US', {
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
    maximumFractionDigits: 2,
  }) + '€';

  const range = document.getElementById('refs');
  if (range) {
    const out = document.getElementById('refsOut');
    const refs = document.getElementById('calcRefs');
    const monthly = document.getElementById('calcMonthly');
    const yearly = document.getElementById('calcYearly');
    const min = +range.min, max = +range.max;

    const tick = (el) => { el.classList.remove('is-ticking'); void el.offsetWidth; el.classList.add('is-ticking'); };

    const update = (animate) => {
      const n = +range.value;
      const m = Math.round(n * PRICE * RATE * 100) / 100;
      range.style.setProperty('--p', ((n - min) / (max - min)) * 100 + '%');
      out.textContent = n;
      refs.textContent = n;
      monthly.textContent = eur(m);
      yearly.textContent = eur(Math.round(m * 12 * 100) / 100);
      if (animate) tick(monthly);
    };

    let raf = 0;
    range.addEventListener('input', () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => update(true));
    });
    update(false);
  }

  // Sélection d'un jour et d'un créneau dans la carte de rendez-vous
  document.querySelectorAll('.book__days, .book__slots').forEach((group) => {
    group.addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      group.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
    });
  });
})();
