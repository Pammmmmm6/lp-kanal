/* =========================================================
   Page Book a demo : même parcours que le site actuel
   (DemoQualificationForm + DemoPage) :
   1. email + boutique (+ chiffre d'affaires facultatif), sauvegarde partielle
      à chaque champ (/api/lead-qualification, stage « partial ») et
      détection de la plateforme (/api/detect-stack) ;
   2. « Continue to booking » : stage « complete », événement lead_qualified ;
   3. calendrier Cal.com dans la page, prérempli et attribué ; une réservation
      envoie le stage « booked » et l'événement demo_booking ;
   4. si le calendrier ne se charge pas : lien direct et email.
   ========================================================= */
(() => {
  const form = document.getElementById('demoForm');
  if (!form) return;
  const K = window.Kanal;
  const book = document.getElementById('demoBook');
  const chips = [...form.querySelectorAll('.dform__chips button')];
  const stack = form.querySelector('[data-stack]');
  const fail = form.querySelector('.dform__fail');
  const submit = form.querySelector('.dform__submit');
  const label = submit.firstChild.textContent;

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const WEBSITE_RE = /^[^\s]{4,}\.[^\s]{2,}$/;
  const CMS_LABELS = { shopify: 'Shopify', woocommerce: 'WooCommerce', bigcommerce: 'BigCommerce', magento: 'Magento', prestashop: 'PrestaShop', wix: 'Wix', squarespace: 'Squarespace', unknown: 'Detected' };
  const LOCALE = 'en';
  const sessionId = (crypto.randomUUID && crypto.randomUUID()) || 'sess-' + Math.random().toString(36).slice(2) + Date.now().toString(36);

  // Provenance figée au chargement (+ noms de campagne Meta explicites s'ils sont dans l'URL)
  const url = new URLSearchParams(location.search);
  const metaNames = {};
  ['campaign_name', 'adset_name', 'ad_name'].forEach((k) => { if (url.get(k)) metaNames[k] = url.get(k); });
  const attribution = { ...metaNames, ...K.leadAttribution() };

  let revenue = '';
  let detected = null, detection = null, lastDomain = '', lastSent = '';
  const email = () => form.email.value.trim();
  const website = () => form.website.value.trim();
  const payload = (stage, o = {}) => ({
    sessionId, email: o.email ?? email(), website: o.website ?? website(),
    cms: o.cms ?? (detected ? detected.cms : ''), monthlyRevenue: o.monthlyRevenue ?? revenue,
    stage, locale: LOCALE, attribution,
  });

  const sendPartial = (o) => {
    const p = payload('partial', o);
    if (!EMAIL_RE.test(p.email)) return;
    const sig = JSON.stringify(p);
    if (sig === lastSent) return;
    lastSent = sig;
    K.beacon('/api/lead-qualification', sig);
  };

  const showStack = (state) => {
    if (!state) { stack.hidden = true; return; }
    stack.hidden = false;
    stack.innerHTML = state === 'detecting' ? 'Detecting…'
      : `${state.favicon ? `<img src="${state.favicon}" alt="" width="14" height="14" />` : ''}${CMS_LABELS[state.cms] || CMS_LABELS.unknown}`;
  };

  const runDetection = (u) => {
    if (!u || !WEBSITE_RE.test(u)) return Promise.resolve();
    if (lastDomain === u) return detection || Promise.resolve();
    lastDomain = u;
    showStack('detecting');
    detection = fetch('/api/detect-stack', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: u }) })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d && typeof d.cms === 'string') {
          detected = { cms: d.cms, favicon: d.favicon, domain: d.domain };
          showStack(d.preview ? null : detected);
          sendPartial({ cms: d.cms });
        } else showStack(null);
      })
      .catch(() => showStack(null))
      .finally(() => { detection = null; });
    return detection;
  };

  // chiffre d'affaires : pastilles à choix unique (un second clic désélectionne)
  chips.forEach((chip) => chip.addEventListener('click', () => {
    const on = chip.getAttribute('aria-checked') !== 'true';
    chips.forEach((c) => c.setAttribute('aria-checked', String(on && c === chip)));
    revenue = on ? chip.dataset.v : '';
    if (revenue) sendPartial({ monthlyRevenue: revenue });
  }));
  form.email.addEventListener('blur', () => sendPartial());
  form.website.addEventListener('blur', () => {
    const v = website();
    if (!v) return;
    runDetection(v);
    sendPartial({ website: v });
  });
  form.addEventListener('input', (e) => {
    const f = e.target.closest('.dform__field');
    if (f && f.classList.contains('is-invalid')) f.classList.remove('is-invalid');
    if (e.target === form.website) { lastDomain = ''; detected = null; showStack(null); }
  });

  const check = (input, ok) => { input.closest('.dform__field').classList.toggle('is-invalid', !ok); return ok; };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (form.classList.contains('is-sending')) return;
    const okEmail = check(form.email, EMAIL_RE.test(email()));
    const okSite = check(form.website, WEBSITE_RE.test(website()));
    if (!okEmail) { form.email.focus(); return; }
    if (!okSite) { form.website.focus(); return; }

    form.classList.add('is-sending');
    submit.firstChild.textContent = submit.dataset.sending;
    fail.hidden = true;
    await runDetection(website());
    try {
      await K.post('/api/lead-qualification', payload('complete'));
      K.trackEvent(K.EVENTS.LEAD_QUALIFIED, { cms: (detected && detected.cms) || 'unknown' });
      openBooking();
    } catch (err) {
      fail.hidden = false;
    } finally {
      form.classList.remove('is-sending');
      submit.firstChild.textContent = label;
    }
  });

  /* ---------- Calendrier Cal.com dans la page ---------- */
  let calLoaded = false;
  function openBooking() {
    const lead = { email: email(), website: website(), cms: (detected && detected.cms) || '', revenue };
    const merged = K.bookingAttribution();
    const config = { layout: 'month_view', useSlotsViewOnSmallScreen: 'true', ...K.calAttribution(merged) };
    config.email = lead.email;
    const derived = (lead.email.split('@')[0] || '').split(/[._-]+/).filter(Boolean).map((p) => p[0].toUpperCase() + p.slice(1)).join(' ');
    if (derived) config.name = derived;
    if (lead.website) config.website = lead.website;
    config.locale = LOCALE;
    const calLink = 'team/kanal/demo';

    // lien direct de secours, avec les mêmes paramètres
    const direct = new URL('https://app.cal.com/' + calLink);
    Object.entries(config).forEach(([k, v]) => { if (!['layout', 'useSlotsViewOnSmallScreen'].includes(k)) direct.searchParams.set(k, v); });
    document.getElementById('demoFallbackCal').href = direct.toString();

    form.hidden = true;
    book.hidden = false;
    document.querySelector('.dh').classList.add('is-booking');
    book.querySelector('[data-book-email]').textContent = lead.email;
    if (!K.live) book.querySelector('[data-book-email]').textContent += ' · preview site: a booking still reaches the team, but the lead is not saved';
    document.querySelector('.dh__panel').scrollIntoView({ behavior: 'smooth', block: 'start' });

    window.__kanalTrackDemoBooking = () => {
      K.trackEvent(K.EVENTS.DEMO_BOOKING);
      K.beacon('/api/lead-qualification', {
        sessionId, email: lead.email, website: lead.website, cms: lead.cms, monthlyRevenue: lead.revenue,
        stage: 'booked', locale: LOCALE, attribution: merged,
      });
    };
    const failed = () => {
      if (!document.getElementById('demoFallback').hidden) return;
      document.getElementById('my-cal-inline-demo').hidden = true;
      document.getElementById('demoFallback').hidden = false;
      K.trackEvent(K.EVENTS.DEMO_EMBED_FAILED);
    };
    window.__kanalCalEmbedFailed = failed;

    if (!calLoaded) {
      calLoaded = true;
      /* eslint-disable */
      (function (C, A, L) { const p = function (a, ar) { a.q.push(ar); }; const d = C.document; C.Cal = C.Cal || function () { const cal = C.Cal; const ar = arguments; if (!cal.loaded) { cal.ns = {}; cal.q = cal.q || []; const s = d.createElement('script'); s.src = A; s.onerror = function () { if (window.__kanalCalEmbedFailed) window.__kanalCalEmbedFailed(); }; d.head.appendChild(s); cal.loaded = true; } if (ar[0] === L) { const api = function () { p(api, arguments); }; const namespace = ar[1]; api.q = api.q || []; if (typeof namespace === 'string') { cal.ns[namespace] = cal.ns[namespace] || api; p(cal.ns[namespace], ar); p(cal, ['initNamespace', namespace]); } else p(cal, ar); return; } p(cal, ar); }; })(window, 'https://app.cal.com/embed/embed.js', 'init');
      /* eslint-enable */
      window.Cal('init', 'demo', { origin: 'https://app.cal.com' });
      window.Cal.ns.demo('inline', { elementOrSelector: '#my-cal-inline-demo', config, calLink });
      window.Cal.ns.demo('ui', { hideEventTypeDetails: false, layout: 'month_view' });
      window.Cal.ns.demo('on', { action: 'bookingSuccessful', callback: () => window.__kanalTrackDemoBooking && window.__kanalTrackDemoBooking() });
      setTimeout(() => { const host = document.getElementById('my-cal-inline-demo'); if (host && host.children.length === 0) failed(); }, 6000);
    }
  }

  document.getElementById('demoBack').addEventListener('click', () => {
    book.hidden = true;
    form.hidden = false;
    document.querySelector('.dh').classList.remove('is-booking');
    form.email.focus();
  });

  document.getElementById('demoFallbackCal').addEventListener('click', () => K.trackEvent(K.EVENTS.CTA_CLICK, { cta: 'demo_embed_fallback_primary' }));
  document.getElementById('demoFallbackMail').addEventListener('click', () => K.trackEvent(K.EVENTS.CTA_CLICK, { cta: 'demo_embed_fallback_email' }));

  K.trackEvent(K.EVENTS.DEMO_PAGE_VIEW);
})();
