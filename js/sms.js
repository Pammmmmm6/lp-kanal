/* Pages SMS : éditeur avec compteur (/sms-campaigns), parcours client
   (/sms-automation) et sous-navigation. Chaque bloc ne s'active que si
   ses éléments sont présents. */
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------- Longueur d'un SMS (3GPP TS 23.038 / 23.040) ---------------- */
  const BASIC = new Set('@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&\'()*+,-./0123456789:;<=>?' +
    '¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà');
  const EXT = new Set('\f^{}\\[~]|€');
  const LIMITS = { gsm: [160, 153], ucs2: [70, 67] };

  function countSms(text) {
    const chars = Array.from(text);
    const nonGsm = [];
    for (const ch of chars) if (!BASIC.has(ch) && !EXT.has(ch) && !nonGsm.includes(ch)) nonGsm.push(ch);
    const encoding = nonGsm.length ? 'ucs2' : 'gsm';
    const cost = (ch) => (encoding === 'gsm' ? (EXT.has(ch) ? 2 : 1) : ch.length);
    const [single, multi] = LIMITS[encoding];
    const units = chars.reduce((s, ch) => s + cost(ch), 0);
    if (units === 0) return { encoding, chars: 0, segments: 0, remaining: single, capacity: single, nonGsm };
    if (units <= single) return { encoding, chars: chars.length, segments: 1, remaining: single - units, capacity: single, nonGsm };
    let segments = 1, used = 0;
    for (const ch of chars) {
      const c = cost(ch);
      if (used + c > multi) { segments += 1; used = 0; }
      used += c;
    }
    return { encoding, chars: chars.length, segments, remaining: multi - used, capacity: multi, nonGsm };
  }

  // Typographie qui a un équivalent GSM (appliquée seulement à la demande)
  const REPLACE = [[/[‘’ʼ]/g, "'"], [/[“”«»]/g, '"'], [/[–—−]/g, '-'], [/…/g, '...'], [/[   ]/g, ' ']];
  const toGsm = (t) => REPLACE.reduce((o, [a, b]) => o.replace(a, b), t);
  const visible = (ch) => (ch === ' ' || ch === ' ' || ch === ' ' ? '␣' : ch);

  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const LINK = /(\b[a-z0-9-]+\.[a-z]{2,}(?:\/[^\s]*)?)/gi;
  const linkify = (s) => esc(s).replace(LINK, '<span class="smsb__link">$1</span>');

  /* ---------------- Éditeur SMS ---------------- */
  const sc = $('[data-sms-composer]');
  if (sc) {
    const field = $('[data-sc-text]', sc), stopBtn = $('[data-sc-stop]', sc);
    const out = (k) => $(`[data-sc-${k}]`, sc);
    const bar = out('bar'), preview = out('preview'), empty = out('empty');
    const L = sc.dataset;
    let lastSegs = -1;

    function render() {
      const withStop = stopBtn.getAttribute('aria-checked') === 'true';
      const text = field.value;
      const msg = withStop ? text + L.stop : text;
      const c = countSms(msg);
      const gsm = c.encoding === 'gsm';
      out('chars').textContent = c.chars;
      out('segs').textContent = c.segments;
      out('rem').textContent = c.remaining;
      sc.classList.toggle('is-ucs', !gsm);
      out('enc').textContent = `${L.encoding} · ${gsm ? L.gsm : L.unicode}`;
      out('limit').textContent = gsm ? L.limitGsm : L.limitUcs;

      // une barre par SMS, la dernière se remplit
      const n = Math.max(1, Math.min(c.segments, 8));
      const fill = c.segments === 0 ? 0 : Math.min(100, Math.round(((c.capacity - c.remaining) / c.capacity) * 100));
      if (n !== lastSegs) { bar.innerHTML = '<span><i></i></span>'.repeat(n); lastSegs = n; }
      $$('i', bar).forEach((i, k) => { i.style.width = (k < n - 1 ? 100 : fill) + '%'; });

      const non = out('nongsm');
      non.hidden = gsm;
      out('nongsm-list').innerHTML = c.nonGsm.slice(0, 12).map((ch) => `<kbd>${esc(visible(ch))}</kbd>`).join('');
      out('clean').hidden = toGsm(text) === text;

      const has = msg.trim().length > 0;
      preview.hidden = !has;
      empty.hidden = has;
      if (has) preview.innerHTML = linkify(msg);
      out('live').textContent = L.live.replace('{chars}', c.chars).replace('{segments}', c.segments)
        .replace('{encoding}', gsm ? L.gsm : L.unicode);
    }

    field.addEventListener('input', render);
    stopBtn.addEventListener('click', () => {
      stopBtn.setAttribute('aria-checked', String(stopBtn.getAttribute('aria-checked') !== 'true'));
      render();
    });
    out('clean').addEventListener('click', () => { field.value = toGsm(field.value); render(); field.focus(); });

    // « Essayer dans l'éditeur » : charge l'exemple, remonte à l'éditeur
    $$('[data-sc-load]').forEach((btn) => btn.addEventListener('click', (e) => {
      e.preventDefault();
      field.value = btn.dataset.text;
      render();
      sc.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
      field.focus({ preventScroll: true });
      if (!reduced) {
        preview.classList.remove('smsb--pop'); void preview.offsetWidth; preview.classList.add('smsb--pop');
      }
      history.replaceState(null, '', '#composer');
    }));
    render();
  }

  /* ---------------- Parcours client ---------------- */
  const jr = $('[data-journey]');
  if (jr) {
    const tabs = $$('[role="tab"]', jr), panels = $$('[role="tabpanel"]', jr);
    function select(i, focus) {
      tabs.forEach((t, k) => {
        const on = k === i;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        t.classList.toggle('is-past', k < i);
      });
      panels.forEach((p, k) => {
        p.hidden = k !== i;
        if (k === i && !reduced) {
          const b = $('.smsb', p); b.classList.remove('smsb--pop'); void b.offsetWidth; b.classList.add('smsb--pop');
        }
      });
      jr.style.setProperty('--sel', i);
      if (focus) tabs[i].focus();
    }
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => select(i));
      t.addEventListener('keydown', (e) => {
        const n = tabs.length;
        const to = { ArrowRight: i + 1, ArrowDown: i + 1, ArrowLeft: i - 1, ArrowUp: i - 1, Home: 0, End: n - 1 }[e.key];
        if (to === undefined) return;
        e.preventDefault();
        select((to + n) % n, true);
      });
    });
  }

  /* ---------------- Sous-navigation : section visible ---------------- */
  const nav = $('[data-subnav]');
  if (nav && 'IntersectionObserver' in window) {
    const links = $$('a', nav);
    const targets = links.map((l) => document.getElementById(l.hash.slice(1))).filter(Boolean);
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        links.forEach((l) => {
          if (l.hash === '#' + en.target.id) l.setAttribute('aria-current', 'true');
          else l.removeAttribute('aria-current');
        });
      });
    }, { rootMargin: '-25% 0px -65% 0px' });
    targets.forEach((t) => io.observe(t));
  }
})();
