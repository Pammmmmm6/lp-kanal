"""Comparatifs « Kanal vs concurrent » générés depuis le contenu du site en ligne.

Sources (dépôt getkanal/getkanal.com, anglais) :
  * src/lib/alternatives.ts : une fiche par concurrent (accroche, intro, tableau
    face à face, 3 raisons, quand le concurrent convient mieux, FAQ, verdict) ;
    lu avec Node 22 (--experimental-strip-types) sur une copie temporaire.
  * src/lib/alternative-ui.ts : titres et libellés des pages (ALTERNATIVE_UI.en).
  * src/components/AlternativesListPage.tsx : textes de l'index /alternatives.
  * messages/en.json → premiumSetup.testimonials : avis clients (repli du site
    quand Sanity n'en fournit pas), cités tels quels.

Pages : alternatives.html (index) et alternatives/<slug>.html (une par concurrent).
"""
import datetime as dt
import html
import json
import os
import re
import shutil
import subprocess
import tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LIVE = 'https://getkanal.com'
SHOPIFY_APP_URL = 'https://apps.shopify.com/kanal-marketing-ai'

e = lambda s: html.escape(s, quote=False)
a = lambda s: html.escape(s, quote=True)

# Textes de l'index (AlternativesListPage.tsx, UI.en) et métadonnées (alternatives/page.tsx)
LIST_UI = {
    'eyebrow': 'Comparisons',
    'title': 'Kanal alternatives, compared honestly',
    'subtitle': ('Weighing WhatsApp marketing tools for your Shopify store? These fair, side-by-side comparisons '
                 'show where Kanal fits and where each competitor is the better pick.'),
    'cardCta': 'Read the comparison',
    'metaTitle': 'Kanal Alternatives: WhatsApp Comparisons for Shopify',
    'metaDescription': ('Honest comparisons of WhatsApp marketing platforms for Shopify: Kanal versus Wati, Charles, '
                        'Coco AI, Zoko, and Trengo.'),
}

# Titres SEO des fiches (alternatives/[slug]/page.tsx → comparisonTitle)
QUERY_LED_TITLES = {'zoko', 'wati', 'interakt', 'trengo', 'sleekflow', 'postscript', 'omnisend', 'charles', 'simio', 'superchat'}
HEAD_TO_HEAD_TITLES = {'manychat'}
WHATSAPP_AND_SMS_TITLES = {'klaviyo', 'smsbump'}

# Les lignes du tableau n'ont pas de rubrique dans la source : on les range par thème
# (ordre d'origine conservé dans chaque rubrique), comme les groupes du tableau Pricing.
GROUPS = [
    ('Marketing and automation', ['WhatsApp marketing depth', 'Primary focus', 'Primary channel', 'Broadcast campaigns',
                                  'Abandoned cart automation', 'Abandoned cart recovery', 'Instagram DM automation',
                                  'Message format', 'Attribution']),
    ('AI', ['AI features', 'AI chatbot', 'AI agent', 'Conversational AI']),
    ('Shopify and integrations', ['Shopify-native', 'Shopify integration', 'E-commerce integrations']),
    ('Pricing, setup and support', ['Pricing model', 'What gets billed', 'Setup time', 'Support', 'Support and onboarding',
                                    'Compliance']),
    ('Who it is for', ['Best for', 'Target customer', 'Geographic strength']),
]

YES = '<svg class="ct-yes" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="9" /><path d="m6.2 10.2 2.5 2.5 5-5.2" /></svg>'
NO = '<svg class="ct-no" viewBox="0 0 20 20" aria-hidden="true"><path d="m6.5 6.5 7 7M13.5 6.5l-7 7" /></svg>'
ARROW = '<svg class="alt-arrow" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h10M9 4l4 4-4 4" /></svg>'
TRUST = '''<div class="trust reveal" style="--d:4">
          <a class="trust__rating" href="https://apps.shopify.com/kanal-marketing-ai/reviews" target="_blank" rel="noopener"><span class="trust__stars" aria-hidden="true">★★★★★</span><span class="trust__link">5/5 on Shopify</span></a>
          <span class="trust__sep" aria-hidden="true"></span>
          <span class="trust__count">500+ brands trust us</span>
        </div>'''


