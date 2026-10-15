/* =========================================================
   Page Kanal MCP : démo de conversation + « ce que vous pouvez demander »
   ========================================================= */
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  let ai = { name: 'Claude', logo: 'assets/ai/claude.svg' };
  const onAi = [];

  /* ---------------- Démo de conversation ---------------- */
  const win = $('#mcpDemo');
  if (win) {
    const tabs = $('.mwin__tabs', win), glider = $('.mwin__glider', tabs);
    const steps = $$('[data-step]', win);
    let run = 0, visible = false;

    const moveGlider = () => {
      const on = $('[aria-selected="true"]', tabs);
      glider.style.width = on.offsetWidth + 'px';
      glider.style.transform = `translateX(${on.offsetLeft}px)`;
    };

    const reset = () => { $$('.is-in, .is-typing', win).forEach((el) => el.classList.remove('is-in', 'is-typing')); };

    const play = async () => {
      const id = ++run;
      if (reduced) { win.classList.remove('is-playing'); return; }
      reset();
      win.classList.add('is-playing');
      await wait(500);
      for (const el of steps) {
        if (id !== run) return;
        el.classList.add('is-in');
        if (el.hasAttribute('data-typing')) {
          el.classList.add('is-typing');
          await wait(850);
          if (id !== run) return;
          el.classList.remove('is-typing');
        }
        if (el.classList.contains('mact')) {
          for (const a of $$('[data-act]', el)) {
            await wait(520);
            if (id !== run) return;
            a.classList.add('is-in');
          }
        }
        await wait(el.classList.contains('mmsg--user') ? 700 : 900);
      }
      await wait(6000);
      if (id === run && visible && !document.hidden) play();
    };

    tabs.addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn || btn.getAttribute('aria-selected') === 'true') return;
      $$('button', tabs).forEach((b) => b.setAttribute('aria-selected', String(b === btn)));
      moveGlider();
      ai = { name: btn.dataset.ai, logo: btn.dataset.logo };
      onAi.forEach((fn) => fn());
      play();
    });
    onAi.push(() => { $$('[data-ai-logo]', win).forEach((img) => { img.src = ai.logo; }); });

    $('#mcpReplay').addEventListener('click', play);
    moveGlider();
    document.fonts?.ready.then(moveGlider);
    window.addEventListener('resize', moveGlider);

    if (!reduced) win.classList.add('is-playing');
    new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        const was = visible;
        visible = en.isIntersecting;
        if (visible && !was && !$('.is-in', win)) play();
      });
    }, { threshold: 0.3 }).observe(win);
  }

  /* ---------------- Ce que vous pouvez demander ---------------- */
  const ASKS = [
    { title: 'Measure', desc: 'The assistant reads your performance in Kanal: attributed revenue, ROAS, conversions and costs, per campaign and per automation.',
      q: ['Which campaign generated the most revenue in the last 30 days?', 'How is my abandoned-cart automation performing this month?', 'What is my WhatsApp ROAS over the last 90 days?'] },
    { title: 'Launch a campaign', desc: 'The assistant creates the campaign, picks the audience, estimates the cost and prepares the send. Nothing goes out until you confirm.',
      q: ['Prepare a campaign announcing the new collection to my loyal customers, Thursday at 10 am.', 'How much would this send cost on the whole segment?'] },
    { title: 'Create a segment', desc: 'The assistant builds the segment from orders, WhatsApp activity, country or a group, and gives you its size before creating it.',
      q: ['Create a segment of customers who ordered at least twice, but not in the last 60 days.', 'How many contacts in France clicked a WhatsApp message this month?'] },
    { title: 'Build an automation', desc: 'The assistant creates the flow, adds and connects the steps one by one, then validates it. You review it and switch it on in Kanal.',
      q: ['Create an abandoned-cart flow with a reminder one hour later.', 'Add a two-day wait, then a second message.'] },
    { title: 'Prepare templates', desc: "The assistant writes the WhatsApp template, places the available variables in it and submits it for Meta's review.",
      q: ['Write a template announcing our winter sale and submit it to Meta.', 'Which templates are already approved?'] },
    { title: 'Manage contacts', desc: 'The assistant searches your contacts, creates groups, adds or removes contacts and imports your lists.',
      q: ['Import this list of numbers into a "Paris trade show" group.', 'Add these three customers to the VIP group.'] },
    { title: 'Reply to conversations', desc: 'The assistant reads your WhatsApp conversations and sends the reply you dictate, from your Kanal inbox.',
      q: ['Show me the latest conversations.', 'Summarize my exchange with this customer.', 'Tell her that her parcel ships tomorrow.'] },
  ];

  const list = $('#askTabs'), panel = $('#askPanel');
  if (list && panel) {
    const box = list.closest('.asks');
    const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    list.innerHTML = ASKS.map((a, i) => `<button type="button" class="ask-tab" role="tab" id="ask-${i}" aria-controls="askPanel" aria-selected="${i === 0}"><span class="ask-tab__num">${String(i + 1).padStart(2, '0')}</span>${esc(a.title)}<span class="ask-tab__bar" aria-hidden="true"><i></i></span></button>`).join('');
    const tabsEls = $$('.ask-tab', list);
    let cur = 0, timer = 0, auto = !reduced, inView = false;
    const DUR = 8500;
    box.style.setProperty('--dur', DUR / 1000 + 's');

    // le panneau se joue comme une vraie conversation : questions une à une,
    // points de saisie, puis ce que l'assistant fait dans Kanal
    let play = 0;
    const head = () => `<img src="${ai.logo}" alt="" /><strong>${esc(ai.name)}</strong><span>Kanal MCP</span>`;
    const render = async () => {
      const id = ++play;
      const a = ASKS[cur];
      panel.setAttribute('aria-labelledby', 'ask-' + cur);
      panel.innerHTML = `<div class="achat__head">${head()}</div>
        <div class="achat__body">${a.q.map((q) => `<p class="achat__q" data-seq>${esc(q)}</p>`).join('')}
          <div class="achat__dots" aria-hidden="true"><i></i><i></i><i></i></div>
          <div class="achat__a" data-seq><strong><svg aria-hidden="true"><use href="#logo-kanal-mark" /></svg>In Kanal</strong>${esc(a.desc)}</div></div>`;
      const items = $$('[data-seq]', panel), dots = $('.achat__dots', panel);
      if (reduced) { items.forEach((el) => el.classList.add('is-in')); dots.remove(); return; }
      for (const [k, el] of items.entries()) {
        const isAnswer = k === items.length - 1;
        if (isAnswer) {
          await wait(450);
          if (id !== play) return;
          dots.classList.add('is-in');
          await wait(1100);
          if (id !== play) return;
          dots.remove();
        } else {
          await wait(k === 0 ? 250 : 650);
          if (id !== play) return;
        }
        el.classList.add('is-in');
      }
    };
    const select = (i) => {
      cur = (i + ASKS.length) % ASKS.length;
      tabsEls.forEach((t, k) => t.setAttribute('aria-selected', String(k === cur)));
      // relance la barre de progression de l'onglet actif
      const bar = $('.ask-tab__bar i', tabsEls[cur]);
      bar.style.animation = 'none'; void bar.offsetWidth; bar.style.animation = '';
      // rangée défilante (mobile) : garde l'onglet actif visible sans faire défiler la page
      if (list.scrollWidth > list.clientWidth) list.scrollTo({ left: tabsEls[cur].offsetLeft - 16, behavior: reduced ? 'auto' : 'smooth' });
      render();
    };
    const schedule = () => {
      clearTimeout(timer);
      if (!auto || !inView) { box.classList.remove('is-auto'); return; }
      box.classList.add('is-auto');
      timer = setTimeout(() => { if (!document.hidden) select(cur + 1); schedule(); }, DUR);
    };

    list.addEventListener('click', (e) => {
      const t = e.target.closest('.ask-tab');
      if (!t) return;
      auto = false;
      select(tabsEls.indexOf(t));
      schedule();
    });
    list.addEventListener('keydown', (e) => {
      const d = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
      if (!d) return;
      e.preventDefault();
      auto = false;
      select(cur + d);
      tabsEls[cur].focus();
      schedule();
    });
    onAi.push(() => { const h = $('.achat__head', panel); if (h) h.innerHTML = head(); });

    new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting === inView) return;
        inView = en.isIntersecting;
        if (inView) select(cur);
        schedule();
      });
    }, { threshold: 0.35 }).observe(box);
    select(0);
  }
})();
