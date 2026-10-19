"""Integration pages: /whatsapp-integration (list) and /whatsapp-integration/<slug>.

Copy comes from messages/en.json → integrationPages, the structure from
IntegrationPage.tsx / IntegrationsListPage.tsx. Shopify has no page of its own
on the live site (/whatsapp-integration/shopify redirects to /whatsapp-shopify),
so the list links to that feature page instead.
"""
import json
import os

from gen_features import ICONS, a, e, flow, live, logos_block

# ordre de src/lib/integrations.ts
SLUGS = ['klaviyo', 'gorgias', 'loyoly', 'splio', 'zendesk', 'crisp', 'recharge', 'prestashop']
DEMO_ONLY = {'prestashop'}  # connexion par l'API boutique : pas d'installation Shopify
ARROW = '<svg viewBox="0 0 10 10" aria-hidden="true"><path d="M3 7 7 3M4 3h3v3" /></svg>'


def logo(slug):
    return f'assets/integrations/{slug}.webp'


def name(t):
    return t['hero']['preheader'].split(' × ')[0]


def helpdesk(tool, slug, total):
    return flow(f'WhatsApp in {tool}', f'Fincut · {tool}', logo(slug), [
        ('WhatsApp message received', '“Where is my order #1042?”', '9:41 am'),
        (f'Conversation in {tool}', 'Tagged WhatsApp · Customer matched', '1 s'),
        ('Shopify context attached', '#1042 · Picked up by carrier', 'Synced'),
        ('Agent reply sent', f'From the {tool} inbox', '2 min'),
        ('Resolved on first reply', 'Customer: “Perfect, thanks!”', '4 min')], 'Average first reply', total)


# Visuel animé du hero (même carte que l'accueil, main.js l'anime)
VISUALS = {
    'klaviyo': ('b', flow('Klaviyo welcome series', 'Fincut · Klaviyo', logo('klaviyo'), [
        ('Segment synced', 'Klaviyo · New subscribers', 'Sync'),
        ('Flow event received', 'Welcome series started', '9:30 am'),
        ('WhatsApp message', '10% code · Product photo · 2 buttons', 'Read'),
        ('Clicked the offer', 'Browsing the new collection', '3 min'),
        ('First order', '#1066 · Paid in Shopify', '€42.90')], 'Revenue from Klaviyo flows this month', 7840.30)),
    'gorgias': ('c', helpdesk('Gorgias', 'gorgias', '4 min')),
    'loyoly': ('d', flow('Reward alert', 'Fincut · Loyoly', logo('loyoly'), [
        ('Points earned', 'Order #1042 · +120 points', 'Mon'),
        ('Reward unlocked', '€10 voucher available', 'Loyoly'),
        ('WhatsApp alert', 'Points balance · Use my reward button', 'Read'),
        ('Clicked “Use my reward”', 'Voucher applied to the cart', '2 min'),
        ('Order placed', '#1079 · Reward redeemed', '€38.50')], 'Revenue from reward alerts this month', 4560.20)),
    'splio': ('b', flow('Birthday campaign', 'Fincut · Splio', logo('splio'), [
        ('Splio segment synced', 'Birthdays this week · 312 contacts', 'Sync'),
        ('Automation triggered', 'Birthday · 9 am, local time', '9:00 am'),
        ('WhatsApp message', 'Personal offer · First name · Photo', 'Read'),
        ('Clicked the offer', 'Gift guide opened', '6 min'),
        ('Order placed', '#1084 · Paid in Shopify', '€54.00')], 'Revenue from Splio audiences this month', 6215.70)),
    'zendesk': ('c', helpdesk('Zendesk', 'zendesk', '5 min')),
    'crisp': ('d', helpdesk('Crisp', 'crisp', '3 min')),
    'recharge': ('b', flow('Upcoming charge reminder', 'Fincut · Recharge', logo('recharge'), [
        ('Upcoming charge', 'Socks subscription · in 3 days', 'Recharge'),
        ('WhatsApp reminder', 'Skip, swap or confirm buttons', 'Read'),
        ('Customer reply', '“Swap to navy, please”', '1 min'),
        ('Subscription updated', 'Synced back to Recharge', 'Done'),
        ('Renewal paid', 'Subscriber kept · Month 7', '€24.00')], 'Subscription revenue saved this month', 3980.40)),
    'prestashop': ('c', flow('Abandoned cart flow', 'Fincut · PrestaShop', logo('prestashop'), [
        ('Cart abandoned', 'Tech T-shirt · Black, M', '2:14 pm'),
        ('Wait 1 hour', 'Smart delay, quiet hours respected', '1 h'),
        ('WhatsApp reminder', 'Product photo · 2 buttons', 'Read'),
        ('Customer reply', 'Answered by the AI agent', '12 s'),
        ('Order recovered', '#1042 · Paid in PrestaShop', '€35.10')], 'Recovered this month', 9312.60)),
}

