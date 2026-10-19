"""WhatsApp marketing glossary: /whatsapp-marketing-glossary and one page per term.

Source (getkanal/getkanal.com, English only):
  * src/lib/glossary.ts — the terms (title, definition, body, related terms) and
    GLOSSARY_RELATED_ARTICLES (blog articles that go deeper on each term);
  * src/components/GlossaryPage.tsx / GlossaryTerm.tsx — the copy of both pages;
  * content/blog/<slug>.md — title and description of the related articles.
The TypeScript data is read by running Node on a copy of the files with
--experimental-strip-types (the files only use type-only imports).

Also exports ts_export() and sentence_case(), reused by gen_tools.py.
"""
import html
import json
import os
import re
import shutil
import subprocess
import tempfile

import yaml

from gen_features import FEATURES, BESPOKE

e = lambda s: html.escape(s, quote=False)
a = lambda s: html.escape(s, quote=True)

GLOSSARY = 'whatsapp-marketing-glossary'
SHOPIFY_APP_URL = 'https://apps.shopify.com/kanal-marketing-ai'

# Copy of GlossaryPage.tsx / GlossaryTerm.tsx (UI.en)
UI = {
    'eyebrow': 'Glossary',
    'title': 'WhatsApp marketing glossary',
    'subtitle': 'Clear definitions of the WhatsApp Business terms every Shopify merchant runs into: the API, message '
                'templates, per-message pricing, opt-in rules, messaging limits and more.',
    'install': 'Install with Shopify',
    'demo': 'Book a demo',
    'countSuffix': 'terms explained',
    'termsLabel': 'WhatsApp marketing terms',
    'home': 'Home',
    'definitionLabel': 'Definition',
    'relatedLabel': 'Related terms',
    'articlesLabel': 'Go deeper: articles',
    'articlesEyebrow': 'From the blog',
}


# ---------- Lecture des données TypeScript ----------
def node_bin():
    return shutil.which('node') or '/opt/node22/bin/node'


def ts_export(site, files, names):
    """Import `names` from the TypeScript `files` (src/lib) of the site repo and return them as JSON."""
    with tempfile.TemporaryDirectory() as tmp:
        for f in files:
            shutil.copy(os.path.join(site, 'src/lib', f), os.path.join(tmp, f))
        imports = '\n'.join(f"import {{ {', '.join(n)} }} from './{f}';" for f, n in names.items())
        every = ', '.join(x for n in names.values() for x in n)
        with open(os.path.join(tmp, 'dump.mts'), 'w', encoding='utf-8') as fh:
            fh.write(f'{imports}\nprocess.stdout.write(JSON.stringify({{ {every} }}));\n')
        out = subprocess.run([node_bin(), '--experimental-strip-types', '--no-warnings', 'dump.mts'],
                             cwd=tmp, capture_output=True, text=True, check=True)
        return json.loads(out.stdout)


# ---------- Casse : « sentence case » en gardant marques et sigles ----------
PROPER = {'WhatsApp', 'Shopify', 'Meta', 'Kanal', 'Google', 'GB', 'Instagram'}
KEEP_TITLES = {  # noms de produits Meta, conservés tels quels
    'WhatsApp Business API', 'WhatsApp Business Platform', 'WhatsApp Cloud API', 'WhatsApp Channels',
    'WhatsApp Communities', 'WhatsApp Flows', 'WhatsApp Pay', 'WhatsApp Web', 'WhatsApp Catalog', 'Meta Verified',
    'WABA (WhatsApp Business Account)',
}
OVERRIDES = {'WhatsApp Business App': 'WhatsApp Business app'}


def _word(w, first):
    parts = w.split('-')
    out = []
    for i, p in enumerate(parts):
        core = re.sub(r'^\W+|\W+$', '', p)
        keep = (core in PROPER or (len(core) > 1 and core.isupper()) or any(c.isupper() for c in core[1:])
                or re.match(r'^[a-z]', core or 'x'))
        if keep or not core:
            out.append(p)
        elif first and i == 0:
            out.append(p[:1].upper() + p[1:].lower() if p[:1].isalpha() else p)
        else:
            out.append(p.lower())
    return '-'.join(out)


