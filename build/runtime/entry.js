/* =========================================================
   Kanal runtime : attribution, événements, pixels et widget de contact.
   Compilé par build/runtime/build.mjs vers js/kanal.js.

   Les modules de suivi viennent tels quels du site en production
   (getkanal.com/src/lib/tracking : utm, events, consent, channel, pixel,
   oaiq) : la maquette envoie exactement les mêmes données que le site actuel.
   Ce fichier ne fait que reproduire ce que font les composants React du
   layout (TrackingProvider, MetaPixel, OpenAiPixel, LemlistTracker,
   WebVitalsReporter, Button, HomeScrollTracker, ChatWidget).

   Hors de getkanal.com (aperçu GitHub Pages, local) : rien ne part. Les
   appels /api/* sont interceptés et journalisés en console, les balises
   tierces (GTM, Meta, OpenAI, Lemlist) ne se chargent pas.
   ========================================================= */
import {
  captureFirstTouch, storeAttribution, storeVisitMeta, getStoredAttribution, buildTrackedUrl,
  getLeadAttribution, getBookingAttribution, getCalAttribution,
} from '@tracking/utm';
import { trackEvent, EVENTS } from '@tracking/events';
import { hasMarketingConsent, CONSENT_CHANGE_EVENT } from '@tracking/consent';
import { onCLS, onFCP, onINP, onLCP, onTTFB } from 'web-vitals';

const LIVE = window.KANAL_LIVE === true;
const META_PIXEL_ID = '1214681823130584';
const OAIQ_PIXEL_ID = 'GosAYknJ1tX1iBP8hZPEwn';
const LEMLIST_SRC = 'https://app.lemlist.com/api/visitors/tracking?k=rDzG8qWPhAsl9YHiZt0lArSIgZH4RI5hszNp0oG9Euo%3D&t=tea_ALrRJzJTEZLm59uRd';
const SHOPIFY_APP = 'https://apps.shopify.com/kanal-marketing-ai';

/* ---------- Aperçu : aucun envoi vers la production ---------- */
if (!LIVE) {
  const isApi = (u) => typeof u === 'string' && u.startsWith('/api/');
  const realFetch = window.fetch.bind(window);
  window.fetch = (u, o) => {
    if (!isApi(u)) return realFetch(u, o);
    console.info('[Kanal preview] not sent:', u, o && o.body ? JSON.parse(o.body) : '');
    return Promise.resolve(new Response(JSON.stringify({ ok: true, preview: true }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
  };
  if (navigator.sendBeacon) {
    const realBeacon = navigator.sendBeacon.bind(navigator);
    navigator.sendBeacon = (u, data) => {
      if (!isApi(u)) return realBeacon(u, data);
      (data && data.text ? data.text() : Promise.resolve(data)).then((t) => console.info('[Kanal preview] not sent:', u, t));
      return true;
    };
  }
}

/** Chemin de la page tel qu'il sera servi sur getkanal.com (/pricing, /blog/x). */
export const pagePath = () => {
  const p = location.pathname.replace(/^\/lp-kanal(?=\/)/, '').replace(/(^|\/)index\.html$/, '$1').replace(/\.html$/, '');
  return p || '/';
};

const loadScript = (src, attrs = {}) => {
  const s = document.createElement('script');
  s.async = true; s.src = src;
  Object.entries(attrs).forEach(([k, v]) => s.setAttribute(k, v));
  document.head.appendChild(s);
};

/* ---------- Pixels (même logique et mêmes conditions que le layout du site) ---------- */
let metaLoaded = false;
function loadMetaPixel() {
  if (metaLoaded || !LIVE || !hasMarketingConsent()) return;
  metaLoaded = true;
  /* eslint-disable */
  !function (f, b, e, v, n, t, s) { if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); }; if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = []; t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s); }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
  /* eslint-enable */
  window.fbq('init', META_PIXEL_ID);
  window.fbq('track', 'PageView');
}

function loadOaiq() {
  if (!LIVE || window.oaiq) return;
  const q = function () { q.q.push(arguments); }; q.q = []; window.oaiq = q;
  loadScript('https://bzrcdn.openai.com/sdk/oaiq.min.js');
  window.oaiq('init', { pixelId: OAIQ_PIXEL_ID });
}

let lemlistLoaded = false;
function loadLemlist() {
  // uniquement sur l'hôte de production, après consentement marketing, sans gêner la page
  if (lemlistLoaded || location.hostname !== 'getkanal.com' || !hasMarketingConsent()) return;
  lemlistLoaded = true;
  const go = () => loadScript(LEMLIST_SRC, { id: 'lemlist-visitor-tracking' });
  document.readyState === 'complete' ? setTimeout(go, 0) : addEventListener('load', go, { once: true });
}

