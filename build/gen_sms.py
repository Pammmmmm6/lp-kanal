"""SMS pages: /sms, /sms-campaigns and /sms-automation.

Copy comes from messages/en.json → featurePages.sms, .smsCampaigns and
.smsAutomation; the section order and the interactive parts (composer,
customer journey, sub-navigation) from SmsPage.tsx, SmsCampaignsPage.tsx,
SmsAutomationPage.tsx and src/components/sms/*. Re-skinned in the mockup's
art direction: white UI cards on painted panels, pills, .shead headings.

The closing black CTA card of the live pages is left out on purpose (client
rule: no final "book a demo" band). js/sms.js drives the composer, the
journey tabs and the sub-navigation.
"""
import json
import os
import re

from gen_features import ICONS, a, e, live, logos_block

ARROW = '<svg viewBox="0 0 10 10" aria-hidden="true"><path d="M3 7 7 3M4 3h3v3" /></svg>'
GLYPH = ('<svg class="sglyph" viewBox="0 0 24 24" aria-hidden="true">'
         '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>')
STYLES = ['pages.css', 'feature.css', 'sms.css']

TRUST = '''<div class="trust fh__trust reveal" style="--d:4">
          <a class="trust__rating" href="https://apps.shopify.com/kanal-marketing-ai/reviews" target="_blank" rel="noopener"><span class="trust__stars" aria-hidden="true">★★★★★</span><span class="trust__link">5/5 on Shopify</span></a>
          <span class="trust__sep" aria-hidden="true"></span>
          <span class="trust__count">500+ brands trust us</span>
        </div>'''

# Domain-like tokens shown as links inside a text bubble (same regex as js/sms.js)
LINK_RE = re.compile(r'(\b[a-z0-9-]+\.[a-z]{2,}(?:/[^\s]*)?)', re.I)


# ---------------------------------------------------------------- SMS length
# 3GPP TS 23.038 / 23.040, same rules as src/lib/sms-segments.ts (and js/sms.js)
GSM_BASIC = set('@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&\'()*+,-./0123456789:;<=>?'
                '¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà')
GSM_EXT = set('\f^{}\\[~]|€')
LIMITS = {'gsm': (160, 153), 'ucs2': (70, 67)}


def count_sms(text):
    non = [c for c in dict.fromkeys(text) if c not in GSM_BASIC and c not in GSM_EXT]
    enc = 'ucs2' if non else 'gsm'
    cost = (lambda c: 2 if c in GSM_EXT else 1) if enc == 'gsm' else (lambda c: 2 if ord(c) > 0xFFFF else 1)
    single, multi = LIMITS[enc]
    units = sum(cost(c) for c in text)
    if units == 0:
        return enc, 0, single, non, 0
    if units <= single:
        return enc, 1, single - units, non, units
    segs, used = 1, 0
    for c in text:
        if used + cost(c) > multi:
            segs, used = segs + 1, 0
        used += cost(c)
    return enc, segs, multi - used, non, units


# ---------------------------------------------------------------- Helpers
def linkify(text):
    return LINK_RE.sub(r'<span class="smsb__link">\1</span>', e(text))


def bubble(text, link='', stop='', extra=''):
    lk = f' <span class="smsb__link">{e(link)}</span>' if link else ''
    st = f'<span class="smsb__stop">{e(stop)}</span>' if stop else ''
    return f'<p class="smsb{extra}">{e(text)}{lk}{st}</p>'


def thread(head_title, head_sub, body, cls=''):
    return (f'<div class="sthread{cls}"><div class="sthread__head"><span class="sthread__av">{GLYPH}</span>'
            f'<span class="sthread__who"><strong>{e(head_title)}</strong><small>{e(head_sub)}</small></span></div>'
            f'<div class="sthread__body">{body}</div></div>')


def phone(label, day, body, cls=''):
    return (f'<figure class="sphone{cls}" aria-label="{a(label)}"><div class="sphone__screen">'
            '<div class="sphone__status" aria-hidden="true"><span>9:41</span><span class="sphone__island"></span>'
            '<span class="sphone__bars"><i></i><i></i><i></i><i></i></span></div>'
            f'<div class="sphone__head" aria-hidden="true"><span class="sthread__av">{GLYPH}</span><span>SMS</span></div>'
            f'<div class="sphone__body"><span class="sphone__day">{e(day)}</span>{body}</div>'
            '<div class="sphone__input" aria-hidden="true">Text message</div></div></figure>')