def sentence_case(title):
    if title in KEEP_TITLES:
        return title
    if title in OVERRIDES:
        return OVERRIDES[title]
    words = title.split(' ')
    return ' '.join(_word(w, i == 0) for i, w in enumerate(words))


# ---------- Rendu ----------
CHEV = '<svg viewBox="0 0 10 10" aria-hidden="true"><path d="m3.5 2 3 3-3 3" /></svg>'
ARROW = '<svg viewBox="0 0 10 10" aria-hidden="true"><path d="M3 7 7 3M4 3h3v3" /></svg>'
SEARCH = '<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="9" cy="9" r="5.5" /><path d="m13.2 13.2 3.3 3.3" /></svg>'
INLINE_LINK_RE = re.compile(r'\[([^\]]+)\]\((/[^)\s]*)\)')


def ext(path):
    """getkanal.com link; the build turns it into a local page (same tab) when one exists."""
    return f'href="https://getkanal.com{a(path)}" target="_blank" rel="noopener"'


def paragraph(text):
    """GlossaryTerm.tsx renderParagraph: only `[anchor](/path)` becomes a link, the rest stays text."""
    out, cur = [], 0
    for m in INLINE_LINK_RE.finditer(text):
        out.append(e(text[cur:m.start()]))
        out.append(f'<a {ext(m.group(2))}>{e(m.group(1))}</a>')
        cur = m.end()
    out.append(e(text[cur:]))
    return ''.join(out)


def hero_ctas(d):
    return (f'<div class="ah__ctas reveal" style="--d:{d}">\n'
            f'          <a class="btn btn--dark btn--lg" href="{SHOPIFY_APP_URL}" target="_blank" rel="noopener">{UI["install"]}</a>\n'
            f'          <a class="btn btn--soft btn--lg" href="https://getkanal.com/demo">{UI["demo"]}</a>\n'
            '        </div>')


TRUST = '''<div class="trust reveal" style="--d:4">
          <a class="trust__rating" href="https://apps.shopify.com/kanal-marketing-ai/reviews" target="_blank" rel="noopener"><span class="trust__stars" aria-hidden="true">★★★★★</span><span class="trust__link">5/5 on Shopify</span></a>
          <span class="trust__sep" aria-hidden="true"></span>
          <span class="trust__count">500+ brands trust us</span>
        </div>'''


def letter_of(t):
    return t['title']['en'][:1].upper()


