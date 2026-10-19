// Compile build/runtime/entry.js → js/kanal.js, avec les modules de suivi du
// site en production (getkanal.com/src/lib/tracking) importés tels quels.
// Usage : node build/runtime/build.mjs [--site /path/to/getkanal.com]
// (dépendances : `npm ci --prefix build/runtime`)
import { build } from 'esbuild';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const i = process.argv.indexOf('--site');
const site = i > 0 ? process.argv[i + 1] : process.env.KANAL_SITE || '/home/user/getkanal.com';

await build({
  entryPoints: [path.join(here, 'entry.js')],
  outfile: path.join(root, 'js/kanal.js'),
  bundle: true,
  format: 'iife',
  target: 'es2019',
  minify: true,
  legalComments: 'none',
  alias: { '@tracking': path.join(site, 'src/lib/tracking') },
  nodePaths: [path.join(here, 'node_modules')],
  // Valeurs publiques de production : bannière cookies désactivée (consentement implicite).
  define: { 'process.env.NEXT_PUBLIC_COOKIE_BANNER': '"off"' },
  banner: { js: '/* Kanal runtime — généré par build/runtime/build.mjs, ne pas modifier à la main */' },
});
console.log('js/kanal.js built from', site);
