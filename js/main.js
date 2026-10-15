(() => {
  'use strict';

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  /* ---------------- Nav ---------------- */
  const nav = $('#nav');
  const onScroll = () => nav.classList.toggle('is-scrolled', window.scrollY > 8);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const closeMenus = (except) => $$('.has-menu.is-open, .split.is-open').forEach((m) => {
    if (m !== except) { m.classList.remove('is-open'); m.querySelector('[aria-expanded]')?.setAttribute('aria-expanded', 'false'); }
  });
  $$('.has-menu, .split').forEach((item) => {
    const trigger = item.querySelector('.nav__link, .split__more');
    if (!trigger) return;
    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      // Sur ordinateur, le survol ouvre déjà le menu : le clic ne doit pas le refermer
      const hoverOpen = item.classList.contains('has-menu') && matchMedia('(hover: hover)').matches;
      const open = hoverOpen ? true : !item.classList.contains('is-open');
      closeMenus(item);
      item.classList.toggle('is-open', open);
      trigger.setAttribute('aria-expanded', String(open));
    });
    if (item.classList.contains('has-menu')) {
      let t;
      item.addEventListener('mouseenter', () => { if (matchMedia('(hover: hover)').matches) { clearTimeout(t); closeMenus(item); item.classList.add('is-open'); trigger.setAttribute('aria-expanded', 'true'); } });
      item.addEventListener('mouseleave', () => { if (matchMedia('(hover: hover)').matches) { t = setTimeout(() => { item.classList.remove('is-open'); trigger.setAttribute('aria-expanded', 'false'); }, 120); } });
    }
  });
  // Surlignage qui glisse d'un lien à l'autre dans les menus déroulants
  $$('.menu').forEach((menu) => {
    const hl = document.createElement('span');
    hl.className = 'menu__hl';
    menu.prepend(hl);
    let shown = false;
    const moveTo = (a) => {
      if (!shown) { hl.classList.add('is-instant'); void hl.offsetWidth; }
      hl.style.width = `${a.offsetWidth}px`;
      hl.style.height = `${a.offsetHeight}px`;
      hl.style.transform = `translate(${a.offsetLeft}px, ${a.offsetTop}px)`;
      if (!shown) { void hl.offsetWidth; hl.classList.remove('is-instant'); }
      hl.style.opacity = '1';
      shown = true;
    };
    const hide = () => { hl.style.opacity = '0'; shown = false; };
    menu.addEventListener('mouseover', (e) => { const a = e.target.closest('a'); if (a && menu.contains(a)) moveTo(a); });
    menu.addEventListener('mouseleave', hide);
    menu.addEventListener('focusin', (e) => { if (e.target.matches('a')) moveTo(e.target); });
    menu.addEventListener('focusout', (e) => { if (!menu.contains(e.relatedTarget)) hide(); });
  });
  document.addEventListener('click', () => closeMenus());
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenus(); });

  const burger = $('.burger');
  burger.addEventListener('click', () => {
    const open = nav.classList.toggle('menu-open');
    burger.setAttribute('aria-expanded', String(open));
  });
  $$('.mobile-menu a').forEach((a) => a.addEventListener('click', () => { nav.classList.remove('menu-open'); burger.setAttribute('aria-expanded', 'false'); }));

  /* ---------------- Reveal ---------------- */
  const revealIO = new IntersectionObserver((entries) => {
    entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('is-visible'); revealIO.unobserve(en.target); } });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  $$('.reveal').forEach((el) => revealIO.observe(el));

  /* ---------------- Counters + in-view ---------------- */
  const fmt = new Intl.NumberFormat('en-US');
  const countUp = (el, dur = 1600) => {
    const target = +el.dataset.count; const suffix = el.dataset.suffix || '';
    if (reduced) { el.textContent = fmt.format(target) + suffix; return Promise.resolve(); }
    return new Promise((res) => {
      const t0 = performance.now();
      const step = (now) => {
        const p = Math.min(1, (now - t0) / dur); const e = 1 - Math.pow(1 - p, 3);
        el.textContent = fmt.format(Math.round(target * e)) + suffix;
        p < 1 ? requestAnimationFrame(step) : res();
      };
      requestAnimationFrame(step);
    });
  };
  $$('.bars i').forEach((b, i) => b.style.setProperty('--i', i));
  const viewIO = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      const card = en.target;
      card.classList.add('in-view');
      viewIO.unobserve(card);
      $$('[data-count]', card).forEach((c) => countUp(c));
      if ($('.window__rows', card)) runTask(card);
    });
  }, { threshold: 0.35 });
  $$('[data-inview]').forEach((el) => viewIO.observe(el));

  /* ---------------- Mascots: eyes follow the cursor ---------------- */
  const mascots = $$('[data-mascot]');
  let mx = innerWidth / 2, my = innerHeight / 3, raf = 0;
  const updateEyes = () => {
    raf = 0;
    mascots.forEach((m) => {
      const r = m.getBoundingClientRect();
      if (r.bottom < -100 || r.top > innerHeight + 100) return;
      const svg = m.querySelector('svg');
      const scale = r.width / 200;
      $$('.m-pupil', m).forEach((p) => {
        const cx = +p.getAttribute('cx'), cy = +p.getAttribute('cy');
        const sr = svg.getBoundingClientRect();
        const px = sr.left + cx * (sr.width / 200), py = sr.top + cy * (sr.width / 200);
        const dx = mx - px, dy = my - py; const d = Math.hypot(dx, dy) || 1;
        const max = 7 * Math.min(1, d / (160 * Math.max(scale, .4)));
        p.style.transform = `translate(${(dx / d) * max}px, ${(dy / d) * max * 1.2}px)`;
      });
    });
  };
  const queueEyes = () => { if (!raf) raf = requestAnimationFrame(updateEyes); };
  window.addEventListener('pointermove', (e) => { mx = e.clientX; my = e.clientY; queueEyes(); }, { passive: true });
  window.addEventListener('scroll', queueEyes, { passive: true });
  queueEyes();
  mascots.forEach((m) => m.addEventListener('pointerenter', () => {
    m.classList.remove('is-happy'); void m.offsetWidth; m.classList.add('is-happy');
  }));

  // Peek mascot rises as the CTA scrolls into view
  const peek = $('#peek');
  const onPeek = () => {
    const r = peek.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, (innerHeight - r.top) / (r.height + innerHeight * 0.25)));
    peek.style.setProperty('--peek', p.toFixed(3));
  };
  window.addEventListener('scroll', onPeek, { passive: true });
  onPeek();

  /* ---------------- Carte « accès » : curseur qui coche les lignes ---------------- */
  async function runTask(card) {
    const win = $('.window', card), cursor = $('.cursor', card), rows = $$('.row', card);
    if (reduced) { rows.forEach((r) => $('.check', r).classList.add('is-on')); return; }
    for (;;) {
      for (const row of rows) {
        const w = win.getBoundingClientRect(), c = $('.check', row).getBoundingClientRect();
        cursor.style.transform = `translate(${c.left - w.left + 8}px, ${c.top - w.top + 4}px)`;
        await wait(800);
        $('.check', row).classList.add('is-on');
        row.classList.remove('is-active'); void row.offsetWidth; row.classList.add('is-active');
        await wait(350);
      }
      await wait(2200);
      rows.forEach((r) => $('.check', r).classList.remove('is-on'));
      cursor.style.transform = 'translate(20px, 20px)';
      await wait(900);
    }
  }

  /* ---------------- Hero : inbox multicanal + fiche client ---------------- */
  const CHANNELS = { whatsapp: 'WhatsApp', instagram: 'Instagram', messenger: 'Messenger', imessage: 'iMessage', rcs: 'RCS' };
  const CH_ORDER = Object.keys(CHANNELS);
  const logo = (ch) => `<svg viewBox="0 0 32 32"><use href="#logo-${ch}" /></svg>`;
  const esc = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const money = (n) => `$${n.toFixed(2)}`;
  const initials = (n) => n.split(' ').map((w) => w[0]).join('');

  const THREADS = [
    {
      name: 'Emma Laurent', ch: 'whatsapp', time: '10:12 AM', prev: 'Can I still switch my order to size L?',
      customer: { handle: '+33 6 12 48 90 31', email: 'emma.laurent@mail.com', since: 'Mar 2024', orders: 4, spent: 412,
        order: { id: '#1042', date: 'Oct 13', status: 'Unfulfilled', item: 'Linen Overshirt', variant: 'Sand · M · ×1', price: 89, shipping: 5, g: 'linear-gradient(135deg,#e8d6bd,#c9a67c)' } },
      script: [
        { time: 'Today, 10:12 AM' },
        { in: 'Hi! I ordered the linen overshirt yesterday in M. Can I still switch it to an L?' },
        { out: 'Hi Emma! Order #1042 hasn\'t shipped yet, so yes. I\'ve switched it to size L, same price.' },
        { sys: 'Order #1042 updated in Shopify', patch: { variant: 'Sand · L · ×1' } },
        { in: 'Perfect, thank you 🙏', typing: 1100 },
        { out: 'Anytime! It ships this afternoon and I\'ll send the tracking link right here.' },
      ],
    },
    {
      name: 'Lucas Martin', ch: 'instagram', time: '9:58 AM', prev: 'Is the linen shirt back in sand?',
      customer: { handle: '@lucas.mrtn', email: 'lucas.martin@mail.com', since: 'Jan 2025', orders: 2, spent: 158,
        order: { id: '#0987', date: 'Sep 2', status: 'Delivered', item: 'Merino Crew Sweater', variant: 'Navy · L · ×1', price: 79, shipping: 0, g: 'linear-gradient(135deg,#9db0cc,#3d4f73)' } },
      script: [
        { time: 'Today, 9:58 AM' },
        { in: 'Hey, is the linen shirt back in sand? Saw it in your last post 👀' },
        { out: 'It is! Back in S, M and L since this morning. Want me to put an L aside for you, like your last order?' },
        { in: 'Yes please!', typing: 900 },
        { sys: 'Checkout link sent · Linen Shirt, Sand, L' },
      ],
    },
    {
      name: 'Hugo Garnier', ch: 'messenger', time: '9:40 AM', prev: 'The sneakers are too small, can I return them?',
      customer: { handle: 'Hugo Garnier', email: 'hugo.garnier@mail.com', since: 'Aug 2026', orders: 1, spent: 120,
        order: { id: '#1037', date: 'Oct 8', status: 'Delivered', item: 'Canvas Low Sneakers', variant: 'Off-white · 43 · ×1', price: 115, shipping: 5, g: 'linear-gradient(135deg,#f1ede4,#cfc6b4)' } },
      script: [
        { time: 'Today, 9:40 AM' },
        { in: 'Hello, the sneakers are a bit small. Can I send them back?' },
        { out: 'Of course, Hugo. You\'re within the 30-day window, so the return is free. Here\'s your prepaid label.' },
        { sys: 'Return created for order #1037', patch: { status: 'Return requested' } },
        { in: 'Great, and can I get a 44 instead?', typing: 1200 },
        { out: 'Done: a size 44 is reserved and ships as soon as the carrier scans your return.' },
      ],
    },
    { name: 'Noah Petit', ch: 'whatsapp', time: '9:15 AM', prev: 'Do you ship to Belgium?',
      customer: { handle: '+32 470 12 34 56', email: 'noah.petit@mail.com', since: 'Oct 2026', orders: 1, spent: 64,
        order: { id: '#1045', date: 'Oct 14', status: 'Unfulfilled', item: 'Cotton Tote Bag', variant: 'Natural · ×2', price: 58, shipping: 6, g: 'linear-gradient(135deg,#efe6d2,#d2bf95)' } } },
    { name: 'Léa Moreau', ch: 'instagram', time: 'Yesterday', prev: 'Loved the packaging 😍',
      customer: { handle: '@lea.moreau', email: 'lea.moreau@mail.com', since: 'Jun 2023', orders: 9, spent: 1186,
        order: { id: '#1029', date: 'Oct 5', status: 'Delivered', item: 'Wool Wrap Coat', variant: 'Camel · S · ×1', price: 240, shipping: 0, g: 'linear-gradient(135deg,#e2c49c,#a9774a)' } } },
    { name: 'Chloé Bernard', ch: 'messenger', time: 'Yesterday', prev: 'Thanks, the tracking link works!',
      customer: { handle: 'Chloé Bernard', email: 'chloe.b@mail.com', since: 'Feb 2025', orders: 3, spent: 267,
        order: { id: '#1040', date: 'Oct 11', status: 'In transit', item: 'Silk Scarf', variant: 'Terracotta · ×1', price: 69, shipping: 5, g: 'linear-gradient(135deg,#f0b597,#c0603e)' } } },
    { name: 'Inès Roux', ch: 'whatsapp', time: 'Mon', prev: 'Order received, thank you!',
      customer: { handle: '+33 7 81 22 09 64', email: 'ines.roux@mail.com', since: 'Nov 2024', orders: 5, spent: 538,
        order: { id: '#1031', date: 'Oct 6', status: 'Delivered', item: 'Leather Card Holder', variant: 'Cognac · ×1', price: 45, shipping: 5, g: 'linear-gradient(135deg,#d9a57a,#8c5532)' } } },
    { name: 'Tom Mercier', ch: 'whatsapp', time: 'Yesterday', prev: 'Can I pay in three installments?',
      customer: { handle: '+33 6 45 17 82 03', email: 'tom.mercier@mail.com', since: 'Jul 2025', orders: 2, spent: 286,
        order: { id: '#1036', date: 'Oct 7', status: 'Delivered', item: 'Waxed Field Jacket', variant: 'Olive · M · ×1', price: 189, shipping: 0, g: 'linear-gradient(135deg,#b7b98f,#5f6a3c)' } } },
    { name: 'Jade Fontaine', ch: 'instagram', time: '8:47 AM', prev: 'Do you have this one in black? 🖤',
      customer: { handle: '@jade.fntn', email: 'jade.fontaine@mail.com', since: 'Apr 2025', orders: 3, spent: 214,
        order: { id: '#1039', date: 'Oct 10', status: 'In transit', item: 'Ribbed Knit Top', variant: 'Ecru · S · ×1', price: 49, shipping: 5, g: 'linear-gradient(135deg,#f3ece0,#d4c3a5)' } } },
    { name: 'Nathan Robin', ch: 'instagram', time: 'Mon', prev: 'When is the next drop?',
      customer: { handle: '@nathanrbn', email: 'nathan.robin@mail.com', since: 'Sep 2026', orders: 1, spent: 72,
        order: { id: '#1030', date: 'Oct 5', status: 'Delivered', item: 'Heavyweight Tee', variant: 'Black · L · ×2', price: 68, shipping: 4, g: 'linear-gradient(135deg,#5a5a5f,#1f1f22)' } } },
    { name: 'Sacha Leroy', ch: 'messenger', time: '8:30 AM', prev: 'Is there a store in Lille?',
      customer: { handle: 'Sacha Leroy', email: 'sacha.leroy@mail.com', since: 'May 2024', orders: 6, spent: 731,
        order: { id: '#1044', date: 'Oct 13', status: 'Unfulfilled', item: 'Linen Trousers', variant: 'Stone · 32 · ×1', price: 95, shipping: 5, g: 'linear-gradient(135deg,#e1d8c6,#b1a184)' } } },
    { name: 'Manon Faure', ch: 'messenger', time: 'Sun', prev: 'My promo code isn\'t working',
      customer: { handle: 'Manon Faure', email: 'manon.faure@mail.com', since: 'Dec 2024', orders: 2, spent: 133,
        order: { id: '#1026', date: 'Oct 2', status: 'Delivered', item: 'Canvas Weekender', variant: 'Navy · ×1', price: 129, shipping: 4, g: 'linear-gradient(135deg,#8d9ab8,#2e3a5c)' } } },
    {
      name: 'Maxime Dubois', ch: 'imessage', time: '10:20 AM', prev: 'Is my order ready for pickup?',
      customer: { handle: '+33 6 98 02 44 17', email: 'maxime.dubois@mail.com', since: 'Feb 2024', orders: 7, spent: 645,
        order: { id: '#1048', date: 'Oct 14', status: 'Unfulfilled', item: 'Suede Chelsea Boots', variant: 'Tobacco · 42 · ×1', price: 210, shipping: 0, g: 'linear-gradient(135deg,#c79a6c,#7a4f2c)' } },
      script: [
        { time: 'Today, 10:20 AM' },
        { in: 'Hey! Is my order ready for pickup at the Lyon store?' },
        { out: 'Hi Maxime! Order #1048 is packed and waiting at Lyon Confluence. The store is open until 7 PM.' },
        { sys: 'Order #1048 marked ready for pickup', patch: { status: 'Ready for pickup' } },
        { in: 'Great, I\'ll swing by after work 👍', typing: 1000 },
        { out: 'Perfect. Just show this message at the counter and you\'re all set.' },
      ],
    },
    { name: 'Zoé Lambert', ch: 'imessage', time: '9:05 AM', prev: 'Can you gift-wrap my order?',
      customer: { handle: '+33 7 52 39 61 08', email: 'zoe.lambert@mail.com', since: 'Nov 2025', orders: 1, spent: 85,
        order: { id: '#1046', date: 'Oct 14', status: 'Unfulfilled', item: 'Cashmere Beanie', variant: 'Oat · ×1', price: 80, shipping: 5, g: 'linear-gradient(135deg,#e7dcc8,#bfa98a)' } } },
    { name: 'Arthur Girard', ch: 'imessage', time: 'Yesterday', prev: 'Thanks for the quick reply!',
      customer: { handle: '+33 6 21 75 90 46', email: 'arthur.girard@mail.com', since: 'Jan 2024', orders: 11, spent: 1420,
        order: { id: '#1041', date: 'Oct 12', status: 'Delivered', item: 'Merino Overcoat', variant: 'Charcoal · L · ×1', price: 320, shipping: 0, g: 'linear-gradient(135deg,#7d7f86,#34363c)' } } },
    { name: 'Clara Morel', ch: 'imessage', time: 'Tue', prev: 'Do you price match?',
      customer: { handle: '+33 6 63 48 21 95', email: 'clara.morel@mail.com', since: 'Aug 2025', orders: 2, spent: 158,
        order: { id: '#1033', date: 'Oct 6', status: 'Delivered', item: 'Leather Belt', variant: 'Black · 85 · ×1', price: 59, shipping: 5, g: 'linear-gradient(135deg,#4e4a46,#1d1b19)' } } },
    {
      name: 'Julie Bonnet', ch: 'rcs', time: '10:34 AM', prev: 'Can I change my delivery slot?',
      customer: { handle: '+33 6 74 30 18 52', email: 'julie.bonnet@mail.com', since: 'Jun 2025', orders: 3, spent: 247,
        order: { id: '#1049', date: 'Oct 14', status: 'Unfulfilled', item: 'Linen Duvet Cover', variant: 'Sage · Queen · ×1', price: 139, shipping: 0, g: 'linear-gradient(135deg,#c9d3bf,#7f9171)' } },
      script: [
        { time: 'Today, 10:34 AM' },
        { in: 'Hi, I won\'t be home Thursday. Can I change my delivery slot?' },
        { out: 'Of course, Julie. Order #1049 can arrive Friday between 9 AM and 1 PM, or Saturday morning. Which works best?' },
        { in: 'Friday morning is perfect', typing: 1000 },
        { sys: 'Delivery for order #1049 moved to Friday, 9 AM–1 PM' },
        { out: 'Done! You\'ll get a tracking update here the day before.' },
      ],
    },
    { name: 'Hugo Lefèvre', ch: 'rcs', time: '9:12 AM', prev: 'Is the sale still on this weekend?',
      customer: { handle: '+33 6 11 92 47 60', email: 'hugo.lefevre@mail.com', since: 'Mar 2026', orders: 1, spent: 58,
        order: { id: '#1035', date: 'Oct 7', status: 'Delivered', item: 'Organic Cotton Hoodie', variant: 'Grey · M · ×1', price: 54, shipping: 4, g: 'linear-gradient(135deg,#c4c6cb,#8b8e95)' } } },
    { name: 'Emma Garcia', ch: 'rcs', time: 'Yesterday', prev: 'Got the discount code, thanks!',
      customer: { handle: '+33 7 40 85 13 29', email: 'emma.garcia@mail.com', since: 'Oct 2024', orders: 5, spent: 498,
        order: { id: '#1043', date: 'Oct 12', status: 'In transit', item: 'Ceramic Mug Set', variant: 'Sand · ×4', price: 64, shipping: 6, g: 'linear-gradient(135deg,#ead9c2,#c2a07a)' } } },
    { name: 'Louis Chevalier', ch: 'rcs', time: 'Mon', prev: 'Where do I find my invoice?',
      customer: { handle: '+33 6 58 26 74 03', email: 'louis.chevalier@mail.com', since: 'Jan 2026', orders: 2, spent: 176,
        order: { id: '#1032', date: 'Oct 6', status: 'Delivered', item: 'Leather Backpack', variant: 'Cognac · ×1', price: 172, shipping: 4, g: 'linear-gradient(135deg,#c48a5a,#7a4a26)' } } },
  ];

  const app = $('#app'), list = $('#threads'), chat = $('#chat'), composer = $('#composer');
  const panelInner = $('#panelInner');
  let runId = 0, current = 0;

  let channel = 'whatsapp', autoplay = true;
  const renderList = (ch) => {
    list.innerHTML = THREADS.map((t, i) => (t.ch !== ch ? '' : `
    <li class="thread" data-i="${i}" role="button" tabindex="0" aria-label="${t.name}, ${CHANNELS[t.ch]}">
      <span class="thread__av">${logo(t.ch)}</span>
      <span class="thread__name">${t.name}</span><span class="thread__time">${t.time}</span>
      <span class="thread__prev">${esc(t.prev)}</span>
    </li>`)).join('');
    $('#threadSearch').value = '';
  };

  /* Fiche client */
  const statusClass = (st) => (/Unfulfilled|Return|transit|pickup/.test(st) ? 'order__status--open' : 'order__status--done');
  const renderPanel = (i, flash) => {
    const t = THREADS[i], c = t.customer, o = c.order;
    panelInner.innerHTML = `
      <div class="panel__bar"><span>Customer</span>
        <span class="icon-btn" aria-hidden="true"><svg viewBox="0 0 14 14"><circle cx="3.5" cy="7" r=".9" /><circle cx="7" cy="7" r=".9" /><circle cx="10.5" cy="7" r=".9" /></svg></span></div>
      <div class="panel__profile">
        <span class="panel__avatar">${initials(t.name)}${logo(t.ch)}</span>
        <div><div class="panel__name">${t.name}</div><div class="panel__sub">${CHANNELS[t.ch]} · ${c.handle}</div></div>
      </div>
      <dl class="panel__list">
        <dt>Email</dt><dd>${c.email}</dd>
        <dt>Customer since</dt><dd>${c.since}</dd>
        <dt>Orders</dt><dd>${c.orders} · ${money(c.spent)}</dd>
      </dl>
      <div class="panel__sep"></div>
      <div>
        <div class="panel__label"><span>Latest order</span><span class="order__brand"><svg><use href="#logo-shopify" /></svg>Shopify</span></div>
        <div class="order__head"><span class="order__id">${o.id} <small>· ${o.date}</small></span><span class="order__status ${statusClass(o.status)}">${o.status}</span></div>
        <div class="order__item${flash ? ' is-updated' : ''}"><span class="order__thumb" style="--g:${o.g}"></span><span><strong>${o.item}</strong><small>${o.variant}</small></span><span>${money(o.price)}</span></div>
        <dl class="panel__list">
          <dt>Subtotal</dt><dd>${money(o.price)}</dd>
          <dt>Shipping</dt><dd>${o.shipping ? money(o.shipping) : 'Free'}</dd>
          <dt class="is-total">Total</dt><dd class="is-total">${money(o.price + o.shipping)}</dd>
        </dl>
      </div>
      <a href="#" class="pbtn pbtn--light panel__link">Open in Shopify <svg><use href="#ext" /></svg></a>`;
    $('.panel__link', panelInner).addEventListener('click', (e) => e.preventDefault());
  };

  /* Fil de discussion */
  const add = (html, cls) => {
    const el = document.createElement('div');
    el.className = `msg ${cls}`;
    el.innerHTML = html;
    chat.appendChild(el);
    while (chat.children.length > 8) chat.firstElementChild.remove();
    return el;
  };
  const placeholderFor = (t) => `Reply to ${t.name.split(' ')[0]} on ${CHANNELS[t.ch]}`;
  const typeIn = async (text, id, placeholder) => {
    composer.classList.add('is-typing');
    for (let i = 1; i <= text.length; i++) {
      if (id !== runId) return false;
      composer.textContent = text.slice(0, i);
      await wait(12 + Math.random() * 20);
    }
    await wait(250);
    composer.textContent = placeholder;
    composer.classList.remove('is-typing');
    return true;
  };
  const showHeader = (t) => {
    $('#threadAv use').setAttribute('href', `#logo-${t.ch}`);
    $('#threadTitle').textContent = t.name;
    $('#threadChannel').textContent = CHANNELS[t.ch];
    composer.textContent = placeholderFor(t);
  };
  const applyPatch = (i, patch) => {
    Object.assign(THREADS[i].customer.order, patch);
    if (i === current) renderPanel(i, true);
  };
  const scriptFor = (i) => THREADS[i].script || [
    { time: /AM|PM/.test(THREADS[i].time) ? `Today, ${THREADS[i].time}` : THREADS[i].time },
    { in: THREADS[i].prev },
  ];
  const outHtml = (text) => `${esc(text)}<span class="msg__by">Sent by Kanal</span>`;

  const play = async (i) => {
    const id = ++runId;
    const t = THREADS[i];
    const placeholder = placeholderFor(t);
    $$('.msg', chat).forEach((m) => m.classList.add('is-leaving'));
    await wait(350);
    if (id !== runId) return;
    chat.innerHTML = '';
    showHeader(t);
    for (const step of scriptFor(i)) {
      if (id !== runId) return;
      if (step.time) { add(step.time, 'msg--time'); continue; }
      if (step.sys) { await wait(300); add(step.sys, 'msg--sys'); if (step.patch) applyPatch(i, step.patch); await wait(900); continue; }
      if (step.in) {
        if (!reduced && step.typing) { const ty = add('<i></i><i></i><i></i>', 'msg--typing'); await wait(step.typing); ty.remove(); }
        if (id !== runId) return;
        add(esc(step.in), 'msg--in'); await wait(900); continue;
      }
      if (step.out) {
        if (!reduced && !(await typeIn(step.out, id, placeholder))) return;
        add(outHtml(step.out), 'msg--out'); await wait(1000);
      }
    }
    await wait(4500);
    if (id === runId && autoplay) selectChannel(CH_ORDER[(CH_ORDER.indexOf(channel) + 1) % CH_ORDER.length]);
  };

  const select = (i) => {
    current = i;
    $$('.thread', list).forEach((el) => el.classList.toggle('is-active', +el.dataset.i === i));
    renderPanel(i);
    play(i);
  };
  list.addEventListener('click', (e) => { const li = e.target.closest('.thread'); if (li) { autoplay = false; select(+li.dataset.i); } });
  list.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target.classList.contains('thread')) { e.preventDefault(); select(+e.target.dataset.i); } });

  /* Recherche */
  $('#threadSearch').addEventListener('input', (e) => {
    const q = e.target.value.trim().toLowerCase();
    $$('.thread', list).forEach((el) => el.classList.toggle('is-hidden', !THREADS[+el.dataset.i].name.toLowerCase().includes(q)));
  });

  /* Barre de canaux */
  const tabs = $('#channelTabs'), glider = $('.ctabs__glider', tabs);
  const moveGlider = () => {
    const on = $('.ctab[aria-selected="true"]', tabs);
    if (!on) return;
    glider.style.width = `${on.offsetWidth}px`;
    glider.style.transform = `translateX(${on.offsetLeft}px)`;
  };
  const firstOf = (ch) => THREADS.findIndex((t) => t.ch === ch && t.script);
  function selectChannel(ch) {
    channel = ch;
    $$('.ctab', tabs).forEach((b) => b.setAttribute('aria-selected', String(b.dataset.ch === ch)));
    moveGlider();
    renderList(ch);
    select(firstOf(ch));
  }
  tabs.addEventListener('click', (e) => {
    const b = e.target.closest('.ctab'); if (!b) return;
    autoplay = false;
    if (b.dataset.ch !== channel) selectChannel(b.dataset.ch);
  });
  tabs.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const k = CH_ORDER.indexOf(channel) + (e.key === 'ArrowRight' ? 1 : -1);
    const next = CH_ORDER[(k + CH_ORDER.length) % CH_ORDER.length];
    autoplay = false; selectChannel(next);
    $(`.ctab[data-ch="${next}"]`, tabs).focus();
  });
  window.addEventListener('resize', moveGlider);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(moveGlider);

  // État complet dès le chargement (WhatsApp), puis lecture quand la fenêtre est visible
  (() => {
    renderList('whatsapp');
    current = 0;
    $$('.thread', list).forEach((el) => el.classList.toggle('is-active', el.dataset.i === '0'));
    showHeader(THREADS[0]);
    THREADS[0].script.forEach((st) => {
      if (st.time) add(st.time, 'msg--time');
      else if (st.sys) add(st.sys, 'msg--sys');
      else if (st.in) add(esc(st.in), 'msg--in');
      else add(outHtml(st.out), 'msg--out');
    });
    // La conversation affichée est déjà terminée : la fiche montre la taille modifiée
    THREADS[0].customer.order.variant = 'Sand · L · ×1';
    renderPanel(0);
    THREADS[0].customer.order.variant = 'Sand · M · ×1';
    $$('.msg', chat).forEach((m) => { m.style.animation = 'none'; });
    moveGlider();
  })();
  const appIO = new IntersectionObserver((en) => { if (en[0].isIntersecting) { appIO.disconnect(); setTimeout(() => { if (autoplay) selectChannel('instagram'); }, 5000); } }, { threshold: 0.3 });
  appIO.observe(app);

  /* ---------------- Rôles (chips) + téléphone ---------------- */
  const ROLES = [
    { name: 'Tenders', color: '#0093a3', title: 'Bids ready ahead of the deadline.', desc: 'Breaks down the specs, collects the paperwork and drafts a technical response from your past submissions.',
      chat: [{ user: 'Prepare our response to the city\'s transport tender.' }, { agent: 'Specs reviewed: 14 requirements, 3 of them pass/fail. Cover email ready for your approval.' },
        { mail: ['Subject: Bid for lot 2', 'Hello,', 'Attached is our offer for lot 2, with the requested certificates and our technical proposal.', 'Kind regards,'], btns: ['Approve', 'Edit'] }] },
    { name: 'Onboarding', color: '#6c6ccb', title: 'A first day with nothing missing.', desc: 'Creates accounts, orders hardware, books first-week meetings and sends out the welcome pack.',
      chat: [{ user: 'Inès starts in marketing on Monday.' }, { agent: 'Accounts created, laptop ordered (arrives Friday), team lunch booked for Tuesday.' }, { agent: 'Want me to send her the welcome pack Sunday evening?' }, { user: 'Yes, perfect.' }] },
    { name: 'Data analysis', color: '#dd2229', title: 'Ask a question, get a chart.', desc: 'Queries your sources, cleans the data and answers a plain-language question with an annotated chart.',
      chat: [{ user: 'Which channel converts best this quarter?' }, { agent: 'Organic search at 3.8%, ahead of email at 2.9%. Paid campaigns dropped 0.6 points.' }, { agent: 'Chart added to the “Acquisition” dashboard.' }] },
    { name: 'Translation', color: '#e8833a', title: 'Your content, in every language.', desc: 'Translates pages, listings and documents using your glossary, then flags passages that deserve a human read.',
      chat: [{ user: 'Translate the pricing page into Spanish and Italian.' }, { agent: 'Both versions are live in drafts. I adapted 2 phrases for the Italian market and highlighted them.' }] },
    { name: 'Regulatory watch', color: '#5a3fa0', title: 'Rule changes, summarized.', desc: 'Tracks official publications in your industry and sums up each change with what it means for you.',
      chat: [{ agent: 'A new packaging labeling rule was published this morning.' }, { agent: 'What it means for you: relabel 3 product lines before March 1.' }, { user: 'Loop in the packaging team.' }] },
    { name: 'Inventory', color: '#252525', title: 'No more stockouts.', desc: 'Watches stock levels, forecasts demand from sales and drafts purchase orders for you to approve.',
      chat: [{ agent: 'Gift box stock will last 9 days at the current pace.' }, { agent: 'A 400-unit purchase order is ready for your usual supplier.' }, { user: 'Send it.' }] },
    { name: 'Meeting prep', color: '#e8a33a', title: 'Walk in with the brief.', desc: 'Gathers the relevant documents, proposes an agenda and lists the questions still open since last time.',
      chat: [{ user: 'Prep tomorrow\'s product review.' }, { agent: 'Agenda sent, with the 3 decisions still pending from last session and fresh usage numbers.' }] },
  ];
  const chips = $('#chips'), desc = $('#roleDesc'), phoneChat = $('#phoneChat');
  chips.innerHTML = ROLES.map((r, i) => `<button class="chip" role="tab" aria-selected="${i === 0}" data-i="${i}"><span class="dot-av" style="--c:${r.color}"></span>${r.name}</button>`).join('');
  let roleTimer, roleIdx = 0;
  const renderPhone = (r) => {
    $('#phoneName').textContent = r.name;
    $('#phoneAv').style.setProperty('--c', r.color);
    phoneChat.innerHTML = r.chat.map((m, k) => {
      const delay = `style="animation-delay:${k * 0.35}s"`;
      if (m.user) return `<div class="msg msg--user" ${delay}>${esc(m.user)}</div>`;
      if (m.mail) return `<div class="mail" ${delay}><div class="mail__body">${m.mail.map((l) => `<p>${l}</p>`).join('')}</div><div class="tool__actions"><span class="pbtn pbtn--dark">${m.btns[0]}</span><span class="pbtn pbtn--light">${m.btns[1]}</span></div></div>`;
      return `<div class="msg msg--agent" ${delay}>${m.agent}</div>`;
    }).join('');
  };
  const renderRole = (i, user) => {
    roleIdx = i;
    $$('.chip', chips).forEach((c) => c.setAttribute('aria-selected', String(+c.dataset.i === i)));
    desc.classList.add('is-swapping');
    setTimeout(() => { desc.innerHTML = `<strong>${ROLES[i].title}</strong> ${ROLES[i].desc}`; desc.classList.remove('is-swapping'); }, 200);
    renderPhone(ROLES[i]);
    clearInterval(roleTimer);
    if (!user && !reduced) roleTimer = setInterval(() => renderRole((roleIdx + 1) % ROLES.length), 5000);
  };
  desc.innerHTML = `<strong>${ROLES[0].title}</strong> ${ROLES[0].desc}`;
  chips.addEventListener('click', (e) => { const c = e.target.closest('.chip'); if (c) renderRole(+c.dataset.i, true); });
  renderRole(0);
  $('#roles').addEventListener('mouseenter', () => clearInterval(roleTimer));

  /* ---------------- Video lightbox ---------------- */
  const lb = $('#lightbox'), frame = $('#lightboxFrame'), video = $('#video');
  video.addEventListener('click', () => {
    const src = video.dataset.src;
    frame.innerHTML = `<video src="${src}" controls autoplay playsinline></video>`;
    const v = frame.querySelector('video');
    v.addEventListener('error', () => { frame.innerHTML = '<p>Add your demo video at <code>assets/demo.mp4</code>.</p>'; });
    if (typeof lb.showModal === 'function') lb.showModal(); else lb.setAttribute('open', '');
  });
  const closeLb = () => { lb.close?.(); lb.removeAttribute('open'); frame.innerHTML = ''; };
  $('.lightbox__close').addEventListener('click', closeLb);
  lb.addEventListener('click', (e) => { if (e.target === lb) closeLb(); });
  lb.addEventListener('close', () => { frame.innerHTML = ''; });

  /* ---------------- Pricing ---------------- */
  const PLANS = [
    { name: 'Starter', tiers: [['3 agents', 15], ['10 agents', 39]], cta: 'Choose Starter', dark: true,
      inc: 'What you get:', items: ['Up to 3 active agents', '30-day history', 'Standard integrations', 'Desktop and mobile apps', 'Email support'] },
    { name: 'Pro', tiers: [['Standard', 49], ['Intensive', 129]], cta: 'Choose Pro', dark: true,
      inc: 'All of Starter, and:', items: ['Unlimited agents', 'Parallel runs', 'Advanced routines and triggers', 'Unlimited history', 'Priority support'] },
    { name: 'Enterprise', tiers: [['Team', 35], ['Scale', 65]], unit: '/ user / month', cta: 'Talk to us', dark: false,
      inc: 'All of Pro, and:', items: ['SSO and SCIM provisioning', 'Exportable audit log', 'EU data residency', 'Dedicated success manager'] },
  ];
  const plansEl = $('#plans');
  const tick = '<svg viewBox="0 0 16 16"><path d="M3.5 8.5 6.5 11.5 12.5 4.5"/></svg>';
  plansEl.innerHTML = PLANS.map((p, i) => `
    <article class="plan reveal reveal--up${p.featured ? ' plan--featured' : ''}" style="--d:${i}" data-i="${i}">
      <div class="plan__top"><span class="plan__name">${p.name}</span>
        <div class="seg" role="group" aria-label="Plan size">${p.tiers.map((t, k) => `<button aria-pressed="${k === 0}" data-k="${k}">${t[0]}</button>`).join('')}</div>
      </div>
      <div class="plan__price"><span class="plan__amount">$0</span><span class="plan__unit">${p.unit || '/ month'}</span></div>
      <div class="plan__bill"></div>
      <a href="#cta" class="btn btn--lg ${p.dark ? 'btn--dark' : 'btn--soft'}">${p.cta}</a>
      <div class="plan__inc">${p.inc}</div>
      <ul>${p.items.map((it) => `<li>${tick}${it}</li>`).join('')}</ul>
    </article>`).join('');
  $$('.plan', plansEl).forEach((el) => revealIO.observe(el));
  const renderPrice = (el, animate) => {
    const p = PLANS[+el.dataset.i];
    const k = +($('.seg [aria-pressed="true"]', el).dataset.k);
    const base = p.tiers[k][1];
    const price = base;
    const amt = $('.plan__amount', el);
    amt.textContent = `$${fmt.format(price)}`;
    if (animate) { amt.classList.remove('is-ticking'); void amt.offsetWidth; amt.classList.add('is-ticking'); }
    $('.plan__bill', el).textContent = 'Billed monthly';
  };
  $$('.plan', plansEl).forEach((el) => {
    renderPrice(el);
    $('.seg', el).addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      $$('.seg button', el).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      renderPrice(el, true);
    });
  });
  /* ---------------- FAQ: smooth accordion, one open at a time ---------------- */
  const items = $$('.faq details');
  items.forEach((d) => {
    const summary = $('summary', d), body = $('.faq__body', d);
    summary.addEventListener('click', (e) => {
      e.preventDefault();
      if (d.dataset.animating) return;
      const opening = !d.open;
      if (opening) items.forEach((o) => { if (o !== d && o.open) toggle(o, false); });
      toggle(d, opening);
    });
    function toggle(el, open) {
      const b = el === d ? body : $('.faq__body', el);
      if (reduced) { el.open = open; return; }
      el.dataset.animating = '1';
      if (open) el.open = true;
      const h = b.scrollHeight;
      const anim = b.animate(
        open ? [{ height: '0px', opacity: 0 }, { height: h + 'px', opacity: 1 }] : [{ height: h + 'px', opacity: 1 }, { height: '0px', opacity: 0 }],
        { duration: 380, easing: 'cubic-bezier(.22,1,.36,1)' }
      );
      anim.onfinish = () => { if (!open) el.open = false; delete el.dataset.animating; };
    }
  });

  /* ---------------- Theme toggle ---------------- */
  $('#themeToggle').addEventListener('click', () => {
    const root = document.documentElement;
    const isDark = root.getAttribute('data-theme') === 'dark' ||
      (!root.getAttribute('data-theme') && matchMedia('(prefers-color-scheme: dark)').matches);
    const next = isDark ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('kanal-theme', next); } catch (e) {}
  });
})();
