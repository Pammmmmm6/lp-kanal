/* =========================================================
   Page Affiliate : simulateur de commissions
   Curseur maison piloté par pointer events (souris, tactile, stylet)
   et clavier, pour un comportement identique sur tous les navigateurs.
   ========================================================= */
(() => {
  const PRICE = 149;  // plan Scale, €/mois
  const RATE = 0.15;  // commission récurrente
  const MIN = 1, MAX = 200;

  const $ = (id) => document.getElementById(id);
  const slider = $('refsSlider'), thumb = $('refs');
  if (!slider || !thumb) return;

  const out = $('refsOut'), refs = $('calcRefs');
  const monthly = $('calcMonthly'), yearly = $('calcYearly');
  const bars = Array.prototype.slice.call($('calcChart').children);

  const eur = (n) => n.toLocaleString('en-US', {
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
    maximumFractionDigits: 2,
  }) + '€';
  const round2 = (n) => Math.round(n * 100) / 100;
  const tick = (el) => { el.classList.remove('is-ticking'); void el.offsetWidth; el.classList.add('is-ticking'); };

  let value = +thumb.getAttribute('aria-valuenow') || 40;
  let dragging = false;
  let shown = null;

  const set = (n) => {
    value = Math.min(MAX, Math.max(MIN, Math.round(n)));
    const p = (value - MIN) / (MAX - MIN);
    slider.style.setProperty('--p', p);
    if (value === shown) return;
    const animate = shown !== null;
    shown = value;

    const m = round2(value * PRICE * RATE);
    out.textContent = value;
    refs.textContent = value;
    monthly.textContent = eur(m);
    yearly.textContent = eur(round2(m * 12));
    thumb.setAttribute('aria-valuenow', value);
    thumb.setAttribute('aria-valuetext', value + ' customers, ' + eur(m) + ' per month');

    // cumul sur 12 mois : la dernière barre va de 30 % (1 client) à 100 % (200 clients)
    const top = 30 + 70 * p;
    bars.forEach((b, i) => { b.style.height = (top * (i + 1)) / 12 + '%'; });

    // animation seulement pour un changement ponctuel (clic, bouton, clavier) :
    // pendant un glissement, le montant se met à jour en direct, sans clignoter
    if (animate && !dragging) tick(monthly);
  };

  // position du pointeur → valeur (le centre du rond suit le pointeur)
  const fromX = (x) => {
    const r = slider.getBoundingClientRect();
    const half = thumb.offsetWidth / 2;
    const p = (x - r.left - half) / (r.width - half * 2);
    set(MIN + Math.min(1, Math.max(0, p)) * (MAX - MIN));
  };

  slider.addEventListener('pointerdown', (e) => {
    if (e.button !== undefined && e.button > 0) return;
    dragging = true;
    monthly.classList.remove('is-ticking');
    slider.classList.add('is-dragging');
    try { slider.setPointerCapture(e.pointerId); } catch (_) {}
    fromX(e.clientX);
    thumb.focus({ preventScroll: true });
    e.preventDefault();
  });
  slider.addEventListener('pointermove', (e) => { if (dragging) fromX(e.clientX); });
  const stop = () => { dragging = false; slider.classList.remove('is-dragging'); };
  slider.addEventListener('pointerup', stop);
  slider.addEventListener('pointercancel', stop);
  slider.addEventListener('lostpointercapture', stop);

  thumb.addEventListener('keydown', (e) => {
    const steps = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1, PageUp: 10, PageDown: -10 };
    if (e.key in steps) set(value + steps[e.key]);
    else if (e.key === 'Home') set(MIN);
    else if (e.key === 'End') set(MAX);
    else return;
    e.preventDefault();
  });

  document.querySelectorAll('.calc__step').forEach((btn) => {
    btn.addEventListener('click', () => set(value + +btn.dataset.step));
  });
  document.querySelectorAll('.calc__scale button').forEach((btn) => {
    btn.addEventListener('click', () => set(+btn.dataset.set));
  });

  set(value);
})();