def sources(label, srcs):
    if not srcs:
        return ''
    links = ', '.join(f'<a href="{a(s["href"])}" target="_blank" rel="noopener">{e(s["label"])}</a>' for s in srcs)
    return f'<p class="ssrc">{e(label)}: {links}</p>'


def split_title(t):
    """'A: b' / 'A, b' → title on two lines, the second one grey (the .shead style)."""
    for sep in (': ', ', '):
        if sep in t:
            i = t.index(sep) + len(sep.rstrip())
            return f'{e(t[:i])}<span class="muted">{e(t[i:].strip())}</span>'
    return e(t)


def shead(title, intro='', btn=''):
    intro_html = f'<div class="shead__intro reveal" style="--d:1"><p>{e(intro)}</p>{btn}</div>' if intro else ''
    return (f'<div class="shead"><h2 class="shead__title reveal">{split_title(title)}</h2>{intro_html}</div>')


def crumbs(items):
    if not items:
        return ''
    parts = []
    for label, href in items:
        parts.append(f'<a href="{href}">{e(label)}</a>' if href else f'<span aria-current="page">{e(label)}</span>')
    return f'<nav class="scrumbs reveal" aria-label="Breadcrumb">{"<span aria-hidden=\"true\">/</span>".join(parts)}</nav>'


def hero(h, common, crumb_items):
    return f'''
    <!-- ============ HERO ============ -->
    <section class="ah fh">
      <div class="wrap">
        {crumbs(crumb_items)}
        <span class="ah__eyebrow reveal">{e(h['preheader'])}</span>
        <h1 class="fh__title reveal" style="--d:1">{e(h['title'])}</h1>
        <p class="ah__sub reveal" style="--d:2">{e(h['subtitle'])}</p>
        <div class="ah__ctas reveal" style="--d:3">
          <a class="btn btn--dark btn--lg" href="{a(common['ctaPrimaryUrl'])}" target="_blank" rel="noopener">{e(common['ctaPrimary'])}</a>
          <a class="btn btn--soft btn--lg" href="https://getkanal.com/demo">{e(common['ctaSecondary'].capitalize())}</a>
        </div>
        {TRUST}
      </div>
    </section>
'''


def proof(p, rating):
    rating_label = (p['ratingLabel'].replace('{count}', rating['count']) if rating.get('count')
                    else p['ratingLabel'].split(', {count}')[0])
    cells = [(p['brandsValue'], p['brandsLabel']), (f"{rating['value']}/{rating['best']}", rating_label),
             (p['installValue'], p['installLabel']), (p['priceValue'], p['priceLabel'])]
    html = ''.join(f'<div class="fstats__cell"><dd>{e(v)}</dd><dt>{e(l)}</dt></div>' for v, l in cells)
    return f'<dl class="fstats sproof reveal reveal--up">{html}</dl>'


def logos_proof(logos, p, rating, first=False):
    return f'''
    <section class="sec fh-logos">
      <div class="wrap">
      {logos}
        <div class="sproof-wrap">{proof(p, rating)}</div>
      </div>
    </section>
'''


def subnav(label, items):
    links = ''.join(f'<a href="#{i}">{e(t)}</a>' for i, t in items)
    return f'''
    <nav class="snav" aria-label="{a(label)}" data-subnav><div class="snav__in">{links}</div></nav>
'''


def faq_block(title, faq):
    items = ''.join(f'''
          <details{' open' if i == 0 else ''}>
            <summary>{e(q['question'])}<span class="faq__icon"></span></summary>
            <div class="faq__body"><p>{e(q['answer'])}</p></div>
          </details>''' for i, q in enumerate(faq))
    return f'''
    <!-- ============ FAQ ============ -->
    <section class="sec sanchor" id="faq">
      <div class="wrap wrap--narrow cols cols--top">
        <h2 class="reveal">{e(title)}</h2>
        <div class="faq reveal">{items}
        </div>
      </div>
    </section>
'''


