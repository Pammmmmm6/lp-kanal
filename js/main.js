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

  /* ---------------- Hero : agents + conversation animée ---------------- */
  const C = { teal: '#0093a3', amber: '#e8a33a', purple: '#5a3fa0', blue: '#6c6ccb', red: '#dd2229', orange: '#e8833a', ink: '#252525' };
  const avatar = (c) => `<svg viewBox="0 0 200 200"><use href="#bubble" fill="${c}"/><ellipse cx="74" cy="92" rx="15" ry="20" fill="#fff"/><ellipse cx="126" cy="92" rx="15" ry="20" fill="#fff"/><circle cx="78" cy="97" r="8" fill="#0a0a0a"/><circle cx="130" cy="97" r="8" fill="#0a0a0a"/></svg>`;

  const THREADS = [
    {
      name: 'Synthèse comité', time: '16:20', prev: 'Note partagée avec les participants', color: C.amber,
      script: [
        { user: 'Prépare la note de synthèse du comité de jeudi à partir des trois derniers comptes rendus.' },
        { out: 'Je lis les comptes rendus des 12, 19 et 26 septembre, puis je regroupe les décisions par sujet.', typing: 1300 },
        { out: 'Synthèse prête :<ul><li>4 décisions validées</li><li>2 points en attente d\'arbitrage</li><li>1 risque budgétaire à remonter</li></ul>', typing: 1600 },
        { user: 'Parfait, ajoute un tableau des responsables.' },
        { out: 'Ajouté. La note est dans le dossier « Comités » et partagée avec les participants.', typing: 1200, done: true },
      ],
    },
    {
      name: 'Analyse ventes T3', time: '14:05', prev: 'Tableau mis à jour, 2 anomalies', color: C.teal,
      script: [
        { user: 'Compare les ventes du T3 à celles du T2, par région.' },
        { out: 'Export récupéré depuis l\'outil de BI. Je croise avec les objectifs régionaux.', typing: 1300 },
        { out: 'Hausse de 8 % au global. Deux anomalies : Grand Est à -14 %, et des commandes en double le 3 août. Je corrige le doublon ?', typing: 1600 },
        { user: 'Oui, et mets le tableau à jour.' },
        { out: 'C\'est fait. Le tableau est partagé avec la direction commerciale.', typing: 1100, done: true },
      ],
    },
    {
      name: 'Traduction catalogue', time: '13:12', prev: '212 fiches traduites en allemand', color: C.purple,
      script: [
        { user: 'Traduis les fiches produits de la collection hiver en allemand.' },
        { out: '212 fiches trouvées. J\'applique votre glossaire technique et le ton de la marque.', typing: 1400 },
        { out: 'Traduction terminée. 6 termes sans équivalent direct sont signalés pour relecture.', typing: 1500, done: true },
      ],
    },
    { name: 'Veille réglementaire', time: '11:47', prev: 'Nouveau décret repéré, résumé prêt', color: C.red },
    { name: 'Onboarding', time: '10:30', prev: 'Comptes créés pour Inès et Malik', color: C.blue },
    { name: 'Factures fournisseurs', time: 'Hier', prev: '18 factures rapprochées', color: C.orange },
    { name: 'Préparation salon', time: 'Lun.', prev: 'Stand confirmé, visuels en cours', color: C.ink },
  ];

  const list = $('#threads'), chat = $('#chat'), composer = $('#composer'), status = $('#threadStatus');
  let runId = 0;

  list.innerHTML = THREADS.map((t, i) => `
    <li class="thread${i === 0 ? ' is-active' : ''}" data-i="${i}" role="button" tabindex="0">
      <span class="thread__av">${avatar(t.color)}</span>
      <span class="thread__name">${t.name}</span><span class="thread__time">${t.time}</span>
      <span class="thread__prev">${t.prev}</span>
    </li>`).join('');

  const scriptFor = (i) => THREADS[i].script || [
    { user: `Où en es-tu ?` },
    { out: `${THREADS[i].prev}. Je vous préviens dès que la prochaine étape demande votre validation.`, typing: 1200, done: true },
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
    for (let i = 1; i <= text.length; i++) {
      if (id !== runId) return false;
      composer.textContent = text.slice(0, i);
      await wait(18 + Math.random() * 26);
    }
    await wait(250);
    composer.textContent = 'Écrire à l\'agent…';
    composer.classList.remove('is-typing');
    return true;
  };

  const setStatus = (done) => {
    status.classList.toggle('is-done', done);
    status.lastElementChild.textContent = done ? 'Terminé' : 'En cours';
  };

  const play = async (i) => {
    const id = ++runId;
    const t = THREADS[i];
    $('#threadTitle').textContent = t.name;
    $('#threadAv').innerHTML = avatar(t.color);
    setStatus(false);
    $$('.msg', chat).forEach((m) => m.classList.add('is-leaving'));
    await wait(350);
    if (id !== runId) return;
    chat.innerHTML = '';
    for (const step of scriptFor(i)) {
      if (id !== runId) return;
      if (step.user) {
        if (!reduced && !(await typeIn(step.user, id))) return;
        add(step.user, 'msg--user'); await wait(700); continue;
      }
      if (!reduced) {
        const typing = add('<i></i><i></i><i></i>', 'msg--typing');
        await wait(step.typing || 1000);
        typing.remove();
      }
      if (id !== runId) return;
      add(`<span class="msg__meta"><span class="dot-av" style="--c:${t.color}"></span>${t.name}</span>${step.out}`, 'msg--out');
      if (step.done) setStatus(true);
      await wait(1100);
    }
    await wait(3400);
    if (id === runId) select((i + 1) % 3);
  };

  const select = (i) => {
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

  /* ---------------- Rôles (chips) ---------------- */
  const ROLES = [
    { name: 'Appels d\'offres', color: '#0093a3', title: 'Des réponses prêtes avant l\'échéance.', desc: 'Analyse le cahier des charges, réunit les pièces administratives et rédige un mémoire technique à partir de vos réponses passées.' },
    { name: 'Onboarding', color: '#6c6ccb', title: 'Une arrivée sans oubli.', desc: 'Crée les comptes, commande le matériel, planifie les rendez-vous de la première semaine et envoie le livret d\'accueil.' },
    { name: 'Analyse de données', color: '#dd2229', title: 'Des questions, des graphiques.', desc: 'Interroge vos sources, nettoie les données et livre un graphique commenté en réponse à une question en français.' },
    { name: 'Traduction', color: '#e8833a', title: 'Vos contenus dans toutes les langues.', desc: 'Traduit pages, fiches et documents en respectant votre glossaire, puis signale les passages à faire relire.' },
    { name: 'Veille réglementaire', color: '#5a3fa0', title: 'Les textes qui vous concernent, résumés.', desc: 'Suit les publications officielles de votre secteur et vous résume chaque nouveauté avec son impact concret.' },
    { name: 'Gestion des stocks', color: '#252525', title: 'Jamais en rupture.', desc: 'Surveille les niveaux, anticipe les besoins selon les ventes et prépare les bons de commande à valider.' },
    { name: 'Préparation de réunions', color: '#e8a33a', title: 'Arrivez en réunion avec le dossier.', desc: 'Rassemble les documents utiles, propose un ordre du jour et prépare les questions ouvertes depuis la dernière séance.' },
  ];
  const chips = $('#chips'), desc = $('#roleDesc');
  chips.innerHTML = ROLES.map((r, i) => `<button class="chip" role="tab" aria-selected="${i === 0}" data-i="${i}"><span class="dot-av" style="--c:${r.color}"></span>${r.name}</button>`).join('');
  let roleTimer, roleIdx = 0;
  const renderRole = (i, user) => {
    roleIdx = i;
    $$('.chip', chips).forEach((c) => c.setAttribute('aria-selected', String(+c.dataset.i === i)));
    desc.classList.add('is-swapping');
    setTimeout(() => { desc.innerHTML = `<strong>${ROLES[i].title}</strong> ${ROLES[i].desc}`; desc.classList.remove('is-swapping'); }, 200);
    clearInterval(roleTimer);
    if (!user && !reduced) roleTimer = setInterval(() => renderRole((roleIdx + 1) % ROLES.length), 4500);
  };
  chips.addEventListener('click', (e) => { const c = e.target.closest('.chip'); if (c) renderRole(+c.dataset.i, true); });
  renderRole(0);
  $('#roles').addEventListener('mouseenter', () => clearInterval(roleTimer));

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
    { name: 'Essentiel', tiers: [['3 agents', 15], ['10 agents', 39]], cta: 'Choisir Essentiel', dark: true,
      inc: 'Comprend :', items: ['Jusqu\'à 3 agents actifs', 'Historique de 30 jours', 'Intégrations standard', 'Application ordinateur et mobile', 'Support par e-mail'] },
    { name: 'Pro', tiers: [['Standard', 49], ['Intensif', 129]], cta: 'Choisir Pro', dark: true,
      inc: 'Tout Essentiel, plus :', items: ['Agents illimités', 'Exécution en parallèle', 'Routines et déclencheurs avancés', 'Historique illimité', 'Support prioritaire'] },
    { name: 'Entreprise', tiers: [['Équipe', 35], ['Scale', 65]], unit: '/ utilisateur / mois', cta: 'Parler à l\'équipe', dark: false,
      inc: 'Tout Pro, plus :', items: ['SSO et provisionnement SCIM', 'Journal d\'audit exportable', 'Données hébergées dans l\'UE', 'Accompagnement dédié'] },
  ];
  const plansEl = $('#plans');
  const tick = '<svg viewBox="0 0 14 14"><path d="M2.5 7.5 5.5 10.5 11.5 3.5"/></svg>';
  plansEl.innerHTML = PLANS.map((p, i) => `
    <article class="plan reveal reveal--up${p.featured ? ' plan--featured' : ''}" style="--d:${i}" data-i="${i}">
      <div class="plan__top"><span class="plan__name">${p.name}</span>
        <div class="seg" role="group" aria-label="Volume">${p.tiers.map((t, k) => `<button aria-pressed="${k === 0}" data-k="${k}">${t[0]}</button>`).join('')}</div>
      </div>
      <div class="plan__price"><span class="plan__amount">0 €</span><span class="plan__unit">${p.unit || '/ mois'}</span></div>
      <div class="plan__bill"></div>
      <a href="#cta" class="btn ${p.dark ? 'btn--dark' : 'btn--soft'}">${p.cta}</a>
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
    amt.textContent = `${fmt.format(price)} €`;
    if (animate) { amt.classList.remove('is-ticking'); void amt.offsetWidth; amt.classList.add('is-ticking'); }
    $('.plan__bill', el).textContent = 'Facturé mensuellement';
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
    try { localStorage.setItem('nova-theme', next); } catch (e) {}
  });
})();