def ts_export(site, rel, names):
    """Évalue un module TypeScript du site avec Node (types effacés) et renvoie ses exports en JSON."""
    tmp = tempfile.mkdtemp(prefix='kanal-ts-')
    try:
        shutil.copy(os.path.join(site, rel), os.path.join(tmp, 'mod.ts'))
        with open(os.path.join(tmp, 'dump.mts'), 'w', encoding='utf-8') as f:
            f.write(f"import {{ {', '.join(names)} }} from './mod.ts';\n"
                    f"console.log(JSON.stringify({{ {', '.join(names)} }}));\n")
        out = subprocess.run(['node', '--experimental-strip-types', '--no-warnings', os.path.join(tmp, 'dump.mts')],
                             capture_output=True, text=True, check=True).stdout
        return json.loads(out)
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


def logos_block():
    s = open(os.path.join(ROOT, 'src/pages/case-studies.html'), encoding='utf-8').read()
    i = s.index('<div class="logos reveal">')
    j = s.index('</div>\n      </div>', i) + len('</div>\n      </div>')
    return s[i:j]


def comparison_title(slug, name, year):
    if slug in HEAD_TO_HEAD_TITLES:
        return f'Kanal vs {name}: comparison for Shopify ({year})'
    if slug in WHATSAPP_AND_SMS_TITLES:
        return f'Kanal vs {name}: WhatsApp and SMS for Shopify ({year})'
    if slug in QUERY_LED_TITLES:
        return f'{name} Alternative for Shopify: Kanal vs {name} ({year})'
    return f'Kanal vs {name}: WhatsApp Alternative for Shopify {year}'


def hero_ctas(d=3):
    return (f'<div class="ah__ctas reveal" style="--d:{d}">\n'
            f'          <a class="btn btn--dark btn--lg" href="{SHOPIFY_APP_URL}" target="_blank" rel="noopener">Install with Shopify</a>\n'
            f'          <a class="btn btn--soft btn--lg" href="{LIVE}/demo">Book a demo</a>\n'
            '        </div>')


def grouped_rows(rows):
    order = {dim: gi for gi, (_, dims) in enumerate(GROUPS) for dim in dims}
    groups = [[] for _ in GROUPS] + [[]]
    for r in rows:
        groups[order.get(r['dimension'], len(GROUPS))].append(r)
    titles = [g for g, _ in GROUPS] + ['More']
    return [(titles[i], g) for i, g in enumerate(groups) if g]


def table(d):
    name = d['name']
    out = [f'<div class="ct alt-ct reveal" role="table" aria-label="Kanal vs {a(name)}">',
           f'<div class="ct__head" role="row"><div class="ct__feat" role="columnheader">Comparison</div>'
           f'<div class="ct__plan alt-ct__kanal" role="columnheader"><span class="alt-ct__mark"><svg aria-hidden="true"><use href="#logo-kanal-mark" /></svg></span>Kanal</div>'
           f'<div class="ct__plan" role="columnheader">{e(name)}</div></div>']
    for title, rows in grouped_rows(d['comparison']):
        out.append(f'<div class="ct__group" role="row"><span role="rowheader">{e(title)}</span></div>')
        for r in rows:
            neg = re.match(r'(?:Not|No)\b', r['competitor'])
            comp_icon = NO if neg else ''
            out.append(f'<div class="ct__row" role="row"><div class="ct__feat" role="rowheader"><span>{e(r["dimension"])}</span></div>'
                       f'<div class="ct__val alt-ct__val" role="cell" data-col="Kanal">{YES}<span>{e(r["kanal"])}</span></div>'
                       f'<div class="ct__val alt-ct__val alt-ct__val--comp" role="cell" data-col="{a(name)}">{comp_icon}<span>{e(r["competitor"])}</span></div></div>')
    out.append('</div>')
    return '\n          '.join(out)


def faq_block(items, title):
    rows = ''.join(f'''
          <details{' open' if i == 0 else ''}>
            <summary>{e(q['question'])}<span class="faq__icon"></span></summary>
            <div class="faq__body"><p>{e(q['answer'])}</p></div>
          </details>''' for i, q in enumerate(items))
    return f'''
    <!-- ============ FAQ ============ -->
    <section class="sec" id="faq">
      <div class="wrap wrap--narrow cols cols--top">
        <h2 class="reveal">{e(title)}</h2>
        <div class="faq reveal">{rows}
        </div>
      </div>
    </section>
'''


