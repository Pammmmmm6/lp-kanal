"""RCS page (/rcs): copy from messages/en.json → featurePages.rcs, structure from RcsPage.tsx.

The page shows the same message as a plain SMS and as an RCS thread (verified
sender, product carousel, suggestion chips), then what RCS changes, four
store use cases with their phone mock, which phones receive RCS, RCS vs SMS vs
WhatsApp, consent, how to start and the FAQ. The live page's closing black
CTA band is left out (client rule: no bottom CTA band).
"""
import json
import os

from gen_features import a, e, fx_section, live, logos_block, menu_labels, related, ulist

ARROW = '<svg viewBox="0 0 10 10" aria-hidden="true"><path d="M3 7 7 3M4 3h3v3" /></svg>'
VERIFIED = ('<svg class="rverified" viewBox="0 0 24 24" aria-hidden="true"><path fill="#1d5fd1" d="M12 1.5 14.6 4l3.5-.4.9 3.4 3.1 1.7-1.4 3.3 1.4 3.3-3.1 1.7-.9 3.4-3.5-.4L12 22.5 9.4 20l-3.5.4-.9-3.4L1.9 15.3 3.3 12 1.9 8.7 5 7l.9-3.4 3.5.4L12 1.5Z"/>'
            '<path d="m8 12.2 2.7 2.7L16.2 9.4" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>')
SMS_GLYPH = ('<svg class="rglyph" viewBox="0 0 24 24" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>'
             '<path d="M8 10h.01M12 10h.01M16 10h.01" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>')
WA_GLYPH = '<svg class="rglyph" aria-hidden="true"><use href="#logo-whatsapp" /></svg>'
CHECK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5 10 17.5 19 7.5" /></svg>'

# Visuels produits plats (repris de RcsMock.tsx), sans photo
ART = {
    'shirt': ('#efe6d8', '#cdb48c', '<path d="M44 12 30 18 12 36l12 13 10-8v39h52V41l10 8 12-13-18-18-14-6c-3 8-29 8-32 0Z"/><path d="M60 22v58" fill="none" stroke="#efe6d8" stroke-width="1.5"/>'),
    'trousers': ('#e3e8dc', '#9fb08e', '<path d="M42 10h36l7 72H66l-6-46-6 46H35l7-72Z"/><path d="M42 18h36" fill="none" stroke="#e3e8dc" stroke-width="1.5"/>'),
    'bag': ('#f2ddd0', '#d59a7b', '<path d="M34 36h52l5 46H29l5-46Z"/><path d="M47 44V30a13 13 0 0 1 26 0v14" fill="none" stroke="#b97b5c" stroke-width="3.5" stroke-linecap="round"/>'),
    'parcel': ('#dfe7f1', '#9db4cf', '<path d="M26 34 60 20l34 14v34L60 82 26 68V34Z"/><path d="M26 34 60 48l34-14M60 48v34" fill="none" stroke="#dfe7f1" stroke-width="1.8" stroke-linejoin="round"/><path d="m43 27 34 14v11" fill="none" stroke="#7f9bbb" stroke-width="3" stroke-linejoin="round"/>'),
}


def art(kind, cls='rart'):
    bg, fill, shape = ART.get(kind, ART['shirt'])
    return f'<div class="{cls}" style="background:{bg}" aria-hidden="true"><svg viewBox="0 0 120 92" fill="{fill}">{shape}</svg></div>'


def monogram(brand):
    return '<span class="rmono" aria-hidden="true">' + ''.join(w[0] for w in brand.split())[:2].upper() + '</span>'


def sources(label, items):
    links = ', '.join(f'<a href="{a(s["href"])}" target="_blank" rel="noopener">{e(s["label"])}</a>' for s in items)
    return f'<p class="rsrc">{e(label)} {links}</p>'


def rich_card(c, i=None):
    price = f'<strong>{e(c["price"])}</strong>' if c['price'] else ''
    acts = ''.join(f'<span>{e(x)}</span>' for x in c['actions'])
    return (f'<div class="rcard">{art(c["art"])}<div class="rcard__body"><b>{e(c["title"])}</b><small>{e(c["description"])}</small>{price}</div>'
            f'<div class="rcard__acts">{acts}</div></div>')