def list_page(terms):
    groups = {}
    for t in terms:
        groups.setdefault(letter_of(t), []).append(t)
    az = []
    for c in 'ABCDEFGHIJKLMNOPQRSTUVWXYZ':
        if c in groups:
            az.append(f'<a class="gl-az__l" href="#letter-{c.lower()}" data-letter="{c}">{c}</a>')
        else:
            az.append(f'<span class="gl-az__l is-off" aria-hidden="true">{c}</span>')
    blocks = []
    for c, items in groups.items():
        cards = ''.join(
            f'<a class="gl-term" href="https://getkanal.com/{GLOSSARY}/{t["slug"]}" data-q="{a((t["title"]["en"] + " " + t["definition"]["en"]).lower())}">'
            f'<h3>{e(sentence_case(t["title"]["en"]))}</h3><p>{e(t["definition"]["en"])}</p></a>' for t in items)
        blocks.append(f'''
        <section class="gl-group reveal reveal--up" id="letter-{c.lower()}" data-letter="{c}" aria-labelledby="gl-{c.lower()}">
          <h2 class="gl-group__l" id="gl-{c.lower()}">{c}</h2>
          <div class="gl-grid">{cards}</div>
        </section>''')
    n = len(terms)
    main = f'''  <main class="gl-page">
    <!-- ============ HERO ============ -->
    <section class="ah">
      <div class="wrap">
        <span class="ah__eyebrow reveal">{UI['eyebrow']}</span>
        <h1 class="ah__title reveal" style="--d:1">{UI['title']}</h1>
        <p class="ah__sub reveal" style="--d:2">{e(UI['subtitle'])}</p>
        {hero_ctas(3)}
        {TRUST}
      </div>
    </section>

    <!-- ============ TERMES ============ -->
    <section class="sec gl-list">
      <div class="wrap">
        <div class="gl-bar reveal" data-gl-bar>
          <label class="gl-search">{SEARCH}<input type="search" placeholder="Search {n} terms" aria-label="Search the glossary" autocomplete="off" data-gl-search /></label>
          <nav class="gl-az" aria-label="Jump to a letter">{''.join(az)}</nav>
        </div>
        <p class="gl-count" aria-live="polite"><strong data-gl-count>{n}</strong> {UI['countSuffix']}</p>
        <nav class="gl-groups" aria-label="{UI['termsLabel']}">{''.join(blocks)}
        </nav>
        <div class="gl-empty" hidden data-gl-empty>
          <p>No term matches <strong data-gl-query></strong>.</p>
          <button type="button" class="btn btn--light btn--nav" data-gl-clear>Clear the search</button>
        </div>
      </div>
    </section>
  </main>
'''
    return {'out': f'{GLOSSARY}.html', 'title': f'WhatsApp Marketing Glossary: {n} Terms Explained | Kanal',
            'description': 'The WhatsApp marketing glossary for Shopify merchants: WhatsApp Business API, message '
                           'templates, per-message pricing, opt-in, messaging limits and more.',
            'styles': ['pages.css', 'glossary.css'], 'scripts': ['glossary.js'], 'current': None, 'extra': '',
            'main': main}


def blog_post(site, slug):
    path = os.path.join(site, 'content/blog', f'{slug}.md')
    if not os.path.exists(path):
        return None
    raw = open(path, encoding='utf-8').read()
    m = re.match(r'---\n(.*?)\n---', raw, re.S)
    meta = yaml.safe_load(m.group(1)) if m else {}
    if meta.get('locale', 'en') != 'en':
        return None
    return {'slug': slug, 'title': meta.get('title', slug), 'description': meta.get('description', '')}


def fallback_title(name):
    for c in (f'What is {name}? Definition and examples', f'What is {name}? Definition (2026)', f'What is {name}?'):
        if len(c) <= 52:
            return c
    return name


def fallback_description(definition):
    if len(definition) <= 160:
        return definition
    out = ''
    for s in re.split(r'(?<=[.!?])\s+', definition):
        nxt = f'{out} {s}' if out else s
        if len(nxt) > 160:
            break
        out = nxt
    return out or definition[:157].rsplit(' ', 1)[0] + '...'


GRADS = 'bdc'