def detail(slug, d, ui, slugs, data, logos, quotes, year):
    name = d['name']
    fill = lambda s: s.replace('{name}', name)
    shot = f'{LIVE}/images/screenshots/{slug}.webp'
    i = slugs.index(slug)
    related = [slugs[(i + k) % len(slugs)] for k in (1, 2, 3)]
    reasons = ''.join(
        f'<article class="alt-reason reveal reveal--up" style="--d:{k}"><span class="alt-num">{k + 1}</span>'
        f'<h3>{e(r["title"])}</h3><p>{e(r["description"])}</p></article>' for k, r in enumerate(d['reasons']))
    quote_html = ''.join(
        f'<figure class="aq reveal reveal--up" style="--d:{k}"><span class="aq__stars" aria-label="5 out of 5">★★★★★</span>'
        f'<blockquote>“{e(q["text"])}”</blockquote><figcaption><img src="{a(LIVE + q["avatar"])}" alt="" width="40" height="40" loading="lazy" />'
        f'<span><strong>{e(q["name"])}</strong><small>{e(q["role"])}</small></span></figcaption></figure>' for k, q in enumerate(quotes))
    pills = ''.join(f'<a href="{LIVE}/alternatives/{s}">Kanal vs {e(data[s]["name"])}</a>' for s in related)

    main = f'''  <main class="alt-page">
    <!-- ============ HERO ============ -->
    <section class="ah">
      <div class="wrap">
        <nav class="ah__eyebrow alt-crumb reveal" aria-label="Breadcrumb"><a href="{LIVE}/alternatives">{e(ui['breadcrumbAlternatives'])}</a><span aria-hidden="true">/</span><span aria-current="page">Kanal vs {e(name)}</span></nav>
        <h1 class="ah__title alt-title reveal" style="--d:1">Kanal vs {e(name)}.<br /><span class="muted">The honest comparison.</span></h1>
        <p class="ah__sub reveal" style="--d:2">{e(d['tagline'])}</p>
        {hero_ctas()}
        {TRUST}
      </div>
    </section>

    <section class="sec alt-logos">
      <div class="wrap">
      {logos}
      </div>
    </section>

    <!-- ============ INTRO + CAPTURES ============ -->
    <section class="sec">
      <div class="wrap">
        <div class="alt-lead reveal">
          <span class="alt-badge">{e(ui['comparisonBadge'].replace('{year}', str(year)))}</span>
          <p role="doc-abstract">{e(d['intro'])}</p>
        </div>
        <div class="alt-shots">
          <figure class="alt-shot reveal reveal--up">
            <div class="alt-shot__frame feature__visual feature__visual--b"><img src="{a(shot)}" alt="{a(fill(ui['competitorCaption']))}" width="1200" height="675" loading="lazy" /></div>
            <figcaption>{e(fill(ui['competitorCaption']))}</figcaption>
          </figure>
          <figure class="alt-shot reveal reveal--up" style="--d:1">
            <a class="alt-shot__frame feature__visual feature__visual--c" href="{SHOPIFY_APP_URL}" target="_blank" rel="noopener"><img src="{LIVE}/images/screenshots/kanal-shopify-app-listing.webp" alt="{a(ui['kanalCaption'])}" width="1200" height="750" loading="lazy" /></a>
            <figcaption>{e(ui['kanalCaption'])}<a href="{SHOPIFY_APP_URL}" target="_blank" rel="noopener">{e(ui['shopifyCta'])}{ARROW}</a></figcaption>
          </figure>
        </div>
      </div>
    </section>

    <!-- ============ FACE À FACE ============ -->
    <section class="sec" id="compare">
      <div class="wrap">
        <div class="shead">
          <h2 class="shead__title reveal">Kanal vs {e(name)}.<span class="muted">Side by side.</span></h2>
          <div class="shead__intro reveal" style="--d:1"><p>{e(d.get('metaDescription') or d['tagline'])}</p></div>
        </div>
        <div class="alt-table">
          {table(d)}
        </div>
      </div>
    </section>

    <!-- ============ POURQUOI KANAL ============ -->
    <section class="sec">
      <div class="wrap">
        <div class="shead shead--solo">
          <h2 class="shead__title reveal">{e(ui['reasonsTitle'])}.<span class="muted">Instead of {e(name)}.</span></h2>
        </div>
        <div class="alt-reasons">{reasons}</div>
      </div>
    </section>

    <!-- ============ AVIS ============ -->
    <section class="sec">
      <div class="wrap">
        <div class="shead shead--solo">
          <h2 class="shead__title reveal">{e(ui['testimonialsTitle'])}.</h2>
        </div>
        <div class="aqs">{quote_html}</div>
      </div>
    </section>

    <!-- ============ QUAND LE CONCURRENT CONVIENT ============ -->
    <section class="sec">
      <div class="wrap">
        <div class="alt-fit">
          <article class="alt-fit__card reveal reveal--up">
            <span class="alt-tag">{e(name)}</span>
            <h2>{e(fill(ui['competitorFitsTitle']))}</h2>
            <p>{e(d['competitorFits'])}</p>
          </article>
          <article class="alt-fit__panel feature__visual feature__visual--d reveal reveal--up" style="--d:1">
            <div class="alt-verdict">
              <span class="alt-tag alt-tag--kanal"><svg aria-hidden="true"><use href="#logo-kanal-mark" /></svg>{e(ui['verdictTitle'])}</span>
              <p>{e(d['verdict'])}</p>
              <div class="alt-verdict__ctas">
                <a class="btn btn--dark btn--nav" href="{SHOPIFY_APP_URL}" target="_blank" rel="noopener">Install with Shopify</a>
                <a class="btn btn--light btn--nav" href="{LIVE}/demo">Book a demo</a>
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>
{faq_block(d['faq'], ui['faqTitle'])}
    <!-- ============ AUTRES COMPARATIFS ============ -->
    <section class="sec">
      <div class="wrap">
        <div class="alt-more reveal">
          <h3>{e(ui['relatedTitle'])}</h3>
          <nav class="fpills" aria-label="{a(ui['relatedTitle'])}">{pills}<a class="fpills__all" href="{LIVE}/alternatives">{e(ui['relatedAll'])}{ARROW}</a></nav>
        </div>
      </div>
    </section>
  </main>
'''
    return {'out': f'alternatives/{slug}.html', 'title': comparison_title(slug, name, year),
            'description': d.get('metaDescription') or d['tagline'],
            'styles': ['pages.css', 'pricing.css', 'feature.css', 'alternatives.css'], 'scripts': [], 'current': None,
            'extra': '', 'main': main}