def rules_grid(items, label, note, cols):
    cells = ''.join(
        f'<article class="srule reveal reveal--up" style="--d:{i % cols}"><h3>{e(r["title"])}</h3><p>{e(r["description"])}</p>'
        f'{sources(label, r.get("sources") or [])}</article>' for i, r in enumerate(items))
    return (f'<div class="srules srules--{cols}">{cells}</div>'
            f'<p class="snote reveal">{e(note)}</p>')


def statement(s):
    return f'''
    <!-- ============ STATEMENT ============ -->
    <section class="sec">
      <div class="wrap">
        <div class="sstate reveal">
          <p class="sstate__title">{e(s['title'])}</p>
          <p class="sstate__text">{e(s['text'])}</p>
        </div>
      </div>
    </section>
'''


def more_links(m):
    cards = ''.join(
        f'<a class="smore__item reveal reveal--up" style="--d:{i}" href="{a(live(l["href"]))}">'
        f'<span class="smore__label">{e(l["label"])}{ARROW}</span><span class="smore__desc">{e(l["description"])}</span></a>'
        for i, l in enumerate(m['items']))
    return f'''
    <!-- ============ ALLER PLUS LOIN ============ -->
    <section class="sec">
      <div class="wrap">
        <div class="smore">
          <h2 class="smore__title reveal">{e(m['title'])}</h2>
          <div class="smore__grid">{cards}</div>
        </div>
      </div>
    </section>
'''


def rating_from_site(site):
    """Shopify App Store rating as the live components read it (src/lib/seo.ts)."""
    r = {'value': '5', 'best': '5', 'count': ''}
    try:
        s = open(os.path.join(site, 'src/lib/seo.ts'), encoding='utf-8').read()
        block = s[s.index('KANAL_AGGREGATE_RATING = {'):]
        block = block[:block.index('}')]
        for key, field in (('value', 'ratingValue'), ('best', 'bestRating'), ('count', 'ratingCount')):
            m = re.search(field + r"\s*:\s*'([^']+)'", block)
            if m:
                r[key] = m.group(1)
    except (OSError, ValueError):
        pass
    return r


def page_dict(out, t, main):
    meta = t['metadata']
    return {'out': out, 'title': f"{meta['title']} | Kanal", 'description': meta['description'],
            'styles': STYLES, 'scripts': ['sms.js'], 'current': None, 'extra': '', 'main': main}


