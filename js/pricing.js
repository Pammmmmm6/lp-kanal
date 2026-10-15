/* Page Pricing : cartes de plans et bascule mensuel / annuel */
(() => {
  'use strict';

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fmt = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });
  const fmt2 = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const eur = (n) => { const v = Math.round(n * 100) / 100; return (Number.isInteger(v) ? fmt : fmt2).format(v) + '€'; };
  const SHOPIFY = 'https://apps.shopify.com/kanal-marketing-ai';
  const DEMO = 'https://getkanal.com/demo';

  const PLANS = [
    { name: 'Pro', tag: 'For brands starting on WhatsApp.', price: 89, cta: 'Choose Pro', href: SHOPIFY, note: 'Install from the Shopify App Store.',
      inc: 'What you get', items: ['1 user', 'Widget chat & inbox', 'Abandoned cart recovery', 'WhatsApp campaigns', 'Performance dashboard'] },
    { name: 'Scale', tag: 'For growing brands that automate more.', price: 149, cta: 'Choose Scale', href: SHOPIFY, featured: true, badge: 'Most popular', note: 'Install from the Shopify App Store.',
      inc: 'Everything in Pro', items: ['5 users', 'Custom segments', 'Unlimited & advanced automations', 'AI agent', 'Kanal MCP', { text: 'Integrations', logos: ['klaviyo', 'gorgias', 'recharge', 'crisp', 'loyoly'] }, 'Multi-market, +50€/mo per market'] },
    { name: 'Business', tag: 'Done for you: our experts run your flows.', price: 350, cta: 'Choose Business', href: SHOPIFY, note: 'Onboarding with our experts.',
      inc: 'Everything in Scale', items: ['Unlimited users', 'Flow setup by our experts', 'Continuous optimization', 'Campaigns on demand', 'Dedicated account manager'] },
    { name: 'Agency', tag: 'For agencies and multi-brand groups.', price: 1900, from: true, cta: 'Contact us', href: DEMO, note: 'Tailored to your brands.',
      inc: 'Everything in Business', items: ['WhatsApp strategy by our team', 'Marketing creative production', 'Campaign copywriting', 'Consolidated reporting per client'] },
  ];

  const tick = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 8.5 6.5 11.5 12.5 4.5" /></svg>';
  const cards = $('#pcards');
  cards.innerHTML = PLANS.map((p, i) => `
    <article class="pcard reveal reveal--up${p.featured ? ' pcard--featured' : ''}" style="--d:${i}">
      <div class="pcard__top"><h2 class="pcard__name">${p.name}</h2>${p.badge ? `<span class="pcard__badge">${p.badge}</span>` : ''}</div>
      <p class="pcard__tag">${p.tag}</p>
      <div class="pcard__price">${p.from ? '<small>From</small>' : ''}<span class="pcard__amount" data-price="${p.price}">${eur(p.price)}</span><span class="pcard__per">/mo</span></div>
      <p class="pcard__bill">No commitment</p>
      <h3 class="pcard__inc">${p.inc}</h3>
      <ul class="pcard__list">${p.items.map((it) => typeof it === 'string' ? `<li>${tick}${it}</li>` : `<li class="pcard__logos-row">${tick}${it.text}<span class="pcard__logos">${it.logos.map((l) => `<img src="assets/integrations/${l}.webp" alt="${l[0].toUpperCase() + l.slice(1)}" title="${l[0].toUpperCase() + l.slice(1)}" />`).join('')}</span></li>`).join('')}</ul>
      <a class="btn btn--lg ${p.featured ? 'btn--dark' : 'btn--soft'} pcard__cta" href="${p.href}" target="_blank" rel="noopener">${p.cta}</a>
      <p class="pcard__note">${p.note}</p>
    </article>`).join('');
  // Les cartes sont injectées après l'observateur de main.js : on les révèle nous-mêmes
  const io = new IntersectionObserver((en) => en.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-visible'); io.unobserve(e.target); } }), { threshold: 0.08 });
  $$('.pcard', cards).forEach((c) => io.observe(c));

  // Bascule de facturation avec glissière
  const billing = $('#billing');
  const glider = $('.billing__glider', billing);
  const moveGlider = () => {
    const on = $('[aria-pressed="true"]', billing);
    glider.style.width = on.offsetWidth + 'px';
    glider.style.transform = `translateX(${on.offsetLeft - 4}px)`;
  };
  const setPrices = (factor, animate) => {
    const yearly = factor < 1;
    $$('[data-price]').forEach((el) => {
      el.textContent = eur(+el.dataset.price * factor);
      if (animate && !reduced) { el.classList.remove('is-ticking'); void el.offsetWidth; el.classList.add('is-ticking'); }
    });
    $$('.pcard__bill').forEach((el) => { el.textContent = yearly ? 'Billed yearly · 12-month commitment' : 'No commitment'; });
  };
  billing.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b || b.getAttribute('aria-pressed') === 'true') return;
    $$('button', billing).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    moveGlider();
    setPrices(+b.dataset.factor, true);
  });
  setPrices(1, false);
  moveGlider();
  window.addEventListener('resize', moveGlider);
  document.fonts?.ready.then(moveGlider);
})();
