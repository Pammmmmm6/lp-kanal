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
  const CHANNELS = { whatsapp: 'WhatsApp', instagram: 'Instagram', imessage: 'iMessage', rcs: 'RCS' };
  const CH_ORDER = Object.keys(CHANNELS);
  const logo = (ch) => `<svg viewBox="0 0 32 32"><use href="#logo-${ch}" /></svg>`;
  const esc = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const money = (n) => `€${n.toFixed(2)}`;
  const initials = (n) => n.split(' ').map((w) => w[0]).join('');

  // Visuels produits Fincut
  const IMG = {
    tee: 'assets/fincut/tee-black.jpg', poloWhite: 'assets/fincut/polo-white.jpg', poloNavy: 'assets/fincut/polo-navy.jpg',
    vneck: 'assets/fincut/vneck-black.jpg', pack: 'assets/fincut/pack.jpg', trousers: 'assets/fincut/trousers-black.jpg', box: 'assets/fincut/giftbox.jpg',
  };
  const order = (o) => ({ shipping: 0, discount: 0, ...o });
  const C = (handle, email, since, orders, spent, o) => ({ handle, email, since, orders, spent, order: order(o) });

  /* Chaque conversation est une mise en situation : panier abandonné, confirmation, support, campagne… */
  const THREADS = [
    // ---- WhatsApp
    { name: 'Emma Laurent', ch: 'whatsapp', lead: true, time: '10:14 AM', prev: 'Perfect, ordering now 🙌',
      customer: C('+33 6 12 48 90 31', 'emma.laurent@mail.com', 'Mar 2024', 4, 214, { id: 'Checkout', date: 'Oct 15', status: 'Abandoned', item: 'Tech T-shirt', variant: 'Black · M · ×1', price: 39, img: IMG.tee }),
      script: [
        { time: 'Today, 10:12 AM' },
        { sys: 'Abandoned cart flow · 1 hour after checkout' },
        { card: { img: IMG.tee, text: 'Still thinking it over, Emma? Your <b>Tech T-shirt</b> in Black (M) is waiting in your cart.', buttons: ['Complete my order', 'Ask a question'], by: 'Abandoned cart' } },
        { in: 'Is it true to size? I\'m between M and L', typing: 1100 },
        { out: 'It\'s a slim fit, so if you like a relaxed feel, go for the L. I\'ve updated your cart and added 10% off with WELCOME10.' },
        { sys: 'Cart updated · Size L · WELCOME10 applied', patch: { variant: 'Black · L · ×1', discount: 3.9 } },
        { in: 'Perfect, ordering now 🙌', typing: 1000 },
        { card: { img: IMG.tee, text: '<b>Order #1042 confirmed</b> ✅ Tech T-shirt · Black · L. We\'ll message you here as soon as it ships.', buttons: ['Track my order'], by: 'Order confirmation' }, patch: { id: '#1042', status: 'Paid' } },
        { sys: '€35.10 attributed to Abandoned cart' },
      ] },
    { name: 'Noah Petit', ch: 'whatsapp', time: '9:16 AM', prev: 'Free returns within 30 days, right from this chat.',
      customer: C('+32 470 12 34 56', 'noah.petit@mail.com', 'Oct 2026', 1, 45, { id: '#1045', date: 'Oct 14', status: 'Unfulfilled', item: 'V-neck T-shirt', variant: 'Black · M · ×1', price: 39, shipping: 6, img: IMG.vneck }),
      script: [
        { time: 'Today, 9:15 AM' },
        { in: 'Hi! Do you ship to Belgium?' },
        { out: 'We do! Delivery takes 2–4 business days, and it\'s free from €60.' },
        { in: 'Great, and what about returns?', typing: 900 },
        { out: 'Free returns within 30 days, right from this chat.' },
      ] },
    { name: 'Inès Roux', ch: 'whatsapp', time: 'Wed', prev: 'Order received, thank you! Super comfy 👌',
      customer: C('+33 7 81 22 09 64', 'ines.roux@mail.com', 'Nov 2024', 3, 187, { id: '#1031', date: 'Oct 6', status: 'In transit', item: 'Gift box · Pack of 2', variant: 'Black, Navy · L', price: 69, img: IMG.box }),
      script: [
        { time: 'Mon, 9:02 AM' },
        { card: { img: IMG.box, text: 'Good news, Inès! <b>Order #1031</b> is on its way 🚚 Estimated delivery: Wednesday.', buttons: ['Track my order'], by: 'Shipping update' } },
        { time: 'Wed, 2:40 PM' },
        { card: { text: 'Delivered! 📦 How do you like your order? It takes 10 seconds and helps us a lot.', buttons: ['Leave a review'], by: 'Review request' }, patch: { status: 'Delivered' } },
        { in: 'Order received, thank you! Super comfy 👌', typing: 900 },
      ] },
    { name: 'Tom Mercier', ch: 'whatsapp', time: 'Yesterday', prev: 'Perfect, thanks!',
      customer: C('+33 6 45 17 82 03', 'tom.mercier@mail.com', 'Jul 2025', 2, 168, { id: '#1036', date: 'Oct 7', status: 'Delivered', item: 'Tech T-shirt', variant: 'Black · L · ×2', price: 78, img: IMG.tee }),
      script: [
        { time: 'Yesterday, 6:31 PM' },
        { in: 'Can I pay in three installments?' },
        { out: 'Yes! You can pay in 3 or 4 installments at checkout, with no fees. Here\'s The Trousers in your size.' },
        { card: { img: IMG.trousers, text: '<b>The Trousers</b> · Black · 42 — €89', buttons: ['Check out'], by: 'Product card' } },
        { in: 'Perfect, thanks!', typing: 900 },
      ] },
    // ---- Instagram
    { name: 'Lucas Martin', ch: 'instagram', lead: true, time: '10:02 AM', prev: 'Great choice! It ships tomorrow morning.',
      customer: C('@lucas.mrtn', 'lucas.martin@mail.com', 'Jan 2025', 2, 129, { id: '#0987', date: 'Sep 2', status: 'Delivered', item: 'Pack of 3 Essentials', variant: 'Black, White, Navy · L', price: 99, img: IMG.pack }),
      script: [
        { time: 'Today, 9:58 AM' },
        { story: { img: IMG.poloNavy, text: 'Is the white one back in stock? 👀' } },
        { out: 'It is! The white Polo is back in S, M and L since this morning. You took an L in your Essentials pack, want the same?' },
        { in: 'Yes please!', typing: 900 },
        { card: { img: IMG.poloWhite, text: '<b>Polo</b> · White · L — €55. Free delivery, 30-day returns.', buttons: ['Buy now'], by: 'Product card' } },
        { in: 'Done ✅', typing: 1200 },
        { sys: 'Order #1050 · €55.00 attributed to Instagram', patch: { id: '#1050', date: 'Oct 15', status: 'Paid', item: 'Polo', variant: 'White · L · ×1', price: 55, img: IMG.poloWhite } },
        { out: 'Great choice! It ships tomorrow morning.' },
      ] },
    { name: 'Jade Fontaine', ch: 'instagram', time: '8:48 AM', prev: 'V-neck T-shirt · Black — €39',
      customer: C('@jade.fntn', 'jade.fontaine@mail.com', 'Apr 2025', 3, 156, { id: '#1039', date: 'Oct 10', status: 'In transit', item: 'Pack of 3 Essentials', variant: 'Black, White, Navy · M', price: 99, img: IMG.pack }),
      script: [
        { time: 'Today, 8:47 AM' },
        { in: 'Do you have the V-neck in black? 🖤' },
        { out: 'Yes! From S to XXL. Most customers go for their usual size.' },
        { card: { img: IMG.vneck, text: '<b>V-neck T-shirt</b> · Black — €39', buttons: ['Shop now'], by: 'Product card' } },
      ] },
    { name: 'Léa Moreau', ch: 'instagram', time: 'Yesterday', prev: 'Here\'s 15% off your next order: THANKYOU15.',
      customer: C('@lea.moreau', 'lea.moreau@mail.com', 'Jun 2023', 6, 412, { id: '#1029', date: 'Oct 5', status: 'Delivered', item: 'Pack of 4 Signature', variant: 'Mixed colors · M', price: 129, img: IMG.pack }),
      script: [
        { time: 'Yesterday, 7:12 PM' },
        { card: { img: IMG.pack, text: 'Hi Léa! How does the <b>Pack of 4 Signature</b> fit? Your feedback means a lot to us.', buttons: ['Leave a review'], by: 'Review request' } },
        { in: 'My boyfriend loved the packaging 😍 and the tees are perfect', typing: 1000 },
        { out: 'That makes our day! Here\'s 15% off your next order: THANKYOU15.' },
      ] },
    { name: 'Nathan Robin', ch: 'instagram', time: 'Mon', prev: 'Nathan added to Early access',
      customer: C('@nathanrbn', 'nathan.robin@mail.com', 'Sep 2026', 1, 39, { id: '#1030', date: 'Oct 5', status: 'Delivered', item: 'Tech T-shirt', variant: 'Black · L · ×1', price: 39, img: IMG.tee }),
      script: [
        { time: 'Mon, 5:20 PM' },
        { in: 'When is the next drop?' },
        { out: 'Thursday at 10 AM: new colors on the Tech T-shirt. Want early access?' },
        { in: 'Yes!', typing: 800 },
        { sys: 'Nathan added to Early access' },
      ] },
    // ---- iMessage
    { name: 'Maxime Dubois', ch: 'imessage', lead: true, time: '10:23 AM', prev: 'Your order #1048 has shipped 🚚',
      customer: C('+33 6 98 02 44 17', 'maxime.dubois@mail.com', 'Feb 2024', 7, 538, { id: '#1048', date: 'Oct 14', status: 'Unfulfilled', item: 'The Trousers', variant: 'Black · 42 · ×1', price: 89, img: IMG.trousers }),
      script: [
        { time: 'Today, 10:20 AM' },
        { in: 'Hey! I need my trousers for a wedding on Saturday. Will they arrive in time?' },
        { out: 'Hi Maxime! I\'ve upgraded order #1048 to free express delivery. It ships today and arrives Friday before 1 PM.' },
        { sys: 'Order #1048 upgraded to express in Shopify', patch: { status: 'Express' } },
        { in: 'Amazing, thanks a lot 👍', typing: 1000 },
        { card: { img: IMG.trousers, text: '<b>Your order #1048 has shipped</b> 🚚 The Trousers · Black · 42. Arrives Friday before 1 PM.', buttons: ['Track my package'], by: 'Shipping update' }, patch: { status: 'In transit' } },
      ] },
    { name: 'Zoé Lambert', ch: 'imessage', time: '9:07 AM', prev: 'Gift box added to order #1046 🎁',
      customer: C('+33 7 52 39 61 08', 'zoe.lambert@mail.com', 'Nov 2025', 1, 55, { id: '#1046', date: 'Oct 14', status: 'Unfulfilled', item: 'Polo', variant: 'Navy · L · ×1', price: 55, img: IMG.poloNavy }),
      script: [
        { time: 'Today, 9:05 AM' },
        { in: 'Can you gift-wrap my order? It\'s for my brother' },
        { out: 'Of course! I\'ve added our gift box and a handwritten note to order #1046. What should the note say?' },
        { in: '“Happy birthday Tom!” 🎂', typing: 900 },
        { card: { img: IMG.box, text: '<b>Gift box added to order #1046</b> 🎁 Note: “Happy birthday Tom!”', by: 'Order update' }, patch: { variant: 'Navy · L · ×1 · Gift box' } },
      ] },
    { name: 'Arthur Girard', ch: 'imessage', time: 'Yesterday', prev: 'Thanks for the quick reply!',
      customer: C('+33 6 21 75 90 46', 'arthur.girard@mail.com', 'Jan 2024', 11, 864, { id: '#1041', date: 'Oct 12', status: 'Delivered', item: 'Pack of 4 Signature', variant: 'Mixed colors · M', price: 129, img: IMG.pack }),
      script: [
        { time: 'Yesterday, 11:30 AM' },
        { in: 'Is there a discount for loyal customers?' },
        { out: 'You\'re one of our VIPs, Arthur. Here\'s 20% off your next order, valid for 7 days: VIP20.' },
        { in: 'Thanks for the quick reply!', typing: 800 },
      ] },
    { name: 'Clara Morel', ch: 'imessage', time: 'Tue', prev: 'Fincut gift card · from €25',
      customer: C('+33 6 63 48 21 95', 'clara.morel@mail.com', 'Aug 2025', 2, 118, { id: '#1033', date: 'Oct 6', status: 'Delivered', item: 'Polo', variant: 'White · M · ×1', price: 55, img: IMG.poloWhite }),
      script: [
        { time: 'Tue, 4:15 PM' },
        { in: 'Do you sell gift cards?' },
        { out: 'Yes, from €25 to €200, sent by email instantly.' },
        { card: { img: IMG.box, text: '<b>Fincut gift card</b> · from €25', buttons: ['Buy a gift card'], by: 'Product card' } },
      ] },
    // ---- RCS
    { name: 'Julie Bonnet', ch: 'rcs', lead: true, time: '10:36 AM', prev: 'Done! You\'ll get a reminder here the day before.',
      customer: C('+33 6 74 30 18 52', 'julie.bonnet@mail.com', 'Jun 2025', 3, 207, { id: '#1049', date: 'Oct 14', status: 'Unfulfilled', item: 'Pack of 4 Signature', variant: 'Mixed colors · M', price: 129, img: IMG.pack }),
      script: [
        { time: 'Yesterday, 8:42 PM' },
        { card: { img: IMG.pack, text: 'Thanks for your order, Julie! <b>#1049</b> · Pack of 4 Signature · M. Estimated delivery: Thursday.', buttons: ['View order', 'Change delivery'], by: 'Order confirmation' } },
        { time: 'Today, 10:34 AM' },
        { in: 'Hi, I won\'t be home Thursday. Can I change my delivery slot?' },
        { out: 'Of course! Friday between 9 AM and 1 PM, or Saturday morning?' },
        { in: 'Friday morning is perfect', typing: 900 },
        { sys: 'Delivery for #1049 moved to Friday, 9 AM–1 PM' },
        { out: 'Done! You\'ll get a reminder here the day before.' },
      ] },
    { name: 'Hugo Lefèvre', ch: 'rcs', time: '9:12 AM', prev: 'Yes, until Sunday midnight.',
      customer: C('+33 6 11 92 47 60', 'hugo.lefevre@mail.com', 'Mar 2026', 1, 39, { id: '#1035', date: 'Oct 7', status: 'Delivered', item: 'Tech T-shirt', variant: 'Black · M · ×1', price: 39, img: IMG.tee }),
      script: [
        { time: 'Today, 9:00 AM' },
        { card: { img: IMG.pack, text: '<b>Mid-season sale</b> 🔥 -20% on all packs until Sunday.', buttons: ['Shop the sale'], by: 'Campaign' } },
        { in: 'Is the sale still on this weekend?', typing: 900 },
        { out: 'Yes, until Sunday midnight. Packs start at €79 during the sale.' },
      ] },
    { name: 'Emma Garcia', ch: 'rcs', time: 'Yesterday', prev: 'Got the discount code, thanks!',
      customer: C('+33 7 40 85 13 29', 'emma.garcia@mail.com', 'Oct 2024', 4, 296, { id: '#1043', date: 'Jul 12', status: 'Delivered', item: 'V-neck T-shirt', variant: 'Black · L · ×2', price: 78, img: IMG.vneck }),
      script: [
        { time: 'Yesterday, 12:00 PM' },
        { card: { img: IMG.tee, text: 'We miss you, Emma! Here\'s <b>15% off</b> your next order: COMEBACK15', buttons: ['Shop now'], by: 'Win-back' } },
        { in: 'Got the discount code, thanks!', typing: 900 },
      ] },
    { name: 'Louis Chevalier', ch: 'rcs', time: 'Mon', prev: 'Invoice #1032 sent',
      customer: C('+33 6 58 26 74 03', 'louis.chevalier@mail.com', 'Jan 2026', 2, 128, { id: '#1032', date: 'Oct 6', status: 'Delivered', item: 'Polo', variant: 'Navy · XL · ×1', price: 55, img: IMG.poloNavy }),
      script: [
        { time: 'Mon, 3:08 PM' },
        { in: 'Where do I find my invoice?' },
        { out: 'Here you go, Louis: the invoice for order #1032 is attached. You\'ll also find it in your account under Orders.' },
        { sys: 'Invoice #1032 sent' },
      ] },
  ];
  // Copie de l'état initial des commandes, pour rejouer chaque scénario depuis le début
  const ORIG = THREADS.map((t) => JSON.stringify(t.customer.order));
  const resetOrder = (i) => { THREADS[i].customer.order = JSON.parse(ORIG[i]); };

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
  const statusClass = (st) => (/Unfulfilled|Abandoned|transit|Express/.test(st) ? 'order__status--open' : 'order__status--done');
  const renderPanel = (i, flash) => {
    const t = THREADS[i], c = t.customer, o = c.order;
    const total = o.price - o.discount + o.shipping;
    const isCart = o.id === 'Checkout';
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
        <div class="panel__label"><span>${isCart ? 'Open cart' : 'Latest order'}</span><span class="order__brand"><svg><use href="#logo-shopify" /></svg>Shopify</span></div>
        <div class="order__head"><span class="order__id">${isCart ? 'Checkout' : o.id} <small>· ${o.date}</small></span><span class="order__status ${statusClass(o.status)}">${o.status}</span></div>
        <div class="order__item${flash ? ' is-updated' : ''}"><img class="order__thumb" src="${o.img}" alt="" loading="lazy" /><span><strong>${o.item}</strong><small>${o.variant}</small></span><span>${money(o.price)}</span></div>
        <dl class="panel__list">
          <dt>Subtotal</dt><dd>${money(o.price)}</dd>
          ${o.discount ? `<dt>Discount</dt><dd>−${money(o.discount)}</dd>` : ''}
          <dt>Shipping</dt><dd>${o.shipping ? money(o.shipping) : 'Free'}</dd>
          <dt class="is-total">Total</dt><dd class="is-total">${money(total)}</dd>
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
    while (chat.children.length > 9) chat.firstElementChild.remove();
    return el;
  };
  const placeholderFor = (t) => `Reply to ${t.name.split(' ')[0]} on ${CHANNELS[t.ch]}`;
  const typeIn = async (text, id, placeholder) => {
    composer.classList.add('is-typing');
    for (let i = 1; i <= text.length; i++) {
      if (id !== runId) return false;
      composer.textContent = text.slice(0, i);
      await wait(10 + Math.random() * 18);
    }
    await wait(220);
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
  const by = (label) => `<span class="msg__by">${label}</span>`;
  const cardHtml = (c) => `${c.img ? `<img class="card-msg__img" src="${c.img}" alt="" loading="lazy" />` : ''}
    <div class="card-msg__body"><p>${c.text}</p>${by(`${c.by} · Kanal`)}</div>
    ${c.buttons ? `<div class="card-msg__btns">${c.buttons.map((b) => `<span>${b}</span>`).join('')}</div>` : ''}`;
  const storyHtml = (st) => `<span class="story"><img src="${st.img}" alt="" loading="lazy" /><small>Replied to your story</small></span>${esc(st.text)}`;
  const outHtml = (text) => `${esc(text)}${by('Sent by Kanal')}`;
  // Rend une étape du scénario (sans animation)
  const renderStep = (i, st) => {
    if (st.time) return add(st.time, 'msg--time');
    if (st.sys) return add(st.sys, 'msg--sys');
    if (st.in) return add(esc(st.in), 'msg--in');
    if (st.story) return add(storyHtml(st.story), 'msg--in msg--story');
    if (st.card) return add(cardHtml(st.card), 'msg--card');
    return add(outHtml(st.out), 'msg--out');
  };

  const play = async (i) => {
    const id = ++runId;
    const t = THREADS[i];
    const placeholder = placeholderFor(t);
    $$('.msg', chat).forEach((m) => m.classList.add('is-leaving'));
    await wait(350);
    if (id !== runId) return;
    chat.innerHTML = '';
    showHeader(t);
    for (const step of t.script) {
      if (id !== runId) return;
      if (step.time) { renderStep(i, step); continue; }
      if ((step.in || step.story) && !reduced && step.typing) {
        const ty = add('<i></i><i></i><i></i>', 'msg--typing'); await wait(step.typing); ty.remove();
      }
      if (step.out && !reduced && !(await typeIn(step.out, id, placeholder))) return;
      if (step.sys || step.card) await wait(350);
      if (id !== runId) return;
      renderStep(i, step);
      if (step.patch) applyPatch(i, step.patch);
      await wait(step.card ? 1500 : step.sys ? 900 : 1000);
    }
    await wait(4500);
    if (id === runId && autoplay) selectChannel(CH_ORDER[(CH_ORDER.indexOf(channel) + 1) % CH_ORDER.length]);
  };

  const select = (i) => {
    current = i;
    $$('.thread', list).forEach((el) => el.classList.toggle('is-active', +el.dataset.i === i));
    resetOrder(i);
    renderPanel(i);
    play(i);
  };
  list.addEventListener('click', (e) => { const li = e.target.closest('.thread'); if (li) { autoplay = false; select(+li.dataset.i); } });
  list.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target.classList.contains('thread')) { e.preventDefault(); autoplay = false; select(+e.target.dataset.i); } });

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
  const firstOf = (ch) => THREADS.findIndex((t) => t.ch === ch && t.lead);
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

  // État complet dès le chargement : le scénario WhatsApp est affiché terminé, fiche à jour
  (() => {
    renderList('whatsapp');
    current = 0;
    $$('.thread', list).forEach((el) => el.classList.toggle('is-active', el.dataset.i === '0'));
    showHeader(THREADS[0]);
    THREADS[0].script.forEach((st) => { renderStep(0, st); if (st.patch) Object.assign(THREADS[0].customer.order, st.patch); });
    renderPanel(0);
    resetOrder(0);
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