# ================================================================ /sms
def sms_page(d, logos, rating):
    t, common = d['sms'], d['common']
    src = t['sourcesLabel']
    v = t['hero']['visual']
    out = ['  <main class="feature-page sms-page">']
    out.append(hero(t['hero'], common, []))

    out.append(f'''
    <section class="sec fh-visual">
      <div class="wrap">
        <figure class="sfig reveal reveal--up" aria-label="{a(v['label'])}">
          <div class="fh__panel feature__visual feature__visual--b">
            <div class="sduo">
              {thread(v['campaignTag'], v['campaignTime'], bubble(v['campaignText'], v['campaignLink'], v['campaignStop']))}
              {thread(v['autoTag'], v['autoTime'], bubble(v['autoText'], v['autoLink']))}
            </div>
          </div>
          <figcaption>{e(v['caption'])}</figcaption>
        </figure>
      </div>
    </section>
''')
    out.append(logos_proof(logos, t['proof'], rating))

    # Bulk SMS
    b = t['bulk']
    bulk_icons = [
        '<circle cx="9" cy="8" r="3.2"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0"/><circle cx="17" cy="9" r="2.4"/><path d="M15.5 14.2A4.5 4.5 0 0 1 21 18.5"/>',
        ICONS[4],
        ICONS[3],
    ]
    cards = ''.join(
        f'<article class="fcard reveal reveal--up" style="--d:{i}"><span class="fcard__ico"><svg viewBox="0 0 24 24" aria-hidden="true">{bulk_icons[i % 3]}</svg></span>'
        f'<h3>{e(it["title"])}</h3><p>{e(it["description"])}</p></article>' for i, it in enumerate(b['items']))
    out.append(f'''
    <!-- ============ BULK SMS ============ -->
    <section class="sec">
      <div class="wrap">
        {shead(b['title'], b['subtitle'])}
        <div class="fcards fcards--3">{cards}</div>
      </div>
    </section>
''')

    # Campaigns: three formats
    c = t['campaigns']
    grads = ['b', 'd', 'c']
    cards = ''.join(f'''
          <article class="smsg reveal reveal--up" style="--d:{i}">
            <div class="smsg__art feature__visual feature__visual--{grads[i % 3]}">{thread('Atelier Nova', 'SMS', bubble(it['message'], it['link']), ' sthread--mini')}</div>
            <h3>{e(it['title'])}</h3>
            <p>{e(it['description'])}</p>
          </article>''' for i, it in enumerate(c['items']))
    btn = f'<a class="btn btn--light btn--nav" href="https://getkanal.com/sms-campaigns">{e(c["more"])}</a>'
    out.append(f'''
    <!-- ============ CAMPAGNES ============ -->
    <section class="sec">
      <div class="wrap">
        {shead(c['title'], c['subtitle'], btn)}
        <div class="smsgs">{cards}
        </div>
      </div>
    </section>
''')

    # Automations: six texts
    au = t['automations']
    cards = ''.join(f'''
          <article class="sauto reveal reveal--up" style="--d:{i % 3}">
            <div class="sauto__msg">{bubble(it['message'], it['link'])}</div>
            <h3>{e(it['title'])}</h3>
            <p>{e(it['description'])}</p>
            <a class="sauto__more" href="{a(live(it['href']))}">{e(it['more'])}{ARROW}</a>
          </article>''' for i, it in enumerate(au['items']))
    out.append(f'''
    <!-- ============ AUTOMATISATIONS ============ -->
    <section class="sec">
      <div class="wrap">
        {shead(au['title'], au['subtitle'])}
        <div class="sautos">{cards}
        </div>
      </div>
    </section>
''')

    # Steps
    st = t['steps']
    arts = [
        ('b', '<div class="aui"><div class="aui__head"><strong>Shopify sync</strong><span class="aui__ok">Connected</span></div>'
              '<ul class="aui__rows"><li>Customers<em>Synced</em></li><li>Orders<em>Synced</em></li><li>Checkouts<em>Synced</em></li></ul></div>'),
        ('d', '<div class="aui"><div class="aui__head"><strong>Recipients</strong><span class="aui__chip">Segment</span></div>'
              '<ul class="aui__rows srec"><li><span class="srec__on" aria-hidden="true"></span>Loyal customers</li>'
              '<li><span class="srec__off" aria-hidden="true"></span>First-time buyers</li>'
              '<li><span class="srec__off" aria-hidden="true"></span>No order in two months</li></ul></div>'),
        ('c', '<div class="aui"><div class="aui__head"><strong>New SMS campaign</strong><span class="aui__chip">SMS</span></div>'
              f'<div class="sstep__msg">{bubble("Atelier Nova: private sale until Sunday, 20% off for members.", "atelier-nova.com/private-sale", "Reply STOP to opt out.")}</div>'
              '<div class="aui__btns"><span class="aui__btn">Schedule</span><span class="aui__btn aui__btn--dark">Send</span></div></div>'),
    ]
    steps = ''.join(f'''
          <article class="step reveal reveal--up" style="--d:{i}">
            <div class="step__art feature__visual feature__visual--{arts[i][0]}">{arts[i][1]}</div>
            <span class="step__num">Step {i + 1}</span>
            <h3>{e(s['title'])}</h3>
            <p>{e(s['description'])}</p>
          </article>''' for i, s in enumerate(st['items']))
    out.append(f'''
    <!-- ============ ÉTAPES ============ -->
    <section class="sec">
      <div class="wrap">
        <div class="ahow">
          <div class="ahow__head">
            <h2 class="ahow__title reveal">{e(st['title'])}</h2>
            <div class="ahow__intro reveal" style="--d:1"><p>{e(st['subtitle'])}</p><a class="btn btn--light btn--nav" href="{a(common['ctaPrimaryUrl'])}" target="_blank" rel="noopener">{e(common['ctaPrimary'])}</a></div>
          </div>
          <div class="steps">{steps}
          </div>
        </div>
      </div>
    </section>
''')

    # Rules
    r = t['rules']
    out.append(f'''
    <!-- ============ RÈGLES ============ -->
    <section class="sec">
      <div class="wrap">
        {shead(r['title'], r['subtitle'])}
        {rules_grid(r['items'], src, r['note'], 2)}
      </div>
    </section>
''')

    # Integrations
    ig = t['integrations']

    def ilogo(it):
        if it['name'] == 'Shopify':
            return '<span class="sint__logo"><svg aria-hidden="true"><use href="#logo-shopify" /></svg></span>'
        return f'<span class="sint__logo"><img src="assets/integrations/{os.path.basename(it["logo"])}" alt="" width="28" height="28" /></span>'
    rows = ''.join(f'<li><a href="{a(live(it["href"]))}">{ilogo(it)}<span>{e(it["name"])}</span>{ARROW}</a></li>' for it in ig['items'])
    out.append(f'''
    <!-- ============ INTÉGRATIONS ============ -->
    <section class="sec">
      <div class="wrap">
        <div class="duo duo--rev reveal reveal--up">
          <div class="duo__text">
            <h2>{e(ig['title'])}</h2>
            <p>{e(ig['subtitle'])}</p>
            <a class="btn btn--dark btn--lg sduo__btn" href="https://getkanal.com/whatsapp-integration">{e(ig['all'])}</a>
          </div>
          <div class="duo__media feature__visual feature__visual--c">
            <div class="sint"><div class="sint__head"><strong>{e(ig['preheader'])}</strong><span class="aui__ok">Connected</span></div><ul>{rows}</ul></div>
          </div>
        </div>
      </div>
    </section>
''')

    # WhatsApp comparison
    w = t['whatsapp']
    sms_h = f'<span class="scmp__ch"><svg aria-hidden="true"><use href="#logo-sms" /></svg>{e(w["sms"])}</span>'
    wa_h = f'<span class="scmp__ch"><svg aria-hidden="true"><use href="#logo-whatsapp" /></svg>{e(w["whatsapp"])}</span>'
    rows = ''.join(f'''
              <tr>
                <th scope="row">{e(row['criterion'])}</th>
                <td><span class="scmp__lab" aria-hidden="true">{sms_h}</span><p>{e(row['sms'])}</p>{sources(src, row['smsSources'])}</td>
                <td><span class="scmp__lab" aria-hidden="true">{wa_h}</span><p>{e(row['whatsapp'])}</p>{sources(src, row['whatsappSources'])}</td>
              </tr>''' for row in w['rows'])
    links = ''.join(f'<li><a href="{a(live(l["href"]))}">{e(l["label"])}{ARROW}</a></li>' for l in w['links'])
    out.append(f'''
    <!-- ============ WHATSAPP ============ -->
    <section class="sec">
      <div class="wrap">
        {shead(w['title'], w['subtitle'])}
        <div class="scmp reveal reveal--up">
          <table>
            <caption class="sms-sr">{e(w['title'])}</caption>
            <thead><tr><th scope="col">{e(w['criterion'])}</th><th scope="col">{sms_h}</th><th scope="col">{wa_h}</th></tr></thead>
            <tbody>{rows}
            </tbody>
          </table>
        </div>
        <div class="stake">
          <div class="stake__card feature__visual feature__visual--d reveal reveal--up">
            <div class="ps__inner">
              <span class="ps__tag ps__tag--sol"><svg aria-hidden="true"><use href="#logo-kanal-mark" /></svg>{e(w['takeawayTitle'])}</span>
              <p>{e(w['takeaway'])}</p>
            </div>
          </div>
          <div class="fmore__col reveal reveal--up" style="--d:1"><h3>{e(w['linksTitle'])}</h3><ul class="fres">{links}</ul></div>
        </div>
      </div>
    </section>
''')

    out.append(faq_block(t['faqTitle'], t['faq']))
    out.append('  </main>\n')
    return page_dict('sms.html', t, ''.join(out))