TRUST = '''<div class="trust fh__trust reveal" style="--d:4">
          <a class="trust__rating" href="https://apps.shopify.com/kanal-marketing-ai/reviews" target="_blank" rel="noopener"><span class="trust__stars" aria-hidden="true">★★★★★</span><span class="trust__link">5/5 on Shopify</span></a>
          <span class="trust__sep" aria-hidden="true"></span>
          <span class="trust__count">500+ brands trust us</span>
        </div>'''


def ctas(common, demo_only):
    if demo_only:
        return (f'<a class="btn btn--dark btn--lg" href="https://getkanal.com/demo">{e(common["ctaSecondary"])}</a>\n'
                '          <a class="btn btn--soft btn--lg" href="https://getkanal.com/pricing">See pricing</a>')
    return (f'<a class="btn btn--dark btn--lg" href="{a(common["ctaPrimaryUrl"])}" target="_blank" rel="noopener">{e(common["ctaPrimary"])}</a>\n'
            f'          <a class="btn btn--soft btn--lg" href="https://getkanal.com/demo">{e(common["ctaSecondary"])}</a>')


def faq_block(title, faq):
    items = ''.join(f'''
          <details{' open' if i == 0 else ''}>
            <summary>{e(q['question'])}<span class="faq__icon"></span></summary>
            <div class="faq__body"><p>{e(q['answer'])}</p></div>
          </details>''' for i, q in enumerate(faq))
    return f'''
    <!-- ============ FAQ ============ -->
    <section class="sec" id="faq">
      <div class="wrap wrap--narrow cols cols--top">
        <h2 class="reveal">{e(title)}</h2>
        <div class="faq reveal">{items}
        </div>
      </div>
    </section>
'''