def term_page(i, t, by_slug, articles, feature_labels):
    name = sentence_case(t['title']['en'])
    body = ''.join(f'<p>{paragraph(p)}</p>' for p in t['body']['en'])

    # Pages Kanal citées dans le texte de la définition
    feats, seen = [], set()
    for p in t['body']['en']:
        for _, path in INLINE_LINK_RE.findall(p):
            slug = path.strip('/')
            if slug in feature_labels and slug not in seen:
                seen.add(slug)
                feats.append((slug, *feature_labels[slug]))
    blocks = []
    if feats:
        rows = ''.join(f'<li><a {ext("/" + s)}><span class="gt-row__ico"><svg aria-hidden="true"><use href="#logo-kanal-mark" /></svg></span>'
                       f'<span class="gt-row__txt"><strong>{e(label)}</strong><small>{e(sub)}</small></span>{ARROW}</a></li>'
                       for s, label, sub in feats)
        blocks.append(f'''
        <div class="gt-block reveal">
          <h2>Kanal features</h2>
          <ul class="gt-rows">{rows}</ul>
        </div>''')
    if articles:
        rows = ''.join(f'<li><a {ext("/blog/" + p["slug"])}><span class="gt-row__txt"><strong>{e(p["title"])}</strong>'
                       f'<small>{e(p["description"])}</small></span>{ARROW}</a></li>' for p in articles)
        blocks.append(f'''
        <div class="gt-block reveal">
          <span class="gt-block__eyebrow">{UI['articlesEyebrow']}</span>
          <h2>{UI['articlesLabel']}</h2>
          <ul class="gt-rows gt-rows--articles">{rows}</ul>
        </div>''')
    related = [by_slug[s] for s in t['related'] if s in by_slug]
    if related:
        pills = ''.join(f'<a href="https://getkanal.com/{GLOSSARY}/{r["slug"]}">{e(sentence_case(r["title"]["en"]))}</a>' for r in related)
        blocks.append(f'''
        <div class="gt-block reveal">
          <h2>{UI['relatedLabel']}</h2>
          <nav class="gt-pills" aria-label="{UI['relatedLabel']}">{pills}<a class="gt-pills__all" href="https://getkanal.com/{GLOSSARY}">All terms{CHEV}</a></nav>
        </div>''')

    main = f'''  <main class="gl-page gt">
    <!-- ============ HERO ============ -->
    <section class="ah gt-hero">
      <div class="wrap gt__col">
        <nav class="crumbs reveal" aria-label="Breadcrumb">
          <a href="https://getkanal.com/">{UI['home']}</a>{CHEV}<a href="https://getkanal.com/{GLOSSARY}">{UI['eyebrow']}</a>{CHEV}<span aria-current="page">{e(name)}</span>
        </nav>
        <h1 class="gt__title reveal" style="--d:1">{e(name)}</h1>
      </div>
    </section>

    <!-- ============ DÉFINITION ============ -->
    <section class="sec gt-body">
      <div class="wrap gt__col">
        <div class="gt-def feature__visual feature__visual--{GRADS[i % 3]} reveal reveal--up" style="--d:2" role="doc-abstract">
          <div class="gt-def__card"><span class="gt-def__tag">{UI['definitionLabel']}</span><p>{e(t['definition']['en'])}</p></div>
        </div>
        <article class="gt-prose reveal">{body}</article>{''.join(blocks)}
      </div>
    </section>
  </main>
'''
    seo = t.get('seo') or {}
    title = (seo.get('title') or {}).get('en') or fallback_title(t['title']['en'])
    desc = (seo.get('description') or {}).get('en') or fallback_description(t['definition']['en'])
    return {'out': f'{GLOSSARY}/{t["slug"]}.html', 'title': f'{title} | Kanal', 'description': desc,
            'styles': ['pages.css', 'glossary.css'], 'scripts': [], 'current': None, 'extra': '', 'main': main}


def pages(site):
    d = ts_export(site, ['glossary.ts'], {'glossary.ts': ['glossaryTerms', 'GLOSSARY_RELATED_ARTICLES']})
    terms = sorted(d['glossaryTerms'], key=lambda t: t['title']['en'].lower())
    by_slug = {t['slug']: t for t in terms}

    with open(os.path.join(site, 'messages/en.json'), encoding='utf-8') as f:
        fp = json.load(f)['featurePages']
    feature_labels = {s: (sentence_case(fp[k]['hero']['preheader']), fp[k]['hero']['title'])
                      for s, k in {**FEATURES, **BESPOKE}.items() if k in fp}

    out = [list_page(terms)]
    for i, t in enumerate(terms):
        slugs = (d['GLOSSARY_RELATED_ARTICLES'].get(t['slug']) or {}).get('en') or []
        articles = [p for p in (blog_post(site, s) for s in slugs) if p]
        out.append(term_page(i, t, by_slug, articles, feature_labels))
    return out