# ================================================================ /sms-campaigns
def composer(c):
    text = c['default']
    enc, segs, rem, non, _ = count_sms(text)
    chars = len(text)
    single, multi = LIMITS[enc]
    cap = multi if segs > 1 else single
    fill = 0 if segs == 0 else min(100, round((cap - rem) / cap * 100))
    gsm = enc == 'gsm'
    live_txt = (c['live'].replace('{chars}', str(chars)).replace('{segments}', str(segs))
                .replace('{encoding}', c['gsm'] if gsm else c['unicode']))
    data = ' '.join(f'data-{k}="{a(v)}"' for k, v in (
        ('gsm', c['gsm']), ('unicode', c['unicode']), ('encoding', c['encoding']), ('limit-gsm', c['limitGsm']),
        ('limit-ucs', c['limitUcs']), ('live', c['live']), ('stop', c['stopSuffix'])))
    note_src = ('<a href="https://www.3gpp.org/dynareport/23038.htm" target="_blank" rel="noopener">3GPP TS 23.038</a>, '
                '<a href="https://www.3gpp.org/dynareport/23040.htm" target="_blank" rel="noopener">3GPP TS 23.040</a>')
    preview = (f'<p class="smsb smsb--lg" data-sc-preview>{linkify(text)}</p>'
               f'<p class="sphone__empty" data-sc-empty hidden>{e(c["empty"])}</p>')
    return f'''<div class="sc" id="composer" data-sms-composer {data}>
            <div class="sc__edit">
              <h2 class="sc__title">{e(c['title'])}</h2>
              <div class="sc__fieldset">
                <label class="sc__label" for="sc-text">{e(c['label'])}</label>
                <textarea class="sc__field" id="sc-text" rows="5" spellcheck="false" autocomplete="off" aria-describedby="sc-help" data-sc-text>{e(text)}</textarea>
              </div>
              <button type="button" class="sc__switch" role="switch" aria-checked="false" data-sc-stop><span class="sc__knob" aria-hidden="true"></span>{e(c['stopLabel'])}</button>
              <div class="sc__stats">
                <dl class="sc__nums">
                  <div><dt>{e(c['chars'])}</dt><dd data-sc-chars>{chars}</dd></div>
                  <div><dt>{e(c['segments'])}</dt><dd data-sc-segs>{segs}</dd></div>
                  <div><dt>{e(c['remaining'])}</dt><dd data-sc-rem>{rem}</dd></div>
                </dl>
                <div class="sc__bar" data-sc-bar aria-hidden="true"><span><i style="width:{fill}%"></i></span></div>
                <p class="sc__help" id="sc-help"><span class="sc__enc" data-sc-enc>{e(c['encoding'])} · {e(c['gsm'] if gsm else c['unicode'])}</span><span data-sc-limit>{e(c['limitGsm'] if gsm else c['limitUcs'])}</span></p>
                <div class="sc__non" data-sc-nongsm hidden>
                  <p class="sc__non-title">{e(c['nonGsmTitle'])} <span class="sc__keys" data-sc-nongsm-list></span></p>
                  <p class="sc__non-hint">{e(c['nonGsmHint'])}</p>
                  <button type="button" class="btn btn--light btn--nav sc__clean" data-sc-clean hidden>{e(c['clean'])}</button>
                </div>
              </div>
              <p class="sms-sr" role="status" aria-live="polite" data-sc-live>{e(live_txt)}</p>
              <p class="sc__note">{e(c['note'])} {note_src}. {e(c['privacy'])}</p>
            </div>
            <div class="sc__preview">
              {phone(c['previewLabel'], c['phoneTime'], preview)}
            </div>
          </div>'''