def integration(slug, d, logos):
    t, common = d[slug], d['common']
    hero, nm = t['hero'], name(d[slug])
    grad, visual = VISUALS[slug]
    demo_only = slug in DEMO_ONLY
    out = [f'''  <main class="feature-page integ-page">
    <!-- ============ HERO ============ -->
    <section class="ah fh">
      <div class="wrap">
        <nav class="crumbs reveal" aria-label="Breadcrumb"><a href="https://getkanal.com/whatsapp-integration">{e(common['breadcrumbIntegrations'])}</a><span aria-hidden="true">/</span><span aria-current="page">{e(nm)}</span></nav>
        <span class="ah__eyebrow ih__eyebrow reveal"><img src="{logo(slug)}" alt="" width="20" height="20" />{e(hero['preheader'])}</span>
        <h1 class="fh__title reveal" style="--d:1">{e(hero['title'])}</h1>
        <p class="ah__sub reveal" style="--d:2">{e(hero['subtitle'])}</p>
        <div class="ah__ctas reveal" style="--d:3">
          {ctas(common, demo_only)}
        </div>
        {TRUST}
      </div>
    </section>

    <section class="sec fh-visual">
      <div class="wrap">
        <div class="fh__panel feature__visual feature__visual--{grad} reveal reveal--up">
          {visual}
        </div>
      </div>
    </section>

    <section class="sec fh-logos">
      <div class="wrap">
      {logos}
      </div>
    </section>

    <!-- ============ PROBLÈME / SOLUTION ============ -->
    <section class="sec">
      <div class="wrap">
        <div class="ps">
          <article class="ps__card reveal reveal--up">
            <span class="ps__tag">The problem</span>
            <h2>{e(t['problem']['title'])}</h2>
            <p>{e(t['problem']['description'])}</p>
          </article>
          <article class="ps__card ps__card--sol feature__visual feature__visual--{'c' if grad != 'c' else 'b'} reveal reveal--up" style="--d:1">
            <div class="ps__inner">
              <span class="ps__tag ps__tag--sol"><svg aria-hidden="true"><use href="#logo-kanal-mark" /></svg>With Kanal</span>
              <h2>{e(t['solution']['title'])}</h2>
              <p>{e(t['solution']['description'])}</p>
            </div>
          </article>
        </div>
''']
    if t.get('stats'):
        cells = ''.join(f'<div class="fstats__cell"><strong>{e(s["value"])}</strong><span>{e(s["label"])}</span></div>' for s in t['stats'])
        out.append(f'        <div class="fstats reveal reveal--up">{cells}</div>\n')
    out.append('      </div>\n    </section>\n')

    feats = t.get('keyFeatures') or []
    if feats:
        cards = ''.join(
            f'<article class="fcard reveal reveal--up" style="--d:{i % 2}"><span class="fcard__ico"><svg viewBox="0 0 24 24" aria-hidden="true">{ICONS[i % len(ICONS)]}</svg></span>'
            f'<h3>{e(f["title"])}</h3><p>{e(f["description"])}</p></article>' for i, f in enumerate(feats))
        if demo_only:
            intro = ('<p>Kanal connects to your store through its documented API. A Kanal expert sets it up with you.</p>'
                     f'<a class="btn btn--light btn--nav" href="https://getkanal.com/demo">{e(common["ctaSecondary"])}</a>')
        else:
            intro = (f'<p>Connect {e(nm)} to Kanal in a few clicks, then compare the plans to see what each one includes.</p>'
                     '<a class="btn btn--light btn--nav" href="https://getkanal.com/pricing">See pricing</a>')
        out.append(f'''
    <!-- ============ FONCTIONNALITÉS ============ -->
    <section class="sec">
      <div class="wrap">
        <div class="shead">
          <h2 class="shead__title reveal">{e(common['keyFeaturesTitle'].capitalize())}.<span class="muted">{e(nm)} and WhatsApp, connected.</span></h2>
          <div class="shead__intro reveal" style="--d:1">{intro}</div>
        </div>
        <div class="fcards fcards--2">{cards}</div>
      </div>
    </section>
''')

    uses = t.get('useCases') or []
    if uses:
        cards = ''.join(
            f'<article class="fcard ucard reveal reveal--up" style="--d:{i}"><span class="ucard__num">{i + 1:02d}</span>'
            f'<h3>{e(u["title"])}</h3><p>{e(u["description"])}</p></article>' for i, u in enumerate(uses))
        out.append(f'''
    <!-- ============ CAS D'USAGE ============ -->
    <section class="sec">
      <div class="wrap">
        <div class="shead">
          <h2 class="shead__title reveal">{e(common['useCasesTitle'])}.<span class="muted">{e(common['useCasesPreheader'].capitalize())} with {e(nm)}.</span></h2>
        </div>
        <div class="fcards fcards--{3 if len(uses) % 3 == 0 else 2}">{cards}</div>
      </div>
    </section>
''')

    if t.get('faq'):
        out.append(faq_block(f'{nm} FAQ', t['faq']))

    res = t.get('resources') or []
    others = ''.join(f'<a href="https://getkanal.com/whatsapp-integration/{s}"><img src="{logo(s)}" alt="" width="18" height="18" />{e(name(d[s]))}</a>'
                     for s in SLUGS if s != slug)
    others = (f'<a href="https://getkanal.com/whatsapp-shopify"><svg aria-hidden="true"><use href="#logo-shopify" /></svg>Shopify</a>' + others)
    res_html = ''
    if res:
        res_html = ('<div class="fmore__col"><h3>' + e(common['resources']) + '</h3><ul class="fres">'
                    + ''.join(f'<li><a href="{a(live(r["href"]))}">{e(r["label"])}{ARROW}</a></li>' for r in res)
                    + '</ul></div>')
    out.append(f'''
    <!-- ============ ALLER PLUS LOIN ============ -->
    <section class="sec">
      <div class="wrap">
        <div class="fmore{' fmore--two' if res else ''} reveal">
          {res_html}
          <div class="fmore__col"><h3>{e(common['otherIntegrations'])}</h3><nav class="fpills ipills" aria-label="{a(common['otherIntegrations'])}">{others}</nav></div>
        </div>
      </div>
    </section>
  </main>
''')
    meta = t['metadata']
    return {'out': f'whatsapp-integration/{slug}.html', 'title': f"{meta['title']} | Kanal", 'description': meta['description'],
            'styles': ['pages.css', 'feature.css', 'integrations.css'], 'scripts': [], 'current': None, 'extra': '',
            'main': ''.join(out)}


