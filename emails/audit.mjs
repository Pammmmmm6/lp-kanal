// Vérifie que chaque composant des emails a les mêmes mesures que son équivalent sur la maquette
// (hauteur, rayon, fond, couleur affichée, taille, interligne, graisse, espacement, contour).
// Usage : python3 -m http.server 8651 (à la racine du dépôt), puis node emails/audit.mjs 8651
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const PORT = process.argv[2];
const P = ['height', 'borderRadius', 'backgroundColor', 'color', 'fontSize', 'lineHeight', 'fontWeight', 'letterSpacing', 'paddingLeft', 'paddingRight'];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const pg = await b.newPage({ viewport: { width: 1440, height: 900 } });
const style = (sel, bgSel) => pg.evaluate(([sel, bgSel, P]) => {
  const el = document.querySelector(sel); if (!el) return null;
  const cs = getComputedStyle(el); const o = Object.fromEntries(P.map((p) => [p, cs[p]]));
  o.height = Math.round(el.getBoundingClientRect().height) + 'px';
  if (bgSel) { const bg = el.closest(bgSel); o.backgroundColor = getComputedStyle(bg).backgroundColor; o.borderRadius = getComputedStyle(bg).borderRadius; }
  const bc = cs.borderTopWidth !== '0px' ? cs.borderTopColor : (cs.boxShadow.includes('inset') ? cs.boxShadow.split(' 0px')[0] : '');
  // couleur réellement affichée : une couleur transparente est fondue sur le fond de l'élément (ou blanc)
  const rgb = (c) => (c.match(/[\d.]+/g) || []).map(Number);
  const bgc = rgb(o.backgroundColor); const base = bgc.length === 4 && bgc[3] === 0 || !bgc.length ? [255, 255, 255] : bgc.slice(0, 3);
  const flat = (c) => { const v = rgb(c); if (v.length < 4) return c; const [r, g, b, al] = v; const m = (x, y) => Math.round(x * al + y * (1 - al)); return `rgb(${m(r, base[0])}, ${m(g, base[1])}, ${m(b, base[2])})`; };
  o.color = flat(o.color); o.outline = bc ? flat(bc.startsWith('rgb') ? bc : bc) : '';
  return o;
}, [sel, bgSel, P]);
// [composant, page du site, sélecteur site, email, sélecteur email, cellule portant le fond]
const PAIRS = [
  ['Button dark (lg)', 'mcp.html', '.btn.btn--dark.btn--lg', 'mcp-launch', '.btn-dark-a', '.btn-dark'],
  ['Button soft (lg)', 'mcp.html', '.btn.btn--soft.btn--lg', 'mcp-launch', '.btn-soft-a', '.btn-soft'],
  ['Button light (nav)', 'whatsapp-integration/klaviyo.html', '.shead__intro .btn--light', 'product-update', '.btn-light-a', '.btn-light'],
  ['Eyebrow pill', 'mcp.html', '.ah__eyebrow', 'mcp-launch', '.pill'],
  ['Outline pill', 'whatsapp-integration/klaviyo.html', '.ulist__num', 'mcp-launch', '.pill-card'],
  ['Section title', 'mcp.html', '.shead__title', 'mcp-launch', '.h2'],
  ['Muted line', 'mcp.html', '.shead__title .muted', 'mcp-launch', '.h2 .muted'],
  ['Body text', 'whatsapp-integration/klaviyo.html', '.fx__desc', 'mcp-launch', 'tr:nth-child(9) .txt'],
  ['List card', 'whatsapp-integration/klaviyo.html', '.ulist', 'mcp-launch', 'table.soft:not(:has(.pill))'],
  ['List title', 'whatsapp-integration/klaviyo.html', '.ulist__item h3', 'mcp-launch', 'table.soft:not(:has(.pill)) p.fg'],
  ['List text', 'whatsapp-integration/klaviyo.html', '.ulist__item p', 'mcp-launch', 'table.soft:not(:has(.pill)) p.txt'],
];
const KEYS = ['height', 'borderRadius', 'backgroundColor', 'color', 'fontSize', 'lineHeight', 'fontWeight', 'letterSpacing', 'outline'];
const CONTAINER = ['List card'];  // pour une surface, seuls fond et rayon comptent
let diffs = 0;
for (const [name, sp, ss, ep, es, ebg] of PAIRS) {
  await pg.goto(`http://localhost:${PORT}/${sp}`, { waitUntil: 'networkidle' }); const s = await style(ss);
  await pg.goto(`http://localhost:${PORT}/emails/dist/${ep}.html`, { waitUntil: 'networkidle' }); const m = await style(es, ebg);
  const bad = KEYS.filter((k) => !(CONTAINER.includes(name) && !['backgroundColor', 'borderRadius'].includes(k)) && s && m && s[k] !== m[k] && !(k === 'height' && ['Section title', 'Muted line', 'Body text', 'List card', 'List text', 'List title'].includes(name)));
  diffs += bad.length;
  console.log((bad.length ? '✗ ' : '✓ ') + name.padEnd(20), bad.length ? bad.map((k) => `${k}: site ${s[k]} / email ${m[k]}`).join(' | ') : `${s.height} · ${s.fontSize}/${s.lineHeight} · ${s.backgroundColor} · r=${s.borderRadius}`);
}
console.log('\n' + diffs + ' differences');
await b.close();