def campaigns_page(d, logos, rating):
    t, common = d['smsCampaigns'], d['common']
    p = d['sms']['proof']
    src = t['sourcesLabel']
    out = ['  <main class="feature-page sms-page">']
    out.append(hero(t['hero'], common, [(common['breadcrumbHome'], 'https://getkanal.com/'),
                                       (t['hero']['parent'], 'https://getkanal.com/sms'), (t['hero']['preheader'], None)]))
    out.append(f'''
    <!-- ============ ÉDITEUR ============ -->
    <section class="sec fh-visual">
      <div class="wrap">
        <div class="fh__panel feature__visual feature__visual--b sc-panel reveal reveal--up">
          {composer(t['composer'])}
        </div>
      </div>
    </section>
''')
    out.append(logos_proof(logos, p, rating))
    n = t['nav']
    out.append(subnav(t['hero']['preheader'], [('how', n['how']), ('formats', n['formats']), ('timing', n['timing']), ('faq', n['faq'])]))

    h = t['how']
    steps = ''.join(f'<li class="reveal" style="--d:{i}"><span class="svsteps__num" aria-hidden="true">{i + 1}</span>'
                    f'<div><h3>{e(s["title"])}</h3><p>{e(s["description"])}</p></div></li>' for i, s in enumerate(h['steps']))
    out.append(f'''
    <!-- ============ COMMENT ============ -->
    <section class="sec sanchor" id="how">
      <div class="wrap">
        <div class="shows">
          <div class="shows__head reveal">
            <h2 class="shead__title">{split_title(h['title'])}</h2>
            <p>{e(h['subtitle'])}</p>
          </div>
          <ol class="svsteps">{steps}</ol>
        </div>
      </div>
    </section>
''')
    out.append(statement(t['statement']))

    f = t['formats']
    rows = ''.join(f'''
            <li class="sfmt__row reveal" style="--d:{i}">
              <div class="sfmt__text"><h3>{e(it['title'])}</h3><p>{e(it['when'])}</p></div>
              <div class="sfmt__msg"><p class="smsb">{linkify(it['message'])}</p></div>
              <a class="btn btn--outline btn--nav sfmt__load" href="#composer" data-sc-load data-text="{a(it['message'])}">{e(f['load'])}<svg class="sfmt__up" viewBox="0 0 12 12" aria-hidden="true"><path d="M6 10V2M2.5 5.5 6 2l3.5 3.5" /></svg></a>
            </li>''' for i, it in enumerate(f['items']))
    out.append(f'''
    <!-- ============ EXEMPLES ============ -->
    <section class="sec sanchor" id="formats">
      <div class="wrap">
        {shead(f['title'], f['subtitle'])}
        <ul class="sfmt">{rows}
        </ul>
      </div>
    </section>
''')
    tm = t['timing']
    out.append(f'''
    <!-- ============ QUAND ENVOYER ============ -->
    <section class="sec sanchor" id="timing">
      <div class="wrap">
        {shead(tm['title'], tm['subtitle'])}
        {rules_grid(tm['items'], src, tm['note'], 4)}
      </div>
    </section>
''')
    out.append(faq_block(t['faqTitle'], t['faq']))
    out.append(more_links(t['more']))
    out.append('  </main>\n')
    return page_dict('sms-campaigns.html', t, ''.join(out))


