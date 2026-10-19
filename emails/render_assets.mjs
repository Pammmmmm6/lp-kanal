// Exporte en PNG les visuels peints de la maquette pour les emails
// (les clients mail ne savent pas afficher les dégradés et les filtres CSS).
// Usage : python3 -m http.server 8650 (à la racine du dépôt), puis
//         node emails/render_assets.mjs 8650 && python3 emails/prepare_assets.py
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PORT = process.argv[2] || '8650';
const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), 'assets');
const ONLY = process.argv[3] ? process.argv[3].split(',') : null;
const SHOTS = [
  // [fichier, page, sélecteur, attente ms, préparation]
  ['logo.png', 'index.html', '.nav .logo', 300],
  ['mcp-hero.png', 'mcp.html', '.mcp-demo', 14000],
  ['update-rcs.png', 'rcs.html', '.rhero__panel', 4000],
  ['update-sms.png', 'sms-campaigns.html', '.feature__visual', 1500],
  ['update-instagram.png', 'instagram.html', '#early-access .duo__media', 7000],
  ['update-klaviyo.png', 'whatsapp-integration/klaviyo.html', '.fh__panel', 7000],
];

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
for (const [file, page, sel, wait] of SHOTS.filter(([f]) => !ONLY || ONLY.includes(f))) {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 3 });
  const pg = await ctx.newPage();
  await pg.addInitScript(() => localStorage.setItem('kanal-theme', 'light'));
  await pg.goto(`http://localhost:${PORT}/${page}`, { waitUntil: 'networkidle' });
  await pg.addStyleTag({ content: '.reveal{opacity:1!important;transform:none!important;filter:none!important;transition:none!important} .kchat{display:none!important}' });
  await pg.evaluate(() => document.querySelectorAll('.reveal').forEach((e) => e.classList.add('is-visible')));
  const el = await pg.$(sel);
  await el.scrollIntoViewIfNeeded();
  await pg.waitForTimeout(wait);
  await el.screenshot({ path: path.join(OUT, file), omitBackground: file === 'logo.png' });
  console.log('saved', file);
  await ctx.close();
}
await b.close();