def thread(t, labels):
    out = [f'<span class="rph__time">{e(t["time"])}</span>',
           f'<p class="rbub rstep" style="--i:0">{e(t["text"])}</p>']
    if len(t['cards']) == 1:
        out.append(f'<div class="rstep rsolo" style="--i:1">{rich_card(t["cards"][0])}</div>')
    elif t['cards']:
        n = len(t['cards'])
        slides = ''.join(f'<div class="rcar__item" role="group" aria-roledescription="slide" aria-label="{a(labels["card"].replace("{n}", str(i + 1)).replace("{total}", str(n)))}">{rich_card(c)}</div>'
                         for i, c in enumerate(t['cards']))
        dots = ''.join(f'<i{" class=\"is-on\"" if i == 0 else ""}></i>' for i in range(n))
        out.append(f'<div class="rstep rcar" style="--i:1" data-rcar role="region" aria-roledescription="carousel" aria-label="{a(labels["carousel"])}">'
                   f'<div class="rcar__track">{slides}</div><div class="rcar__dots" aria-hidden="true">{dots}</div></div>')
    if t['chips']:
        out.append('<div class="rchips rstep" style="--i:2">' + ''.join(f'<span>{e(c)}</span>' for c in t['chips']) + '</div>')
    return ''.join(out)


def phone(t, labels, label):
    return (f'<div class="rph" role="img" aria-label="{a(label)}">'
            f'<div class="rph__head">{monogram(labels["brand"])}<span class="rph__brand">{e(labels["brand"])}{VERIFIED}</span><small>{e(labels["verified"])}</small></div>'
            f'<div class="rph__body">{thread(t, labels)}</div>'
            f'<div class="rph__input"><span>{e(labels["input"])}</span><i aria-hidden="true"></i></div></div>')


def diff_visuals(labels, sample):
    first = sample['cards'][0]
    return [
        f'<div class="rmini rmini--sender">{monogram(labels["brand"])}<span><b>{e(labels["brand"])}{VERIFIED}</b><small>{e(labels["verified"])}</small></span></div>',
        f'<div class="rmini rmini--card">{art(first["art"])}<b>{e(first["title"])}</b><small>{e(first["price"])}</small></div>',
        '<div class="rmini rmini--car">' + ''.join(f'<div>{art(c["art"])}<b>{e(c["title"])}</b></div>' for c in sample['cards'][:3]) + '</div>',
        '<div class="rmini rmini--chips">' + ''.join(f'<span>{e(c)}</span>' for c in (first['actions'] + sample['chips'])[:3]) + '</div>',
    ]


def cards_with_sources(items, label, visuals=None, cols=None):
    cols = cols or (2 if len(items) % 2 == 0 else 3)
    html = []
    for i, it in enumerate(items):
        vis = f'<div class="rdiff__art">{visuals[i]}</div>' if visuals else ''
        html.append(f'<article class="fcard rdiff reveal reveal--up" style="--d:{i % cols}">{vis}<h3>{e(it["title"])}</h3><p>{e(it["description"])}</p>'
                    f'{sources(label, it.get("sources") or [])}</article>')
    return f'<div class="fcards fcards--{cols}">{"".join(html)}</div>'


def shead(title, sub):
    return (f'<div class="shead"><h2 class="shead__title reveal">{e(title)}</h2>'
            f'<div class="shead__intro reveal" style="--d:1"><p>{e(sub)}</p></div></div>')