# ================================================================ /sms-automation
def journey(j):
    nodes = j['nodes']
    n = len(nodes)
    tabs = ''.join(
        f'<button type="button" class="sj__tab" role="tab" id="sj-tab-{i}" aria-selected="{str(i == 0).lower()}" aria-controls="sj-panel-{i}"'
        f' tabindex="{0 if i == 0 else -1}"><span class="sj__dot" aria-hidden="true"></span><span class="sj__name">{e(nd["tab"])}</span>'
        f'<span class="sj__time">{e(nd["time"])}</span></button>' for i, nd in enumerate(nodes))
    panels = ''.join(f'''
              <div class="sj__panel" role="tabpanel" id="sj-panel-{i}" aria-labelledby="sj-tab-{i}"{'' if i == 0 else ' hidden'}>
                <div class="sj__text">
                  <span class="sj__label">{e(j['triggerLabel'])} · {i + 1}/{n}</span>
                  <p class="sj__trigger">{e(nd['trigger'])}</p>
                  <a class="btn btn--light btn--nav sj__more" href="#{a(nd['anchor'])}">{e(j['detail'])}<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M6 2v8M2.5 6.5 6 10l3.5-3.5" /></svg></a>
                </div>
                {phone(nd['tab'], f"{j['phoneDay']} {nd['time']}", bubble(nd['message'], nd['link'], extra=' smsb--lg smsb--pop'))}
              </div>''' for i, nd in enumerate(nodes))
    return f'''<div class="sj" data-journey style="--n:{n}; --sel:0">
            <div class="sj__head">
              <h2>{e(j['title'])}</h2>
              <p>{e(j['hint'])}</p>
            </div>
            <div class="sj__tabs" role="tablist" aria-label="{a(j['title'])}">
              <span class="sj__track" aria-hidden="true"><i></i></span>{tabs}
            </div>
            <div class="sj__stage">{panels}
            </div>
          </div>'''