def index(d, shopify, logos):
    ix, common = d['index'], d['common']

    def card(href, ico, nm, desc, i):
        return (f'<a class="icard reveal reveal--up" style="--d:{i % 3}" href="{href}">'
                f'<span class="icard__logo">{ico}</span><h2>{e(nm)}</h2><p>{e(desc)}</p>'
                f'<span class="icard__more">{e(ix["viewIntegration"])}{ARROW}</span></a>')
    cards = [card('https://getkanal.com/whatsapp-shopify', '<svg aria-hidden="true"><use href="#logo-shopify" /></svg>',
                  'Shopify', shopify['hero']['subtitle'], 0)]
    cards += [card(f'https://getkanal.com/whatsapp-integration/{s}', f'<img src="{logo(s)}" alt="" width="28" height="28" />',
                   name(d[s]), d[s]['hero']['subtitle'], i + 1) for i, s in enumerate(SLUGS)]
    main = f'''  <main class="integ-page">
    <!-- ============ HERO ============ -->
    <section class="ah fh">
      <div class="wrap">
        <span class="ah__eyebrow reveal">{e(ix['preheader'])}</span>
        <h1 class="ah__title reveal" style="--d:1">{e(ix['title'][0].upper() + ix['title'][1:])}</h1>
        <p class="ah__sub reveal" style="--d:2">{e(ix['subtitle'])}</p>
        <div class="ah__ctas reveal" style="--d:3">
          {ctas(common, False)}
        </div>
        {TRUST}
      </div>
    </section>

    <!-- ============ LISTE ============ -->
    <section class="sec fh-visual">
      <div class="wrap">
        <div class="icards">{''.join(cards)}</div>
      </div>
    </section>

    <section class="sec">
      <div class="wrap">
      {logos}
      </div>
    </section>
  </main>
'''
    meta = ix['metadata']
    return {'out': 'whatsapp-integration.html', 'title': f"{meta['title']} | Kanal", 'description': meta['description'],
            'styles': ['pages.css', 'feature.css', 'integrations.css'], 'scripts': [], 'current': None, 'extra': '',
            'main': main}


def pages(site):
    with open(os.path.join(site, 'messages/en.json'), encoding='utf-8') as f:
        msgs = json.load(f)
    d = msgs['integrationPages']
    logos = logos_block()
    return [index(d, msgs['featurePages']['whatsappShopify'], logos)] + [integration(s, d, logos) for s in SLUGS]