def page(fp):
    t, common = fp['rcs'], fp['common']
    labels, hv = t['mock'], t['hero']['visual']
    src = t['sourcesLabel'] + ':'
    hero_thread = hv['thread']
    legend = ''.join(f'<li>{CHECK}{e(x)}</li>' for x in hv['legend'])
    sms_card = (f'<div class="rsms"><div class="rsms__head"><span class="rsms__ico">{SMS_GLYPH}</span><span><b>{e(hv["smsTag"])}</b><small>{e(hv["smsTime"])}</small></span></div>'
                f'<p class="rsms__bub">{e(hv["smsText"])} <u>{e(hv["smsLink"])}</u></p></div>')
    out = [f'''  <main class="feature-page rcs-page">
    <!-- ============ HERO ============ -->
    <section class="ah fh">
      <div class="wrap">
        <span class="ah__eyebrow reveal">{e(t['hero']['preheader'])}</span>
        <h1 class="fh__title reveal" style="--d:1">{e(t['hero']['title'])}</h1>
        <p class="ah__sub reveal" style="--d:2">{e(t['hero']['subtitle'])}</p>
        <div class="ah__ctas reveal" style="--d:3">
          <a class="btn btn--dark btn--lg" href="{a(common['ctaPrimaryUrl'])}" target="_blank" rel="noopener">{e(common['ctaPrimary'])}</a>
          <a class="btn btn--soft btn--lg" href="https://getkanal.com/demo">{e(common['ctaSecondary'])}</a>
        </div>
        <div class="trust fh__trust reveal" style="--d:4">
          <a class="trust__rating" href="https://apps.shopify.com/kanal-marketing-ai/reviews" target="_blank" rel="noopener"><span class="trust__stars" aria-hidden="true">★★★★★</span><span class="trust__link">5/5 on Shopify</span></a>
          <span class="trust__sep" aria-hidden="true"></span>
          <span class="trust__count">500+ brands trust us</span>
        </div>
      </div>
    </section>

    <section class="sec fh-visual">
      <div class="wrap">
        <figure class="rhero reveal reveal--up" aria-label="{a(hv['label'])}">
          <div class="rhero__panel feature__visual feature__visual--b">
            <div class="rhero__col">
              <span class="rlabel">{e(hv['smsLabel'])}</span>
              {sms_card}
              <div class="rlegend"><h2>{e(hv['legendTitle'])}</h2><ul>{legend}</ul></div>
            </div>
            <div class="rhero__col rhero__col--phone">
              <span class="rlabel">{e(hv['rcsLabel'])}</span>
              {phone(hero_thread, labels, hv['rcsLabel'])}
            </div>
          </div>
          <figcaption>{e(hv['caption'])}</figcaption>
        </figure>
      </div>
    </section>

    <section class="sec fh-logos">
      <div class="wrap">
      {logos_block()}
      </div>
    </section>

    <!-- ============ CE QUE RCS CHANGE ============ -->
{fx_section('difference', shead(t['difference']['title'], t['difference']['subtitle']),
            [dict(x, media=f'<div class="rdiff__art">{v}</div>', extra=sources(src, x.get('sources') or []))
             for x, v in zip(t['difference']['items'], diff_visuals(labels, hero_thread))],
            'RCS', '<svg aria-hidden="true"><use href="#logo-rcs" /></svg>')}
    <section class="sec fx-after">
      <div class="wrap">
        <div class="rnote">{sources(src, t['difference']['sources'])}</div>
      </div>
    </section>

    <!-- ============ CAS D'USAGE ============ -->
    <section class="sec" id="use-cases">
      <div class="wrap rcases">
''']
    grads = ['d', 'c', 'b', 'd']
    for i, c in enumerate(t['cases']):
        spec = ''.join(f'<div><dt>{e(s["label"])}</dt><dd>{e(s["value"])}</dd></div>' for s in c['spec'])
        out.append(f'''        <article class="duo{' duo--rev' if i % 2 else ''} rcase reveal reveal--up" id="{c['id']}">
          <div class="duo__media feature__visual feature__visual--{grads[i % 4]}">{phone(c['thread'], labels, c['title'])}</div>
          <div class="duo__text">
            <h2>{e(c['title'])}</h2>
            <p>{e(c['intro'])}</p>
            <dl class="rspec" aria-label="{a(t['specTitle'])}">{spec}</dl>
          </div>
        </article>
''')
    out.append('      </div>\n    </section>\n')

    st = t['statement']
    out.append(f'''
    <section class="sec">
      <div class="wrap">
        <div class="rstate reveal"><h2>{e(st['title'])}</h2><p>{e(st['text'])}</p></div>
      </div>
    </section>

    <!-- ============ TÉLÉPHONES ============ -->
    <section class="sec" id="phones">
      <div class="wrap">
        {shead(t['phones']['title'], t['phones']['subtitle'])}
        {ulist([dict(x, extra=sources(src, x.get('sources') or [])) for x in t['phones']['items']])}
        <p class="rnote reveal">{e(t['phones']['note'])}</p>
      </div>
    </section>
''')

    cmp = t['compare']
    chans = [('rcs', VERIFIED), ('sms', SMS_GLYPH), ('whatsapp', WA_GLYPH)]
    head = ''.join(f'<th scope="col"><span>{g}{e(cmp[k])}</span></th>' for k, g in chans)
    rows = ''.join('<tr><th scope="row">' + e(r['criterion']) + '</th>'
                   + ''.join(f'<td><span class="rcmp__ch">{g}{e(cmp[k])}</span>{e(r[k])}</td>' for k, g in chans) + '</tr>'
                   for r in cmp['rows'])
    links = ', '.join(f'<a href="{a(live(l["href"]))}">{e(l["label"])}</a>' for l in cmp['links'])
    out.append(f'''
    <!-- ============ RCS, SMS OU WHATSAPP ============ -->
    <section class="sec" id="compare">
      <div class="wrap">
        {shead(cmp['title'], cmp['subtitle'])}
        <div class="rcmp reveal reveal--up">
          <table><caption class="sr-only">{e(cmp['title'])}</caption>
            <thead><tr><th scope="col">{e(cmp['criterion'])}</th>{head}</tr></thead>
            <tbody>{rows}</tbody>
          </table>
        </div>
        <div class="rnote reveal"><p>{e(cmp['note'])}</p>{sources(src, cmp['sources'])}<p class="rsrc">{e(cmp['linksTitle'])}: {links}</p></div>
      </div>
    </section>

    <!-- ============ RÈGLES ============ -->
    <section class="sec" id="rules">
      <div class="wrap">
        {shead(t['rules']['title'], t['rules']['subtitle'])}
        {ulist([dict(x, extra=sources(src, x.get('sources') or [])) for x in t['rules']['items']])}
        <p class="rnote reveal">{e(t['rules']['note'])}</p>
      </div>
    </section>
''')

    out.append(f'''
    <!-- ============ DÉMARRER ============ -->
    <section class="sec" id="start">
      <div class="wrap">
        <div class="shead"><h2 class="shead__title reveal">{e(t['steps']['title'])}</h2>
          <div class="shead__intro reveal" style="--d:1"><p>{e(t['steps']['subtitle'])}</p><a class="btn btn--light btn--nav" href="https://getkanal.com/demo">{e(common['ctaSecondary'])}</a></div></div>
        {ulist(t['steps']['items'], lambda i: f'Step {i + 1}')}
      </div>
    </section>
''')

    items = ''.join(f'''
          <details{' open' if i == 0 else ''}>
            <summary>{e(q['question'])}<span class="faq__icon"></span></summary>
            <div class="faq__body"><p>{e(q['answer'])}</p></div>
          </details>''' for i, q in enumerate(t['faq']))
    menu = menu_labels()
    picks = ['sms', 'sms-campaigns', 'sms-automation', 'whatsapp-shopify', 'whatsapp-campaigns', 'instagram']
    more = related(fp['common']['otherFeatures'], [(f'https://getkanal.com/{x}', menu.get(x, x), '') for x in picks],
                   t['more']['items'], t['more']['title'])
    out.append(f'''
    <!-- ============ FAQ ============ -->
    <section class="sec" id="faq">
      <div class="wrap wrap--narrow cols cols--top">
        <h2 class="reveal">{e(t['faqTitle'])}</h2>
        <div class="faq reveal">{items}
        </div>
      </div>
    </section>
{more}  </main>
''')
    meta = t['metadata']
    return {'out': 'rcs.html', 'title': f"{meta['title']} | Kanal", 'description': meta['description'],
            'styles': ['pages.css', 'feature.css', 'rcs.css'], 'scripts': ['rcs.js'], 'current': None, 'extra': '',
            'main': ''.join(out)}


def pages(site):
    with open(os.path.join(site, 'messages/en.json'), encoding='utf-8') as f:
        fp = json.load(f)['featurePages']
    return [page(fp)]