/* ---------- Core Web Vitals → dataLayer (comme WebVitalsReporter) ---------- */
function reportVitals() {
  const push = (m) => {
    if (!window.dataLayer) return;
    window.dataLayer.push({
      event: 'web-vitals', metric_name: m.name,
      metric_value: Math.round(m.name === 'CLS' ? m.value * 1000 : m.value),
      metric_id: m.id, metric_rating: m.rating,
    });
  };
  [onCLS, onFCP, onINP, onLCP, onTTFB].forEach((fn) => fn(push));
}

/* ---------- Liens : installation Shopify décorée + clics suivis (comme Button) ---------- */
function decorateLinks() {
  const path = pagePath();
  const section = path.split('/')[1] || 'home';
  const attrs = { utm_source: 'getkanal', utm_medium: 'website', utm_campaign: `site-${section}`, utm_content: path, ...getStoredAttribution() };
  document.querySelectorAll('a[href]').forEach((a) => {
    const href = a.getAttribute('href');
    const base = href.split(/[?#]/)[0].replace(/\/$/, '');
    if (base === SHOPIFY_APP) {
      a.href = buildTrackedUrl(href, attrs);
      a.addEventListener('click', () => trackEvent(EVENTS.SHOPIFY_INSTALL_CLICK, { href: SHOPIFY_APP, ...(a.dataset.cta ? { placement: a.dataset.cta } : {}) }));
    } else if (/(^|\/)demo(\.html)?$/.test(base)) {
      a.addEventListener('click', () => trackEvent(EVENTS.CTA_CLICK, { href: '/demo', cta: 'demo', ...(a.dataset.cta ? { placement: a.dataset.cta } : {}) }));
    }
  });
}

/* ---------- Événements de page ---------- */
function pageEvents() {
  const path = pagePath();
  if (path === '/pricing') trackEvent(EVENTS.PRICING_PAGE_VIEW);
  if (path === '/') {
    // home_scroll_75 : une fois, au-delà de 75 % de la page
    let raf = 0, fired = false;
    const check = () => {
      raf = 0;
      if (fired) return;
      const doc = document.documentElement, total = doc.scrollHeight - innerHeight;
      if (total <= 0) return;
      const pct = (scrollY || doc.scrollTop) / total;
      if (pct >= 0.75) { fired = true; trackEvent(EVENTS.HOME_SCROLL_75, { scroll_pct: Math.round(pct * 100) }); removeEventListener('scroll', onScroll); }
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(check); };
    addEventListener('scroll', onScroll, { passive: true });
    check();
  }
}

/* ---------- Widget « Chat with us » (même contenu que ChatWidget) ---------- */
const CHAT = {
  buttonLabel: 'Chat with us', agentName: 'Nicolas', status: 'Typically replies in a few minutes',
  greeting: "Hi, I'm Nicolas. What brings you to Kanal today?",
  nudge: 'Got a question about WhatsApp for your Shopify store? Happy to help.', nudgeDismiss: 'Dismiss',
  chips: [
    ['demo', 'Book a demo', '/demo?from=chat-widget', '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>'],
    ['pricing', 'See pricing', '/pricing', '<path d="M20.59 13.41 13.42 20.6a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82Z"/><circle cx="7" cy="7" r="1.4"/>'],
    ['message', 'Leave a message', '/contact?from=chat-widget', '<path d="M4 4h16v12H7l-3 3z"/>'],
  ],
};
const NUDGE_KEY = 'kanal_chat_seen';

function chatWidget() {
  const root = document.documentElement;
  // liens relatifs à la page courante (aperçu) ; en production, chemins absolus
  const base = document.querySelector('link[rel="stylesheet"][href*="css/style.css"]')?.getAttribute('href').split('css/style.css')[0] || '';
  const local = (p) => (LIVE ? p : base + p.replace(/^\/(\w[\w-]*)/, '$1.html'));
  const avatar = base + 'assets/blog/nicolas-provost.jpg';
  const consumer = !!document.querySelector('meta[name="kanal-audience"][content="consumer"]');
  const chips = CHAT.chips.filter(([k]) => !(consumer && k === 'demo')).map(([k, label, href, ico]) =>
    `<a class="kchat__chip" href="${local(href)}" data-k="${k}"><svg viewBox="0 0 24 24" aria-hidden="true">${ico}</svg>${label}</a>`).join('');

  const el = document.createElement('div');
  el.className = 'kchat';
  el.innerHTML = `
    <div class="kchat__nudge" hidden><img src="${avatar}" alt="${CHAT.agentName}" width="32" height="32" /><p>${CHAT.nudge}</p>
      <button type="button" class="kchat__x" aria-label="${CHAT.nudgeDismiss}"><svg viewBox="0 0 12 12" aria-hidden="true"><path d="m3 3 6 6M9 3 3 9"/></svg></button></div>
    <div class="kchat__panel" role="dialog" aria-modal="false" aria-label="${CHAT.buttonLabel}" hidden>
      <div class="kchat__head"><img src="${avatar}" alt="${CHAT.agentName}" width="40" height="40" /><span><strong>${CHAT.agentName}</strong><small>${CHAT.status}</small></span>
        <button type="button" class="kchat__x" data-close aria-label="Close"><svg viewBox="0 0 12 12" aria-hidden="true"><path d="m3 3 6 6M9 3 3 9"/></svg></button></div>
      <div class="kchat__body"><div class="kchat__msg"><img src="${avatar}" alt="" width="26" height="26" /><span class="kchat__typing" aria-hidden="true"><i></i><i></i><i></i></span><p class="kchat__bubble" hidden>${CHAT.greeting}</p></div>
        <div class="kchat__chips" hidden>${chips}</div></div>
    </div>
    <button type="button" class="kchat__btn" aria-label="${CHAT.buttonLabel}" aria-expanded="false"><img src="${avatar}" alt="" width="52" height="52" /><span class="kchat__dot" aria-hidden="true"></span></button>`;
  document.body.appendChild(el);

  const btn = el.querySelector('.kchat__btn'), panel = el.querySelector('.kchat__panel'), nudge = el.querySelector('.kchat__nudge');
  const bubble = el.querySelector('.kchat__bubble'), typing = el.querySelector('.kchat__typing'), chipBox = el.querySelector('.kchat__chips');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const seal = () => { try { localStorage.setItem(NUDGE_KEY, '1'); } catch (e) { /* navigation privée */ } };
  let t1 = 0;
  const open = () => {
    panel.hidden = false; nudge.hidden = true; btn.setAttribute('aria-expanded', 'true'); el.classList.add('is-open'); seal();
    typing.hidden = false; bubble.hidden = true; chipBox.hidden = true;
    clearTimeout(t1);
    t1 = setTimeout(() => { typing.hidden = true; bubble.hidden = false; chipBox.hidden = false; chipBox.querySelector('a')?.focus(); }, reduce ? 0 : 750);
  };
  const close = () => { panel.hidden = true; btn.setAttribute('aria-expanded', 'false'); el.classList.remove('is-open'); btn.focus(); };
  btn.addEventListener('click', () => (panel.hidden ? open() : close()));
  el.querySelector('[data-close]').addEventListener('click', close);
  nudge.querySelector('.kchat__x').addEventListener('click', () => { nudge.hidden = true; seal(); });
  nudge.addEventListener('click', (e) => { if (!e.target.closest('.kchat__x')) open(); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && !panel.hidden) close(); });
  addEventListener('mousedown', (e) => { if (!panel.hidden && !el.contains(e.target)) close(); });
  setTimeout(() => el.classList.add('is-in'), 350);
  try {
    if (!localStorage.getItem(NUDGE_KEY)) setTimeout(() => { if (panel.hidden) nudge.hidden = false; }, 18000);
  } catch (e) { /* navigation privée */ }
}

/* ---------- API pour les formulaires de la maquette ---------- */
async function post(path, body) {
  const res = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  let data = null;
  try { data = await res.json(); } catch (e) { /* réponse vide */ }
  if (!res.ok) throw new Error((data && data.error) || 'Failed to submit');
  return data || {};
}
function beacon(path, body) {
  const json = typeof body === 'string' ? body : JSON.stringify(body);
  try {
    if (navigator.sendBeacon) { navigator.sendBeacon(path, new Blob([json], { type: 'application/json' })); return; }
    fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: json, keepalive: true }).catch(() => {});
  } catch (e) { /* envoi best-effort */ }
}

window.Kanal = {
  live: LIVE, pagePath, post, beacon, trackEvent, EVENTS,
  leadAttribution: () => getLeadAttribution(pagePath()),
  bookingAttribution: () => getBookingAttribution(pagePath(), location.search),
  calAttribution: (merged) => getCalAttribution(pagePath(), location.search, merged),
};

/* ---------- Démarrage (TrackingProvider + layout) ---------- */
storeVisitMeta();
const first = captureFirstTouch();
if (first) storeAttribution(first);
trackEvent(EVENTS.PAGE_VIEW);
loadMetaPixel();
loadOaiq();
loadLemlist();
addEventListener(CONSENT_CHANGE_EVENT, () => { loadMetaPixel(); loadLemlist(); });
reportVitals();
const ready = () => { decorateLinks(); pageEvents(); chatWidget(); document.dispatchEvent(new CustomEvent('kanal:ready')); };
document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', ready, { once: true }) : ready();
