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

  /* ---------------- Hero: rotating channel name ---------------- */
  const rotator = $('[data-rotator]');
  if (rotator && !reduced) {
    const words = $$('.rotator__word', rotator);
    let cur = 0;
    const fit = () => { rotator.style.width = words[cur].offsetWidth + 'px'; };
    fit();
    document.fonts?.ready.then(fit);
    window.addEventListener('resize', fit);
    setInterval(() => {
      if (document.hidden) return;
      const prev = words[cur];
      cur = (cur + 1) % words.length;
      const next = words[cur];
      // repart du haut sans transition, puis glisse en place
      next.style.transition = 'none';
      next.classList.remove('is-out');
      next.offsetWidth;
      next.style.transition = '';
      prev.classList.replace('is-on', 'is-out');
      prev.setAttribute('aria-hidden', 'true');
      next.classList.add('is-on');
      next.removeAttribute('aria-hidden');
      fit();
    }, 2000);
  }

  /* ---------------- Feature loops (cart flow + AI agent chat) ---------------- */
  // Each loop only advances while its card is on screen.
  const onScreen = (el) => {
    let visible = false, wake = null;
    new IntersectionObserver(([en]) => {
      visible = en.isIntersecting;
      if (visible && wake) { wake(); wake = null; }
    }, { threshold: 0.3 }).observe(el);
    return async (ms) => {
      await wait(ms);
      if (!visible) await new Promise((r) => { wake = r; });
    };
  };
  const eur = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const flow = $('[data-flow]');
  if (flow) {
    const steps = $$('.flow__step', flow);
    const totalEl = $('[data-flow-total]', flow);
    let total = +totalEl.dataset.flowTotal;
    const bump = (to) => {
      const from = total, t0 = performance.now();
      const step = (now) => {
        const p = Math.min(1, (now - t0) / 900), e = 1 - Math.pow(1 - p, 3);
        totalEl.textContent = '€' + eur.format(from + (to - from) * e);
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
      total = to;
    };
    if (reduced) {
      steps.forEach((li) => li.classList.add('is-done'));
    } else {
      const tick = onScreen(flow);
      (async () => {
        for (;;) {
          await tick(600);
          for (const li of steps) {
            li.classList.add('is-active');
            await tick(li.classList.contains('flow__step--win') ? 900 : 750);
            li.classList.replace('is-active', 'is-done');
            await tick(250);
          }
          bump(Math.round((total + 35.1) * 100) / 100);
          await tick(3200);
          steps.forEach((li) => li.classList.remove('is-done', 'is-active'));
        }
      })();
    }
  }

  const camp = $('[data-camp]');
  if (camp) {
    const TOTAL = 12480, el = (k) => $(`[data-camp-${k}]`, camp);
    const state = el('state'), bar = el('bar');
    const paint = (p) => {
      // p : avancement 0 → 1 de l'envoi
      el('sent').textContent = fmt.format(Math.round(TOTAL * p));
      bar.style.width = (p * 100).toFixed(2) + '%';
      el('delivered').textContent = Math.round(98 * Math.min(1, p * 1.15)) + '%';
      el('read').textContent = Math.round(91 * Math.max(0, p * 1.1 - .1)) + '%';
      el('revenue').textContent = '€' + fmt.format(Math.round(18240 * Math.pow(p, 1.4)));
    };
    const done = (on) => { state.classList.toggle('is-done', on); state.textContent = on ? 'Completed' : 'Sending'; };
    if (reduced) { paint(1); done(true); } else {
      const tick = onScreen(camp);
      paint(0);
      (async () => {
        for (;;) {
          done(false);
          await tick(500);
          const t0 = performance.now(), dur = 5200;
          for (;;) {
            const p = Math.min(1, (performance.now() - t0) / dur);
            paint(1 - Math.pow(1 - p, 2));
            if (p >= 1) break;
            await new Promise((r) => requestAnimationFrame(r));
          }
          done(true);
          await tick(3200);
          paint(0);
        }
      })();
    }
  }

  const chatCard = $('[data-chat]');
  if (chatCard) {
    const rows = $$('[data-chat-step]', chatCard);
    const [ask, lookup, typing, reply, cta] = rows;
    // Fixe la hauteur de la carte sur la conversation complète pour qu'elle ne bouge pas pendant la boucle
    const lockHeight = () => {
      const prev = rows.map((r) => r.classList.contains('is-shown'));
      chatCard.style.minHeight = '';
      rows.forEach((r) => { r.style.transition = 'none'; r.classList.toggle('is-shown', r !== typing); });
      chatCard.style.minHeight = chatCard.offsetHeight + 'px';
      rows.forEach((r, i) => { r.classList.toggle('is-shown', prev[i]); r.offsetHeight; r.style.transition = ''; });
    };
    if (reduced) {
      rows.forEach((r) => r.classList.toggle('is-shown', r !== typing));
    } else {
      lockHeight();
      window.addEventListener('resize', lockHeight);
      document.fonts?.ready.then(lockHeight);
      const tick = onScreen(chatCard);
      const show = (r) => r.classList.add('is-shown');
      (async () => {
        for (;;) {
          await tick(500);
          show(ask);
          await tick(1300);
          show(lookup);
          await tick(700);
          show(typing);
          await tick(1600);
          typing.classList.remove('is-shown');
          show(reply);
          await tick(1100);
          show(cta);
          await tick(4000);
          rows.forEach((r) => r.classList.remove('is-shown'));
          await tick(700);
        }
      })();
    }
  }

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
  const cardHtml = (c) => `${c.img ? `<div class="card-msg__media"><img class="card-msg__img" src="${c.img}" alt="" loading="lazy" /></div>` : ''}
    <div class="card-msg__body"><span class="card-msg__tag">${c.by} · Kanal</span><p>${c.text}</p></div>
    ${c.buttons ? `<div class="card-msg__btns">${c.buttons.map((b, k) => `<span class="pbtn ${k ? 'pbtn--light' : 'pbtn--dark'}">${b}</span>`).join('')}</div>` : ''}`;
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

  /* ---------------- Jobs: pills + phone (one Kanal agent per use case) ---------------- */
  // Palettes 100 / 300 / 350 / 400 / 550 par famille de couleur
  const HUES = {
    cyan: ['#f2feff', '#4ad8ec', '#01b6c3', '#0093a3', '#012f35'],
    violet: ['#fafafe', '#b6b3f9', '#8f8deb', '#6c6ccb', '#251f41'],
    magenta: ['#fff9fd', '#f6a0d5', '#e76cb8', '#c23b90', '#480c34'],
    green: ['#f4fff8', '#6dd998', '#2cb663', '#03943c', '#012f12'],
    red: ['#fff9fb', '#ff99a8', '#fd5c6a', '#dd2229', '#4e071c'],
    blue: ['#f5fbfe', '#7fc3ff', '#2da0f5', '#0e7fcb', '#002843'],
    orange: ['#fff9f6', '#ffa782', '#fe733d', '#e84302', '#481800'],
    yellow: ['#fffcf3', '#f8b956', '#db941e', '#b77400', '#3b2703'],
  };
  const hueVars = (h) => HUES[h].map((v, i) => `--c${['100', '300', '350', '400', '550'][i]}:${v}`).join(';');
  const ICONS = {
    cart: '<path d="M1.5 2.5h2l1.4 6.5h6.6l1.5-4.5H4.3" /><circle cx="6" cy="12.5" r=".9" /><circle cx="11" cy="12.5" r=".9" />',
    truck: '<path d="M1.5 4h7.5v6.5H1.5zM9 6.5h3l2 2.2v1.8H9" /><circle cx="4.5" cy="12" r="1.2" /><circle cx="11.5" cy="12" r="1.2" />',
    megaphone: '<path d="M2.5 6.5v3h2l5.5 3v-9l-5.5 3zM12.5 6a2.5 2.5 0 0 1 0 4" />',
    chat: '<path d="M3 3.5h10a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H7l-3 2.5V11.5H3a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1z" />',
    bag: '<path d="M3.5 5.5h9l-.7 8h-7.6zM6 5.5v-1a2 2 0 0 1 4 0v1M8 8v3.5M6.3 9.8h3.4" />',
    star: '<path d="m8 2.2 1.8 3.7 4 .6-2.9 2.8.7 4L8 11.4l-3.6 1.9.7-4-2.9-2.8 4-.6z" />',
    loop: '<path d="M13 8a5 5 0 1 1-1.5-3.6M13 2.5v3h-3" />',
  };
  const avatar = (j) => `<span class="job-av"><svg viewBox="0 0 16 16">${ICONS[j.icon]}</svg></span>`;
  const routineIco = '<svg viewBox="0 0 16 16"><path d="M9 1.8 3.5 9h4l-1 5.2L12.5 7h-4z" /></svg>';

  // Un scénario par moment du parcours client : vue côté client, la marque (Fincut) à gauche, le client à droite
  const JOBS = [
    { name: 'Cart Recovery', hue: 'cyan', icon: 'cart', title: 'Win back every abandoned checkout.', desc: 'A friendly reminder with the product, the right timing and a one-tap link back to checkout. Questions get answered in the same chat.',
      chat: [
        { time: 'Today 3:12 PM', sys: ['Triggered by', 'Abandoned checkout'] },
        { card: { title: 'Still thinking?', badge: 'Cart reminder', tone: 'accent', rows: [['Item', 'Tech T-shirt · Black'], ['Size', 'M']], body: ['Hi Emma, you left the Tech T-shirt in your cart. Your size is still in stock.'], actions: ['Complete order', 'Change size'] } },
        { user: 'is it true to size? i usually wear M but sometimes L' },
        { agent: 'It runs true to size, so M is perfect. Want me to keep it for you until tonight?' },
        { user: 'yes please, ordering now' },
        { agent: 'All set, order <strong>#1042</strong> is confirmed. Thanks Emma!' },
      ] },
    { name: 'Order Updates', hue: 'violet', icon: 'truck', title: 'Keep every customer in the loop.', desc: 'Order confirmation, shipping and delivery updates with live tracking, sent automatically from Shopify.',
      chat: [
        { time: 'Monday 10:02 AM', sys: ['Triggered by', 'Order paid'] },
        { card: { title: 'Order confirmed', badge: '#1042', tone: 'success', rows: [['Items', 'Tech T-shirt, Trousers'], ['Total', '€84.00']], body: ['Thanks Maxime! Your order is confirmed and ships within 24 hours.'], actions: ['View order', 'Manage order'] } },
        { time: 'Tuesday 8:15 AM', sys: ['Triggered by', 'Order shipped'] },
        { agent: 'Good news Maxime, your order is on its way. Expected delivery: <strong>Thursday</strong>.' },
        { user: 'can I get it delivered to my office instead?' },
        { agent: 'Of course. The carrier has your new address, same delivery date.' },
      ] },
    { name: 'Campaigns', hue: 'magenta', icon: 'megaphone', title: 'Launch campaigns that get read.', desc: 'Send a drop, a sale or a restock to the right segment, with images and buttons customers actually tap.',
      chat: [
        { time: 'Thursday 6:00 PM', sys: ['Campaign', 'Summer Sale'] },
        { card: { title: 'Summer Sale is on', badge: '−30%', tone: 'accent', rows: [['Ends', 'Sunday midnight'], ['Code', 'SUMMER30']], body: ['Hi Lucas, 30% off everything until Sunday. Your favourites are waiting.'], actions: ['Shop now', 'Stop promos'] } },
        { user: 'does it work on the new polos too?' },
        { agent: 'Yes, the new Polo is included. Navy and white are both in stock in L.' },
        { user: 'perfect, just ordered the navy one' },
        { agent: 'Great choice! Order <strong>#1051</strong> is confirmed.' },
      ] },
    { name: 'Customer Support', hue: 'green', icon: 'chat', title: 'Answer every question, day or night.', desc: 'Sizing, delivery, returns: customers get an answer in seconds, and your team steps in whenever it matters.',
      chat: [
        { time: 'Sunday 11:48 PM', user: 'hi, my order arrived damaged. can I get a replacement?' },
        { agent: 'Sorry about that, Julie. Could you send me a photo of the item?' },
        { user: 'here it is, the seam is torn' },
        { card: { title: 'Replacement sent', badge: '#1063', tone: 'success', rows: [['Item', 'Polo · White, M'], ['Shipping', 'Free, 2–3 days']], body: ['We\'ve sent you a new one at no cost. No need to return the damaged item.'], actions: ['Track order', 'Talk to the team'] } },
        { user: 'wow that was fast, thank you!' },
      ] },
    { name: 'Post-purchase Upsell', hue: 'blue', icon: 'bag', title: 'Grow every order after checkout.', desc: 'Suggest the product that pairs with what they just bought, added to the same shipment in one tap.',
      chat: [
        { time: 'Monday 2:31 PM', sys: ['Triggered by', 'Order paid'] },
        { agent: 'Thanks for your order, Maxime! One more thing before it ships…' },
        { card: { title: 'Complete the look', badge: '−15%', tone: 'accent', rows: [['Item', 'Trousers · Black'], ['Ships', 'With order #1042']], body: ['The Trousers pair perfectly with your Tech T-shirt.'], actions: ['Add to my order', 'No thanks'] } },
        { user: 'add them, size 32' },
        { agent: 'Added to order <strong>#1042</strong>, same delivery date.' },
      ] },
    { name: 'Review Collection', hue: 'orange', icon: 'star', title: 'Collect reviews on autopilot.', desc: 'Ask happy customers for a review after delivery, and catch unhappy ones before they post.',
      chat: [
        { time: 'Friday 10:00 AM', sys: ['Triggered by', 'Delivered + 3 days'] },
        { card: { title: 'How was your order?', badge: 'Review', rows: [['Item', 'Tech T-shirt · Black']], body: ['Hi Emma, how do you like your Tech T-shirt? Tap a star to rate it.'], actions: ['★★★★★', 'Not great'] } },
        { user: '★★★★★ love it, super soft' },
        { agent: 'Thank you Emma! Your review is live. Here\'s 10% off your next order: <strong>THANKS10</strong>' },
      ] },
    { name: 'Win-back', hue: 'yellow', icon: 'loop', title: 'Bring lapsed customers back.', desc: 'A personal message for customers who haven\'t ordered in a while, based on what they bought before.',
      chat: [
        { time: 'Monday 10:00 AM', sys: ['Triggered by', '90 days without an order'] },
        { card: { title: 'Picked for you', badge: '−15%', tone: 'accent', rows: [['For', 'Lucas Martin'], ['Pairs with', 'Your Tech T-shirt']], body: ['Hey Lucas, it\'s been a while! The black Trousers match your Tech T-shirt. Here\'s 15% off this week.'], actions: ['See the Trousers', 'Not now'] } },
        { user: 'nice, do you have them in 30?' },
        { agent: 'Yes, size 30 is in stock. Your 15% is applied at checkout.' },
        { user: 'ordered!' },
      ] },
  ];

  const jobPills = $('#jobPills'), jobDesc = $('#jobDesc'), transcript = $('#botTranscript');
  if (jobPills && transcript) {
    const ROWS = [[0, 1, 2], [3, 4], [5, 6]];
    jobPills.innerHTML = ROWS.map((row) => `<div class="jobs__row">${row.map((i) => {
      const j = JOBS[i];
      return `<button type="button" class="jpill" aria-pressed="${i === 0}" data-i="${i}" style="${hueVars(j.hue)}"><span class="jpill__slot">${avatar(j)}</span>${j.name}</button>`;
    }).join('')}</div>`).join('');

    const card = (c) => `<div class="bot-card"><div class="bot-card__head"><span class="bot-card__title">${c.title}</span><span class="bot-card__badge"${c.tone ? ` data-tone="${c.tone}"` : ''}>${c.badge}</span></div>`
      + `<dl class="bot-panel">${c.rows.map(([k, v]) => `<div class="bot-panel__row"><dt>${k}</dt><dd>${v}</dd></div>`).join('')}<div class="bot-panel__body">${c.body.map((t) => `<p>${t}</p>`).join('')}</div></dl>`
      + `<div class="bot-card__actions"><span class="bot-card__action bot-card__action--primary">${c.actions[0]}</span><span class="bot-card__action bot-card__action--secondary">${c.actions[1]}</span></div></div>`;
    const entryHtml = (e) => {
      let inner = '';
      if (e.time) inner += `<div class="bot-time">${e.time}</div>`;
      if (e.user) inner += `<div class="bot-msg bot-msg--user">${e.user}</div>`;
      if (e.agent) inner += `<div class="bot-msg bot-msg--agent">${e.agent}</div>`;
      if (e.sys) inner += `<div class="bot-sys"><span>${e.sys[0]}</span>${routineIco}<b>${e.sys[1]}</b></div>`;
      if (e.card) inner += card(e.card);
      return inner;
    };
    const kind = (e) => (e.user ? 'user' : e.sys ? 'sys' : 'agent');

    let scrollRaf = 0;
    const scrollToEnd = (animate) => {
      cancelAnimationFrame(scrollRaf);
      const end = transcript.scrollHeight - transcript.clientHeight;
      if (!animate || reduced) { transcript.scrollTop = end; return; }
      const from = transcript.scrollTop, t0 = performance.now(), dur = 1000;
      const step = (now) => {
        const p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 3);
        transcript.scrollTop = from + (end - from) * e;
        if (p < 1) scrollRaf = requestAnimationFrame(step);
      };
      scrollRaf = requestAnimationFrame(step);
    };

    const renderJob = (i, animate) => {
      const j = JOBS[i];
      $$('.jpill', jobPills).forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.i === i)));
      const bot = $('#bot');
      bot.setAttribute('style', hueVars(j.hue));
      transcript.innerHTML = `<div class="bot__list${animate ? ' is-mounting' : ''}">${j.chat.map((e, k) => {
        const cont = k > 0 && !e.time && kind(e) === 'agent' && kind(j.chat[k - 1]) === 'agent';
        return `<div class="bot-entry${cont || k === 0 ? '' : ' mt'}"${animate ? '' : ' style="animation:none"'}>${entryHtml(e)}</div>`;
      }).join('')}</div>`;
      transcript.scrollTop = 0;
      if (animate) requestAnimationFrame(() => scrollToEnd(true)); else scrollToEnd(false);
      const html = `<strong>${j.title}</strong> <span>${j.desc}</span>`;
      if (!animate) { jobDesc.innerHTML = html; return; }
      jobDesc.classList.add('is-swapping');
      setTimeout(() => { jobDesc.innerHTML = html; jobDesc.classList.remove('is-swapping'); }, 180);
    };

    jobPills.addEventListener('click', (e) => {
      const b = e.target.closest('.jpill');
      if (b && b.getAttribute('aria-pressed') !== 'true') renderJob(+b.dataset.i, true);
    });
    renderJob(0, false);
    // Première apparition : le fil se monte et défile jusqu'en bas, comme au changement de pastille
    const jobsIO = new IntersectionObserver(([en]) => {
      if (!en.isIntersecting) return;
      jobsIO.disconnect();
      const cur = +$('.jpill[aria-pressed="true"]', jobPills).dataset.i;
      setTimeout(() => renderJob(cur, true), 350);
    }, { threshold: 0.45 });
    jobsIO.observe($('.iphone'));
  }

  /* ---------------- Video lightbox ---------------- */
  const lb = $('#lightbox'), frame = $('#lightboxFrame'), video = $('#video');
  // Aperçu muet en boucle : se lance quand la carte est à l'écran, se met en pause sinon
  const preview = $('#videoPreview');
  let previewOn = false;
  const syncPreview = () => { if (!preview) return; if (previewOn && !lb.open) preview.play().catch(() => {}); else preview.pause(); };
  if (preview && !reduced) {
    new IntersectionObserver(([en]) => { previewOn = en.isIntersecting; syncPreview(); }, { threshold: 0.25 }).observe(video);
  }
  video.addEventListener('click', () => {
    preview?.pause();
    const src = video.dataset.src;
    frame.innerHTML = `<video src="${src}" controls autoplay playsinline></video>`;
    const v = frame.querySelector('video');
    v.addEventListener('error', () => { frame.innerHTML = '<p>This video can\'t be played in this browser.</p>'; });
    if (typeof lb.showModal === 'function') lb.showModal(); else lb.setAttribute('open', '');
  });
  const closeLb = () => { lb.close?.(); lb.removeAttribute('open'); frame.innerHTML = ''; syncPreview(); };
  $('.lightbox__close').addEventListener('click', closeLb);
  lb.addEventListener('click', (e) => { if (e.target === lb) closeLb(); });
  lb.addEventListener('close', () => { frame.innerHTML = ''; syncPreview(); });

  /* ---------------- Pricing ---------------- */
  const PLANS = [
    { name: 'Pro', price: 89, cta: 'Choose Pro', dark: false,
      inc: 'What you get:', items: ['1 user', 'Widget chat & inbox', 'Abandoned cart recovery', 'WhatsApp campaigns', 'AI agent', 'Segments & multi-market', 'Kanal MCP', 'Klaviyo, Recharge, Crisp & Gorgias'] },
    { name: 'Scale', price: 149, badge: 'Most popular', cta: 'Choose Scale', dark: true, featured: true,
      inc: 'Everything in Pro, plus:', items: ['5 users', 'Unlimited automations', 'Advanced automations: A/B tests, Shopify conditions, discount codes, API', 'Extra markets at +50€/mo each', 'Dedicated account manager'] },
    { name: 'Business', price: 350, cta: 'Choose Business', dark: false,
      inc: 'Everything in Scale, plus:', items: ['Unlimited users', 'Flow setup by our experts', 'Continuous optimization', 'Campaigns on demand'] },
  ];
  const BILLING = [['Monthly', 1, 'No commitment'], ['Yearly −10%', 0.9, 'Billed yearly']];
  const eurPrice = (n) => (Number.isInteger(n) ? fmt.format(n) : n.toFixed(2)) + '€';
  const plansEl = $('#plans');
  const tick = '<svg viewBox="0 0 16 16"><path d="M3.5 8.5 6.5 11.5 12.5 4.5"/></svg>';
  plansEl.innerHTML = PLANS.map((p, i) => `
    <article class="plan reveal reveal--up${p.featured ? ' plan--featured' : ''}" style="--d:${i}" data-i="${i}">
      <div class="plan__top"><span class="plan__name">${p.name}</span>
        <div class="seg" role="group" aria-label="Billing">${BILLING.map((t, k) => `<button aria-pressed="${k === 0}" data-k="${k}">${t[0]}</button>`).join('')}</div>
      </div>
      <div class="plan__price"><span class="plan__amount">0€</span><span class="plan__unit">/ month</span></div>
      <div class="plan__bill"><span></span>${p.badge ? `<span class="plan__badge">${p.badge}</span>` : ''}</div>
      <a href="https://apps.shopify.com/kanal-marketing-ai" target="_blank" rel="noopener" class="btn btn--lg ${p.dark ? 'btn--dark' : 'btn--soft'}">${p.cta}</a>
      <div class="plan__inc">${p.inc}</div>
      <ul>${p.items.map((it) => `<li>${tick}${it}</li>`).join('')}</ul>
    </article>`).join('');
  $$('.plan', plansEl).forEach((el) => revealIO.observe(el));
  const renderPrice = (el, animate) => {
    const p = PLANS[+el.dataset.i];
    const [, factor, bill] = BILLING[+($('.seg [aria-pressed="true"]', el).dataset.k)];
    const amt = $('.plan__amount', el);
    amt.textContent = eurPrice(Math.round(p.price * factor * 100) / 100);
    if (animate) { amt.classList.remove('is-ticking'); void amt.offsetWidth; amt.classList.add('is-ticking'); }
    $('.plan__bill span', el).textContent = bill;
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
