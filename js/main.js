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

  /* ---------------- Hero : agents + conversation animée ---------------- */
  const C = { teal: '#2bb5a4', amber: '#f0a23b', purple: '#7b5ce0', blue: '#3b82f6', red: '#ef5a3c', orange: '#e8833a', ink: '#252525' };
  const avatar = (c) => `<svg viewBox="0 0 200 200"><use href="#bubble" fill="${c}"/><ellipse cx="74" cy="92" rx="15" ry="20" fill="#fff"/><ellipse cx="126" cy="92" rx="15" ry="20" fill="#fff"/><circle cx="78" cy="97" r="8" fill="#0a0a0a"/><circle cx="130" cy="97" r="8" fill="#0a0a0a"/></svg>`;
  const toolCard = (title, line) => `
    <div class="tool__top"><strong>${title}</strong><span class="badge badge--amber"><svg viewBox="0 0 12 12"><circle cx="6" cy="6" r="4.5" /><path d="M6 3.5V6l1.6 1" /></svg>Waiting</span></div>
    <p class="tool__line">${line}</p>
    <div class="tool__shot g3"><div class="login"><div class="login__dots"><i></i><i></i><i></i></div><div class="login__bar"></div><div class="login__logo"></div><div class="login__code"><i></i><i></i><i></i><i></i><i></i><i></i></div><div class="login__btn">Verify</div></div></div>
    <div class="tool__actions"><span class="pbtn pbtn--dark">Enter code</span><span class="pbtn pbtn--light">Later</span></div>`;

  const THREADS = [
    { name: 'Board summary', time: 'Fri', prev: 'Summary sent to all 9 attendees', color: C.teal },
    {
      name: 'Monthly report', time: '10:12 AM', prev: 'Waiting on a verification code', color: C.amber,
      script: [
        { time: 'Today, 10:12 AM' },
        { user: 'Put together the monthly sales report for the leadership meeting.\n\nStart from the September numbers, compare them with the budget and point out the three regions that are slipping.' },
        { agent: 'Starting from the tracking sheet. The West region figures are missing, so I\'m pulling them from the CRM.', typing: 1300 },
        { sys: 'Opened “Budget 2026.xlsx”' },
        { tool: ['Computer', 'The CRM wants a verification code it just texted to your phone.'], typing: 900 },
      ],
    },
    {
      name: 'Inbox triage', time: '8:50 AM', prev: 'Answered the 11 urgent emails', color: C.red,
      script: [
        { time: 'Today, 8:50 AM' },
        { user: 'Sort my inbox and deal with anything urgent.' },
        { agent: '142 emails handled: 96 archived, 31 filed by project, 11 answered.', typing: 1400 },
        { agent: 'The print shop quote needs your call: two paper stocks, $340 apart.', typing: 1200 },
        { sys: 'Routine saved: daily at 8:00 AM' },
      ],
    },
    {
      name: 'Catalog translation', time: 'Mon', prev: '212 product pages now in German', color: C.purple,
      script: [
        { time: 'Monday, 2:20 PM' },
        { user: 'Translate the winter collection product pages into German.' },
        { agent: 'Found 212 pages. Using your technical glossary and brand voice.', typing: 1400 },
        { agent: 'All done. 6 terms with no direct German equivalent are flagged for review.', typing: 1500 },
      ],
    },
    { name: 'Regulatory watch', time: '4:05 PM', prev: 'New labeling rule found, summary ready', color: C.blue },
    { name: 'Supplier invoices', time: '3:20 PM', prev: '18 invoices matched to bank records', color: C.orange },
    { name: 'Trade show prep', time: 'Tue', prev: 'Booth confirmed, artwork in progress', color: C.ink },
  ];

  const list = $('#threads'), chat = $('#chat'), composer = $('#composer');
  let runId = 0;

  list.innerHTML = THREADS.map((t, i) => `
    <li class="thread" data-i="${i}" role="button" tabindex="0">
      <span class="thread__av">${avatar(t.color)}</span>
      <span class="thread__name">${t.name}</span><span class="thread__time">${t.time}</span>
      <span class="thread__prev">${t.prev}</span>
    </li>`).join('');

  const scriptFor = (i) => THREADS[i].script || [
    { time: THREADS[i].time },
    { user: 'Status update?' },
    { agent: `${THREADS[i].prev}. I'll ping you as soon as a step needs your approval.`, typing: 1200 },
  ];

  const add = (html, cls) => {
    const el = document.createElement('div');
    el.className = `msg ${cls}`;
    el.innerHTML = html;
    chat.appendChild(el);
    while (chat.children.length > 8) chat.firstElementChild.remove();
    return el;
  };
  const esc = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;');

  const typeIn = async (text, id, placeholder) => {
    const line = text.split('\n')[0];
    composer.classList.add('is-typing');
    for (let i = 1; i <= line.length; i++) {
      if (id !== runId) return false;
      composer.textContent = line.slice(0, i);
      await wait(14 + Math.random() * 22);
    }
    await wait(250);
    composer.textContent = placeholder;
    composer.classList.remove('is-typing');
    return true;
  };

  const play = async (i) => {
    const id = ++runId;
    const t = THREADS[i];
    const placeholder = `Message ${t.name}`;
    $('#threadTitle').textContent = t.name;
    $('#threadAv').innerHTML = avatar(t.color);
    composer.textContent = placeholder;
    $$('.msg', chat).forEach((m) => m.classList.add('is-leaving'));
    await wait(350);
    if (id !== runId) return;
    chat.innerHTML = '';
    for (const step of scriptFor(i)) {
      if (id !== runId) return;
      if (step.time) { add(step.time, 'msg--time'); continue; }
      if (step.sys) { await wait(300); add(step.sys, 'msg--sys'); await wait(700); continue; }
      if (step.user) {
        if (!reduced && !(await typeIn(step.user, id, placeholder))) return;
        add(esc(step.user), 'msg--user'); await wait(700); continue;
      }
      if (!reduced && step.typing) {
        const typing = add('<i></i><i></i><i></i>', 'msg--typing');
        await wait(step.typing);
        typing.remove();
      }
      if (id !== runId) return;
      if (step.tool) add(toolCard(step.tool[0], step.tool[1]), 'msg--tool');
      else add(step.agent, 'msg--agent');
      await wait(1100);
    }
    await wait(4200);
    if (id === runId) select(i === 1 ? 2 : i === 2 ? 3 : 1);
  };

  const select = (i) => {
    $$('.thread', list).forEach((el) => el.classList.toggle('is-active', +el.dataset.i === i));
    play(i);
  };
  list.addEventListener('click', (e) => { const li = e.target.closest('.thread'); if (li) select(+li.dataset.i); });
  list.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target.classList.contains('thread')) { e.preventDefault(); select(+e.target.dataset.i); } });
  $('#threadSearch').addEventListener('input', (e) => {
    const q = e.target.value.trim().toLowerCase();
    $$('.thread', list).forEach((el) => { el.style.display = THREADS[+el.dataset.i].name.toLowerCase().includes(q) ? '' : 'none'; });
  });

  // Affiche tout de suite un état complet, puis anime quand la fenêtre est visible
  (() => {
    $$('.thread', list).forEach((el) => el.classList.toggle('is-active', el.dataset.i === '1'));
    $('#threadTitle').textContent = THREADS[1].name;
    $('#threadAv').innerHTML = avatar(THREADS[1].color);
    composer.textContent = `Message ${THREADS[1].name}`;
    THREADS[1].script.forEach((st) => {
      if (st.time) add(st.time, 'msg--time');
      else if (st.sys) add(st.sys, 'msg--sys');
      else if (st.user) add(esc(st.user), 'msg--user');
      else if (st.tool) add(toolCard(st.tool[0], st.tool[1]), 'msg--tool');
      else add(st.agent, 'msg--agent');
    });
    $$('.msg', chat).forEach((m) => { m.style.animation = 'none'; });
  })();
  const appIO = new IntersectionObserver((en) => { if (en[0].isIntersecting) { appIO.disconnect(); setTimeout(() => select(2), 5000); } }, { threshold: 0.3 });
  appIO.observe($('#app'));

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
    try { localStorage.setItem('nova-theme', next); } catch (e) {}
  });
})();
