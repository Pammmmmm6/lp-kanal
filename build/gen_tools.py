"""Free tools: /tools and one page per tool.

Source (getkanal/getkanal.com, English only):
  * src/lib/local-tools.ts, src/lib/local-tools-extra.ts — every tool (title,
    description, category, order, embed code, how it works, FAQ). The tools
    stored only in the Sanity CMS are not in the repository, so the mockup
    lists the local ones, as llms.txt does;
  * src/lib/tool-guides.ts — the "Example and tips" block;
  * src/components/ToolsListPage.tsx, ToolDetail.tsx — page structure and copy;
  * messages/en.json → toolsPage and hero (buttons).
The calculators and generators are rebuilt in js/tools.js from the embed code
(same fields, defaults and formulas). The QR code generator relies on an
external QR library, so it is shown as a static preview of the tool.
"""
import html
import json
import os

from gen_glossary import ts_export, sentence_case, TRUST
from gen_features import CART, logos_block

e = lambda s: html.escape(s, quote=False)
a = lambda s: html.escape(s, quote=True)

CATEGORY = {'calculator': 'Calculator', 'generator': 'Generator', 'whatsapp': 'WhatsApp'}
STATIC = {'whatsapp-qr-code-generator'}
GRADS = 'bdc'

# ToolDetail.tsx → PROMO.en (prix Kanal en euros, comme sur la page Pricing)
PROMO = {
    'what': 'What is Kanal?',
    'text': 'Kanal turns WhatsApp into a sales channel for Shopify stores: abandoned cart recovery, order updates, '
            'campaigns to your segments, an AI chatbot and a shared inbox, with revenue tracked per message.',
    'hub': 'See WhatsApp for Shopify in detail',
    'stats': [('96%', 'open rate'), ('5/5', 'Shopify App Store'), ('€89', 'per month')],
    'faq': 'Frequently asked questions',
}
CHEV = '<svg viewBox="0 0 10 10" aria-hidden="true"><path d="m3.5 2 3 3-3 3" /></svg>'
CHECK = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="m3.5 8.5 3 3 6-7" /></svg>'
ARROW = '<svg viewBox="0 0 10 10" aria-hidden="true"><path d="M3 7 7 3M4 3h3v3" /></svg>'


def icon(t):
    """ToolsListPage.tsx: WhatsApp logo for WhatsApp tools, Shopify logo for the others."""
    wa = 'whatsapp' in t['title'].lower() or t['category'] == 'whatsapp'
    return f'<svg aria-hidden="true"><use href="#logo-{"whatsapp" if wa else "shopify"}" /></svg>'


def ctas(hero, d):
    return (f'<div class="ah__ctas reveal" style="--d:{d}">\n'
            f'          <a class="btn btn--dark btn--lg" href="{a(hero["ctaPrimaryUrl"])}" target="_blank" rel="noopener">{e(hero["ctaPrimary"])}</a>\n'
            f'          <a class="btn btn--soft btn--lg" href="https://getkanal.com/demo">{e(sentence_case(hero["ctaSecondary"]))}</a>\n'
            '        </div>')


def card(t, i):
    return (f'<a class="tl-card reveal reveal--up" style="--d:{i % 3}" href="https://getkanal.com/tools/{t["slug"]}">'
            f'<span class="tl-card__top"><span class="tl-ico">{icon(t)}</span><span class="tl-tag">{CATEGORY.get(t["category"], t["category"])}</span></span>'
            f'<h2>{e(sentence_case(t["title"]))}</h2><p>{e(t["description"])}</p>'
            f'<span class="tl-card__go">Use the tool{ARROW}</span></a>')


def list_page(tools, tp, hero):
    cards = ''.join(card(t, i) for i, t in enumerate(tools))
    main = f'''  <main class="tl-page">
    <!-- ============ HERO ============ -->
    <section class="ah">
      <div class="wrap">
        <span class="ah__eyebrow reveal">{e(sentence_case(tp['preheader']))}</span>
        <h1 class="ah__title reveal" style="--d:1">{e(tp['title'])}</h1>
        <p class="ah__sub reveal" style="--d:2">{e(tp['subtitle'])}</p>
        {ctas(hero, 3)}
        {TRUST}
      </div>
    </section>

    <section class="sec tl-logos">
      <div class="wrap">
      {logos_block()}
      </div>
    </section>

    <!-- ============ OUTILS ============ -->
    <section class="sec tl-list">
      <div class="wrap">
        <nav class="tl-grid" aria-label="Tools">{cards}</nav>
      </div>
    </section>
  </main>
'''
    return {'out': 'tools.html', 'title': f"{tp['title']} | Kanal", 'description': tp['subtitle'],
            'styles': ['pages.css', 'tools.css'], 'scripts': [], 'current': None, 'extra': '', 'main': main}