def index(slugs, data, logos):
    cards = ''.join(
        f'''
          <a class="alt-card reveal reveal--up" style="--d:{k % 3}" href="{LIVE}/alternatives/{s}">
            <span class="alt-card__shot feature__visual feature__visual--{'bcd'[k % 3]}"><img src="{LIVE}/images/screenshots/{s}.webp" alt="" width="1200" height="675" loading="lazy" /></span>
            <span class="alt-card__body">
              <span class="alt-card__vs"><span class="alt-card__mark"><svg aria-hidden="true"><use href="#logo-kanal-mark" /></svg></span>Kanal vs {e(data[s]['name'])}</span>
              <strong class="alt-card__name">{e(data[s]['name'])}</strong>
              <span class="alt-card__line">{e(data[s]['tagline'])}</span>
              <span class="alt-card__cta">{e(LIST_UI['cardCta'])}{ARROW}</span>
            </span>
          </a>''' for k, s in enumerate(slugs))
    main = f'''  <main class="alt-page">
    <!-- ============ HERO ============ -->
    <section class="ah">
      <div class="wrap">
        <span class="ah__eyebrow reveal">{e(LIST_UI['eyebrow'])}</span>
        <h1 class="ah__title reveal" style="--d:1">{e(LIST_UI['title'])}</h1>
        <p class="ah__sub reveal" style="--d:2">{e(LIST_UI['subtitle'])}</p>
        {hero_ctas()}
        {TRUST}
      </div>
    </section>

    <section class="sec alt-logos">
      <div class="wrap">
      {logos}
      </div>
    </section>

    <!-- ============ COMPARATIFS ============ -->
    <section class="sec">
      <div class="wrap">
        <div class="shead shead--solo">
          <h2 class="shead__title reveal">{len(slugs)} comparisons.<span class="muted">One for each tool you are weighing.</span></h2>
        </div>
        <nav class="alt-grid" aria-label="Alternatives">{cards}
        </nav>
      </div>
    </section>
  </main>
'''
    return {'out': 'alternatives.html', 'title': LIST_UI['metaTitle'] + ' | Kanal', 'description': LIST_UI['metaDescription'],
            'styles': ['pages.css', 'alternatives.css'], 'scripts': [], 'current': None, 'extra': '', 'main': main}


def pages(site):
    alts = ts_export(site, 'src/lib/alternatives.ts', ['alternatives', 'ALTERNATIVE_SLUGS'])
    ui = ts_export(site, 'src/lib/alternative-ui.ts', ['ALTERNATIVE_UI'])['ALTERNATIVE_UI']['en']
    slugs = alts['ALTERNATIVE_SLUGS']
    data = {s: alts['alternatives'][s]['en'] for s in slugs}
    with open(os.path.join(site, 'messages/en.json'), encoding='utf-8') as f:
        quotes = json.load(f)['premiumSetup']['testimonials']['items'][:3]
    logos = logos_block()
    year = dt.date.today().year
    return [index(slugs, data, logos)] + [detail(s, data[s], ui, slugs, data, logos, quotes, year) for s in slugs]
