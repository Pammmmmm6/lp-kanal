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
      const open = !item.classList.contains('is-open');
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
  const fmt = new Intl.NumberFormat('fr-FR');
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
      const counters = $$('[data-count]', card);
      Promise.all(counters.map((c) => countUp(c))).then(() => $('.segment', card)?.classList.add('is-done'));
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
  const peekSize = () => { const s = peek.getBoundingClientRect().width / 200 * 7; $$('.peek__pupil', peek).forEach((p) => p.setAttribute('r', String(Math.max(4, 7 - s * .1)))); };
  peekSize();
  const onPeek = () => {
    const r = peek.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, (innerHeight - r.top) / (r.height + innerHeight * 0.25)));
    peek.style.setProperty('--peek', p.toFixed(3));
  };
  window.addEventListener('scroll', onPeek, { passive: true });
  onPeek();

  /* ---------------- Hero app: threads + animated conversation ---------------- */
  const COLORS = ['#12b76a', '#f59e0b', '#8b5cf6', '#3b82f6', '#ef6c4a', '#14b8a6', '#ec4899'];
  const avatar = (c) => `<svg viewBox="0 0 200 200"><use href="#bubble" fill="${c}"/><ellipse cx="74" cy="92" rx="15" ry="20" fill="#fff"/><ellipse cx="126" cy="92" rx="15" ry="20" fill="#fff"/><circle cx="78" cy="97" r="8" fill="#0b0b0c"/><circle cx="130" cy="97" r="8" fill="#0b0b0c"/></svg>`;

  const THREADS = [
    {
      name: 'Relance panier', time: '09:41', prev: 'Commande #4821 attribuée · 129 €', color: COLORS[0], status: 'Actif',
      script: [
        { sys: '<b>Automatisation</b> · Panier abandonné déclenchée pour Marie D.' },
        { out: 'Bonjour Marie 👋 Vous avez laissé la <b>Veste Lin Sable</b> dans votre panier. Elle est encore disponible en M.' },
        { in: 'Ah oui ! Elle taille comment ?' },
        { out: 'Plutôt ajusté, prenez votre taille habituelle. Voici -10 % valable 24 h : <code>SABLE10</code>', typing: 1400 },
        { in: 'Parfait, je commande 🙌' },
        { sys: '<b>Commande #4821</b> · 129 € attribuée à Relance panier' },
      ],
    },
    {
      name: 'Agent IA · Inbox', time: '09:12', prev: 'Répondu en 4 s · livraison Lyon', color: COLORS[3], status: 'En ligne',
      script: [
        { sys: '<b>Nouveau message</b> · Thomas L.' },
        { in: 'Bonjour, vous livrez en Belgique ?' },
        { out: 'Bonjour Thomas ! Oui, en 3 à 4 jours ouvrés, et c\'est offert dès 80 € 🇧🇪', typing: 1200 },
        { in: 'Top. Et le pull Côtes en bleu, il revient quand ?' },
        { out: 'Retour prévu le 21. Je vous préviens ici dès qu\'il est en ligne ?', typing: 1300 },
        { in: 'Oui merci !' },
        { sys: 'Thomas L. ajouté au flow <b>Retour en stock</b>' },
      ],
    },
    {
      name: 'Campagne · Soldes VIP', time: 'Hier', prev: '12 480 envoyés · 94 % lus', color: COLORS[1], status: 'Envoyée',
      script: [
        { sys: '<b>Campagne</b> envoyée à 12 480 contacts · segment VIP' },
        { out: '☀️ Les soldes commencent, et vous avez 24 h d\'avance. -30 % sur toute la collection lin.' },
        { in: 'Je peux cumuler avec ma carte fidélité ?' },
        { out: 'Oui, les points restent crédités sur chaque commande 💚', typing: 1100 },
        { sys: '<b>18 240 €</b> de revenu attribué · ROI x34' },
      ],
    },
    { name: 'Bienvenue', time: 'Hier', prev: '+312 opt-ins cette semaine', color: COLORS[2] },
    { name: 'Retour en stock', time: 'Lun.', prev: '48 contacts en attente', color: COLORS[5] },
    { name: 'Demande d\'avis', time: 'Lun.', prev: '4,8 ★ moyenne sur 210 avis', color: COLORS[4] },
    { name: 'Anniversaire client', time: 'Dim.', prev: 'Code cadeau envoyé à 37 clients', color: COLORS[6] },
  ];

  const list = $('#threads'), chat = $('#chat'), composer = $('#composer');
  let current = 0, runId = 0;

  list.innerHTML = THREADS.map((t, i) => `
    <li class="thread${i === 0 ? ' is-active' : ''}" data-i="${i}" role="button" tabindex="0">
      <span class="thread__av">${avatar(t.color)}</span>
      <span class="thread__name">${t.name}</span><span class="thread__time">${t.time}</span>
      <span class="thread__prev">${t.prev}</span>
    </li>`).join('');

  const scriptFor = (i) => THREADS[i].script || [
    { sys: `<b>${THREADS[i].name}</b> · flow actif` },
    { out: 'Bienvenue chez Maison Sable 💚 Pour fêter ça, voici -10 % sur votre première commande : <code>HELLO10</code>' },
    { in: 'Merci beaucoup !' },
    { sys: THREADS[i].prev },
  ];

  const add = (html, cls) => {
    const el = document.createElement('div');
    el.className = `msg ${cls}`;
    el.innerHTML = html;
    chat.appendChild(el);
    while (chat.children.length > 7) chat.firstElementChild.remove();
    return el;
  };

  const typeIn = async (text, id) => {
    composer.classList.add('is-typing');
    const plain = text.replace(/<[^>]+>/g, '');
    for (let i = 1; i <= plain.length; i++) {
      if (id !== runId) return false;
      composer.textContent = plain.slice(0, i);
      await wait(22 + Math.random() * 30);
    }
    await wait(250);
    composer.textContent = 'Écrire un message…';
    composer.classList.remove('is-typing');
    return true;
  };

  const play = async (i) => {
    const id = ++runId;
    const t = THREADS[i];
    $('#threadTitle').textContent = t.name;
    $('#threadDot').style.background = t.color;
    $('#threadStatus').lastChild.textContent = t.status || 'Actif';
    $$('.msg', chat).forEach((m) => m.classList.add('is-leaving'));
    await wait(350);
    if (id !== runId) return;
    chat.innerHTML = '';
    for (const step of scriptFor(i)) {
      if (id !== runId) return;
      if (step.sys) { add(step.sys, 'msg--sys'); await wait(900); continue; }
      if (step.in) {
        if (!reduced) { if (!(await typeIn(step.in, id))) return; }
        add(step.in, 'msg--in'); await wait(900); continue;
      }
      if (step.out) {
        if (!reduced) {
          const typing = add('<i></i><i></i><i></i>', 'msg--typing');
          await wait(step.typing || 1000);
          typing.remove();
        }
        if (id !== runId) return;
        add(step.out + '<span class="msg__meta">Kanal · ✓✓</span>', 'msg--out'); await wait(1100);
      }
    }
    await wait(3200);
    if (id === runId) select((i + 1) % 3);
  };

  const select = (i) => {
    current = i;
    $$('.thread', list).forEach((el) => el.classList.toggle('is-active', +el.dataset.i === i));
    play(i);
  };
  list.addEventListener('click', (e) => { const li = e.target.closest('.thread'); if (li) select(+li.dataset.i); });
  list.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target.classList.contains('thread')) { e.preventDefault(); select(+e.target.dataset.i); } });

  // Search filters threads
  $('.app__search input').addEventListener('input', (e) => {
    const q = e.target.value.trim().toLowerCase();
    $$('.thread', list).forEach((el) => { el.style.display = THREADS[+el.dataset.i].name.toLowerCase().includes(q) ? '' : 'none'; });
  });

  // Start the conversation when the mockup is visible
  const appIO = new IntersectionObserver((en) => { if (en[0].isIntersecting) { appIO.disconnect(); setTimeout(() => select(0), 600); } }, { threshold: 0.3 });
  appIO.observe($('#app'));

  /* ---------------- Flow chips + phone preview ---------------- */
  const FLOWS = [
    { name: 'Panier abandonné', title: 'Récupérez les ventes perdues.', desc: 'Relance 1 h après l\'abandon avec le produit, sa photo et un lien direct vers le panier, puis un code si rien ne bouge sous 24 h.',
      msgs: [{ img: 'linear-gradient(135deg,#e8cfb0,#c69c72)', text: 'Votre <b>Veste Lin Sable</b> vous attend 👀 Il reste 3 pièces en M.', btn: 'Finaliser ma commande' }] },
    { name: 'Bienvenue', title: 'Transformez un opt-in en première commande.', desc: 'Un message de bienvenue chaleureux, un code de première commande et une question pour mieux connaître le nouveau contact.',
      msgs: [{ text: 'Bienvenue chez Maison Sable 💚 Voici -10 % sur votre première commande : <b>HELLO10</b>', btn: 'Découvrir la collection' }, { out: true, text: 'Merci ! 😍' }] },
    { name: 'Retour en stock', title: 'Prévenez les clients qui attendent.', desc: 'Dès qu\'un produit revient, Kanal prévient chaque contact inscrit, dans l\'ordre d\'inscription, avant tout le monde.',
      msgs: [{ img: 'linear-gradient(135deg,#9ab7d6,#3d5f8c)', text: 'Bonne nouvelle Thomas : le <b>Pull Côtes Bleu</b> est de retour en L.', btn: 'Je le prends' }] },
    { name: 'Demande d\'avis', title: 'Collectez des avis sans effort.', desc: '7 jours après la livraison, une question simple. Les clients satisfaits sont redirigés vers votre page d\'avis.',
      msgs: [{ text: 'Votre commande est bien arrivée ? Comment la trouvez-vous ? ⭐️', btn: 'Laisser un avis' }, { out: true, text: 'Parfaite, le lin est super doux' }] },
    { name: 'Relance VIP', title: 'Choyez vos meilleurs clients.', desc: 'Accès anticipé aux collections et aux soldes pour le segment VIP, calculé automatiquement sur la valeur client.',
      msgs: [{ img: 'linear-gradient(135deg,#f3c9a8,#e07a5f)', text: 'Accès VIP ✨ La collection été est en ligne pour vous, 24 h avant tout le monde.', btn: 'Voir en avant-première' }] },
    { name: 'Anniversaire', title: 'Une attention qui fait vendre.', desc: 'Le jour J, un message personnalisé avec un cadeau. Simple, rentable et apprécié.',
      msgs: [{ text: 'Joyeux anniversaire Camille 🎂 Un cadeau vous attend : -20 % toute la semaine avec <b>BDAY20</b>.', btn: 'Utiliser mon cadeau' }] },
    { name: 'Cross-sell', title: 'Suggérez le bon produit ensuite.', desc: 'Après un achat, recommandez le complément logique au moment où le client est le plus réceptif.',
      msgs: [{ img: 'linear-gradient(135deg,#d6e4c4,#8aa66b)', text: 'Votre veste se marie parfaitement avec le <b>Pantalon Lin Olive</b>.', btn: 'Compléter la tenue' }] },
  ];
  const chips = $('#chips'), desc = $('#flowDesc'), phone = $('#phoneBody');
  chips.innerHTML = FLOWS.map((f, i) => `<button class="chip" role="tab" aria-selected="${i === 0}" data-i="${i}"><span class="mini-bubble"></span>${f.name}</button>`).join('');
  let flowTimer, flowIdx = 0;
  const renderFlow = (i, user) => {
    flowIdx = i;
    $$('.chip', chips).forEach((c) => c.setAttribute('aria-selected', String(+c.dataset.i === i)));
    desc.classList.add('is-swapping');
    setTimeout(() => {
      desc.innerHTML = `<strong>${FLOWS[i].title}</strong> ${FLOWS[i].desc}`;
      desc.classList.remove('is-swapping');
    }, 200);
    phone.innerHTML = '';
    FLOWS[i].msgs.forEach((m, k) => {
      const el = document.createElement('div');
      el.className = 'wa' + (m.out ? ' wa--out' : '');
      el.style.animationDelay = `${k * 0.5 + 0.1}s`;
      el.innerHTML = (m.img ? `<div class="wa__img" style="--img:${m.img}"></div>` : '') + m.text + `<time>10:${12 + k}${m.out ? ' ✓✓' : ''}</time>` + (m.btn ? `<span class="wa__btn">↗ ${m.btn}</span>` : '');
      phone.appendChild(el);
    });
    clearInterval(flowTimer);
    if (!user && !reduced) flowTimer = setInterval(() => renderFlow((flowIdx + 1) % FLOWS.length), 5000);
  };
  chips.addEventListener('click', (e) => { const c = e.target.closest('.chip'); if (c) renderFlow(+c.dataset.i, true); });
  renderFlow(0);
  // pause autoplay while hovering
  $('#flows').addEventListener('mouseenter', () => clearInterval(flowTimer));

  /* ---------------- Video lightbox ---------------- */
  const lb = $('#lightbox'), frame = $('#lightboxFrame'), video = $('#video');
  video.addEventListener('click', () => {
    const src = video.dataset.src;
    frame.innerHTML = `<video src="${src}" controls autoplay playsinline></video>`;
    const v = frame.querySelector('video');
    v.addEventListener('error', () => { frame.innerHTML = '<p>Ajoutez votre vidéo de démonstration dans <code>assets/demo.mp4</code>.</p>'; });
    if (typeof lb.showModal === 'function') lb.showModal(); else lb.setAttribute('open', '');
  });
  const closeLb = () => { lb.close?.(); lb.removeAttribute('open'); frame.innerHTML = ''; };
  $('.lightbox__close').addEventListener('click', closeLb);
  lb.addEventListener('click', (e) => { if (e.target === lb) closeLb(); });
  lb.addEventListener('close', () => { frame.innerHTML = ''; });

  /* ---------------- Pricing ---------------- */
  const PLANS = [
    { name: 'Starter', tiers: [['1k', 49], ['5k', 99], ['10k', 179]], unit: 'contacts', cta: 'Démarrer Starter', dark: true,
      inc: 'Inclus :', items: ['Campagnes illimitées', 'Inbox partagée', '3 automatisations actives', 'Segments dynamiques', 'Attribution des ventes'] },
    { name: 'Growth', tiers: [['10k', 249], ['25k', 449], ['50k', 749]], unit: 'contacts', cta: 'Démarrer Growth', dark: true, featured: true,
      inc: 'Tout Starter, plus :', items: ['Agent IA dans l\'inbox', 'Automatisations illimitées', 'Tests A/B de templates', 'Intégration Klaviyo', 'Support prioritaire'] },
    { name: 'Agences', tiers: [['5 comptes', 590], ['15 comptes', 1490]], unit: '', cta: 'Parler à l\'équipe', dark: false,
      inc: 'Tout Growth, plus :', items: ['Multi-comptes clients', 'Reporting en marque blanche', 'Rôles et permissions', 'Account manager dédié'] },
  ];
  const plansEl = $('#plans');
  let yearly = false;
  const tick = '<svg viewBox="0 0 14 14"><path d="M2.5 7.5 5.5 10.5 11.5 3.5"/></svg>';
  plansEl.innerHTML = PLANS.map((p, i) => `
    <article class="plan reveal reveal--up${p.featured ? ' plan--featured' : ''}" style="--d:${i}" data-i="${i}">
      <div class="plan__top"><span class="plan__name">${p.name}</span>
        <div class="seg" role="group" aria-label="Volume">${p.tiers.map((t, k) => `<button aria-pressed="${k === 0}" data-k="${k}">${t[0]}</button>`).join('')}</div>
      </div>
      <div class="plan__price"><span class="plan__amount">0 €</span><span class="plan__unit">/ mois</span></div>
      <div class="plan__bill"></div>
      <a href="#cta" class="btn ${p.dark ? 'btn--dark' : 'btn--soft'}">${p.cta}</a>
      <div class="plan__inc">${p.inc}</div>
      <ul>${p.items.map((it) => `<li>${tick}${it}</li>`).join('')}</ul>
    </article>`).join('');
  $$('.plan', plansEl).forEach((el) => revealIO.observe(el));
  const renderPrice = (el, animate) => {
    const p = PLANS[+el.dataset.i];
    const k = +($('.seg [aria-pressed="true"]', el).dataset.k);
    const [label, base] = p.tiers[k];
    const price = yearly ? Math.round(base * 0.8) : base;
    const amt = $('.plan__amount', el);
    amt.textContent = `${fmt.format(price)} €`;
    if (animate) { amt.classList.remove('is-ticking'); void amt.offsetWidth; amt.classList.add('is-ticking'); }
    $('.plan__bill', el).textContent = `${yearly ? 'Facturé annuellement' : 'Facturé mensuellement'} · ${label}${p.unit ? ' ' + p.unit : ''}`;
  };
  $$('.plan', plansEl).forEach((el) => {
    renderPrice(el);
    $('.seg', el).addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      $$('.seg button', el).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      renderPrice(el, true);
    });
  });
  $$('.billing button').forEach((b) => b.addEventListener('click', () => {
    yearly = b.dataset.billing === 'yearly';
    $$('.billing button').forEach((x) => x.setAttribute('aria-selected', String(x === b)));
    $$('.plan', plansEl).forEach((el) => renderPrice(el, true));
  }));

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