def qr_preview():
    """Static preview of the QR code generator (the live widget loads qrcodejs from a CDN)."""
    return ('<div class="tl-form"><div class="tl-fields">'
            '<div class="tl-field tl-span"><label>WhatsApp number (international, digits only)</label><span class="tl-input tl-input--static">e.g. 12125550142</span></div>'
            '<div class="tl-field tl-span"><label>Pre-filled message (optional)</label><span class="tl-input tl-input--static tl-input--area">Hi, I have a question about my order...</span></div>'
            '</div></div>'
            '<div class="tl-out"><div class="tl-qr"><span class="tl-qr__box"><svg aria-hidden="true"><use href="#logo-whatsapp" /></svg></span>'
            '<p>Enter a WhatsApp number to generate the QR code.</p>'
            '<span class="btn btn--soft btn--nav is-disabled" aria-disabled="true">Download PNG</span></div></div>')


def detail_page(i, t, tools, guide):
    name = sentence_case(t['title'])
    grad = GRADS[i % 3]
    static = t['slug'] in STATIC
    body = qr_preview() if static else ''
    app = f'''<div class="tl-app">
            <div class="tl-app__head"><span class="tl-ico">{icon(t)}</span><span class="tl-app__title"><strong>{e(name)}</strong><small>No signup, no install</small></span><span class="tl-tag">{'Preview' if static else CATEGORY.get(t['category'], t['category'])}</span></div>
            <div class="tl-app__body"{'' if static else f' data-tool="{t["slug"]}"'}>{body}</div>
          </div>'''

    out = [f'''  <main class="tl-page tl-detail">
    <!-- ============ HERO ============ -->
    <section class="ah">
      <div class="wrap">
        <nav class="crumbs reveal" aria-label="Breadcrumb"><a href="https://getkanal.com/">Home</a>{CHEV}<a href="https://getkanal.com/tools">Free tools</a>{CHEV}<span aria-current="page">{e(name)}</span></nav>
        <h1 class="tl-title reveal" style="--d:1">{e(name)}</h1>
        <p class="ah__sub reveal" style="--d:2">{e(t['description'])}</p>
        {ctas(HERO, 3)}
        {TRUST}
      </div>
    </section>

    <!-- ============ OUTIL ============ -->
    <section class="sec tl-stage">
      <div class="wrap">
        <div class="tl-panel feature__visual feature__visual--{grad} reveal reveal--up">
          {app}
        </div>
      </div>
    </section>
''']

    if guide:
        tips = ''.join(f'<li><span class="tl-tick">{CHECK}</span><span>{e(x)}</span></li>' for x in guide['tips'])
        out.append(f'''
    <!-- ============ EXEMPLE ET CONSEILS ============ -->
    <section class="sec">
      <div class="wrap">
        <div class="tl-guide">
          <h2 class="tl-h2 reveal">Example and tips</h2>
          <div class="tl-guide__grid">
            <article class="tl-ex reveal reveal--up"><span class="tl-pill">Example</span><p>{e(guide['example'])}</p></article>
            <article class="tl-tips reveal reveal--up" style="--d:1"><span class="tl-pill">Tips</span><ul>{tips}</ul></article>
          </div>
        </div>
      </div>
    </section>
''')

    stats = ''.join(f'<span class="tl-stat"><strong>{v}</strong>{l}</span>' for v, l in PROMO['stats'])
    out.append(f'''
    <!-- ============ KANAL ============ -->
    <section class="sec">
      <div class="wrap">
        <article class="duo tl-kanal reveal reveal--up">
          <div class="duo__text">
            <span class="tl-pill"><svg aria-hidden="true"><use href="#logo-kanal-mark" /></svg>Kanal</span>
            <h2>{PROMO['what']}</h2>
            <p>{e(PROMO['text'])}</p>
            <div class="tl-stats">{stats}</div>
            <a class="btn btn--light btn--nav" href="https://getkanal.com/whatsapp-shopify">{PROMO['hub']}</a>
          </div>
          <div class="duo__media feature__visual feature__visual--{'c' if grad != 'c' else 'd'}">
            {CART}
          </div>
        </article>
      </div>
    </section>
''')

    # Capture de lead : audit WhatsApp de la boutique (ToolLeadForm, envoyé sur /api/contact)
    out.append(f'''
    <!-- ============ AUDIT ============ -->
    <section class="sec">
      <div class="wrap">
        <article class="duo duo--rev tl-lead reveal reveal--up">
          <div class="duo__text">
            <h2>Your Shopify store on WhatsApp in 15 minutes</h2>
            <p>Leave your email and store address: a Kanal expert shows you the WhatsApp flows that pay for your catalog, cart recovery, order updates and campaigns.</p>
          </div>
          <div class="duo__media feature__visual feature__visual--{'b' if grad != 'b' else 'd'}">
            <form class="dform" id="toolForm" data-form data-audit-tool="{a(t['slug'])}" data-error="Something went wrong, please try again or email hugo@getkanal.com." novalidate>
              <div class="dform__head"><span class="dform__mark"><svg aria-hidden="true"><use href="#logo-kanal-mark" /></svg></span><span><strong>WhatsApp audit</strong><small>15 min · Free</small></span></div>
              <label class="dform__field"><span class="dform__label">Work email</span><input type="email" name="email" placeholder="you@store.com" autocomplete="email" required /><span class="dform__err">Enter a valid work email.</span></label>
              <label class="dform__field"><span class="dform__label">Your store address <em>Optional</em></span><input type="text" name="store" placeholder="mystore.com" autocomplete="url" /></label>
              <input class="hp" type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true" />
              <button type="submit" class="btn btn--dark btn--lg dform__submit" data-sending="Sending…">Get my audit<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 8h9M8.5 4l4 4-4 4" /></svg></button>
              <div class="dform__done" aria-live="polite"><span class="dform__ok"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="m6 10.4 2.6 2.6L14 7.4" /></svg></span><strong>Request received</strong><small>Thanks, a Kanal expert will get back to you within one business day.</small></div>
            </form>
          </div>
        </article>
      </div>
    </section>
''')

    steps = t.get('howItWorks') or []
    if steps:
        lis = ''.join(f'<li><span class="tl-step__n">{n + 1}</span><div><h3>{e(s["title"])}</h3><p>{e(s["description"])}</p></div></li>'
                      for n, s in enumerate(steps))
        out.append(f'''
    <!-- ============ COMMENT ÇA MARCHE ============ -->
    <section class="sec">
      <div class="wrap wrap--narrow cols cols--top">
        <div class="tl-how__head reveal">
          <h2>How it works</h2>
          <p>{e(t['description'])}</p>
        </div>
        <ol class="tl-steps reveal">{lis}</ol>
      </div>
    </section>
''')

    faq = t.get('faq') or []
    if faq:
        items = ''.join(f'''
          <details{' open' if n == 0 else ''}>
            <summary>{e(q['question'])}<span class="faq__icon"></span></summary>
            <div class="faq__body"><p>{e(q['answer'])}</p></div>
          </details>''' for n, q in enumerate(faq))
        out.append(f'''
    <!-- ============ FAQ ============ -->
    <section class="sec" id="faq">
      <div class="wrap wrap--narrow cols cols--top">
        <h2 class="reveal">{PROMO['faq']}</h2>
        <div class="faq reveal">{items}
        </div>
      </div>
    </section>
''')

    others = [o for o in tools if o['slug'] != t['slug']][:6]
    links = ''.join(f'<a class="tl-other" href="https://getkanal.com/tools/{o["slug"]}"><span class="tl-ico">{icon(o)}</span>'
                    f'<span>{e(sentence_case(o["title"]))}</span>{ARROW}</a>' for o in others)
    out.append(f'''
    <!-- ============ AUTRES OUTILS ============ -->
    <section class="sec">
      <div class="wrap">
        <div class="tl-more reveal">
          <div class="tl-more__head"><h2 class="tl-h2">Discover other free tools</h2><a class="btn btn--light btn--nav" href="https://getkanal.com/tools">All tools</a></div>
          <nav class="tl-others" aria-label="Other free tools">{links}</nav>
        </div>
      </div>
    </section>
  </main>
''')
    # [slug]/page.tsx : suffixe « Free Shopify Tool » seulement si le titre ne cite pas Shopify
    title = t['title'] if 'shopify' in t['title'].lower() else f"{t['title']} | Free Shopify Tool"
    return {'out': f'tools/{t["slug"]}.html', 'title': f'{title} | Kanal', 'description': t['description'],
            'styles': ['pages.css', 'demo.css', 'tools.css'], 'scripts': ['company.js'] + ([] if static else ['tools.js']), 'current': None, 'extra': '',
            'main': ''.join(out)}


HERO = {}


def pages(site):
    d = ts_export(site, ['local-tools.ts', 'local-tools-extra.ts', 'tool-guides.ts'],
                  {'local-tools.ts': ['localTools'], 'local-tools-extra.ts': ['extraLocalTools'], 'tool-guides.ts': ['toolGuides']})
    with open(os.path.join(site, 'messages/en.json'), encoding='utf-8') as f:
        msgs = json.load(f)
    HERO.update(msgs['hero'])
    tools = sorted((t for t in d['localTools'] + d['extraLocalTools'] if t['locale'] == 'en'), key=lambda t: t['order'])
    out = [list_page(tools, msgs['toolsPage'], HERO)]
    for i, t in enumerate(tools):
        guide = (d['toolGuides'].get(t['slug']) or {}).get('en')
        out.append(detail_page(i, t, tools, guide))
    return out