def automation_page(d, logos, rating):
    t, common = d['smsAutomation'], d['common']
    p = d['sms']['proof']
    src = t['sourcesLabel']
    out = ['  <main class="feature-page sms-page">']
    out.append(hero(t['hero'], common, [(common['breadcrumbHome'], 'https://getkanal.com/'),
                                       (t['hero']['parent'], 'https://getkanal.com/sms'), (t['hero']['preheader'], None)]))
    out.append(f'''
    <!-- ============ PARCOURS ============ -->
    <section class="sec fh-visual">
      <div class="wrap">
        <div class="fh__panel feature__visual feature__visual--d sj-panel reveal reveal--up">
          {journey(t['journey'])}
        </div>
      </div>
    </section>
''')
    out.append(logos_proof(logos, p, rating))
    n = t['nav']
    out.append(subnav(t['hero']['preheader'], [('abandoned-cart', n['cart']), ('order-updates', n['orders']), ('back-in-stock', n['stock']),
                                               ('post-purchase', n['post']), ('rules', n['rules']), ('faq', n['faq'])]))

    grads = ['b', 'c', 'd', 'b']
    for i, c in enumerate(t['cases']):
        spec = ''.join(f'<div><dt>{e(s["label"])}</dt><dd>{e(s["value"])}</dd></div>' for s in c['spec'])
        msgs = ''.join(f'<span class="sthread__time">{e(m["time"])}</span>{bubble(m["message"], m["link"])}' for m in c['thread'])
        out.append(f'''
    <!-- ============ {e(c['id'])} ============ -->
    <section class="sec sanchor" id="{a(c['id'])}">
      <div class="wrap">
        <div class="duo{' duo--rev' if i % 2 else ''} scase reveal reveal--up">
          <div class="duo__text">
            <h2>{e(c['title'])}</h2>
            <p>{e(c['intro'])}</p>
            <dl class="sspec" aria-label="{a(t['specTitle'])}">{spec}</dl>
          </div>
          <div class="duo__media feature__visual feature__visual--{grads[i % 4]}">
            {thread('Atelier Nova', 'SMS', msgs, ' sthread--case')}
          </div>
        </div>
      </div>
    </section>
''')

    out.append(statement(t['statement']))

    fl = t['flow']
    steps = ''.join(f'''
          <li class="sflow__step reveal reveal--up" style="--d:{i}">
            <span class="sflow__rail" aria-hidden="true"><i></i></span>
            <span class="step__num">{e(s['label'])}</span>
            <h3>{e(s['title'])}</h3>
            <p>{e(s['description'])}</p>
          </li>''' for i, s in enumerate(fl['steps']))
    out.append(f'''
    <!-- ============ FONCTIONNEMENT ============ -->
    <section class="sec">
      <div class="wrap">
        {shead(fl['title'], fl['subtitle'])}
        <ol class="sflow">{steps}
        </ol>
      </div>
    </section>
''')
    r = t['rules']
    out.append(f'''
    <!-- ============ RÈGLES ============ -->
    <section class="sec sanchor" id="rules">
      <div class="wrap">
        {shead(r['title'], r['subtitle'])}
        {rules_grid(r['items'], src, r['note'], 3)}
      </div>
    </section>
''')
    out.append(faq_block(t['faqTitle'], t['faq']))
    out.append(more_links(t['more']))
    out.append('  </main>\n')
    return page_dict('sms-automation.html', t, ''.join(out))


def pages(site):
    with open(os.path.join(site, 'messages/en.json'), encoding='utf-8') as f:
        d = json.load(f)['featurePages']
    logos = logos_block()
    rating = rating_from_site(site)
    return [sms_page(d, logos, rating), campaigns_page(d, logos, rating), automation_page(d, logos, rating)]
