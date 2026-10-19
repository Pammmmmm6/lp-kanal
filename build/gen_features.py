"""Pages produit (« feature pages ») générées depuis le contenu du site en ligne.

Source : messages/en.json → featurePages.<clé> du dépôt getkanal/getkanal.com
(même contenu que src/components/FeaturePage.tsx). Un seul gabarit pour toutes
les pages au schéma standard : hero, problème / solution, chiffres, fonctionnalités,
capture produit éventuelle, FAQ, ressources et autres fonctionnalités.
Les pages SMS / RCS, au contenu sur mesure, ont leur propre générateur.
"""
import html
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# slug → clé de traduction (src/lib/features.ts)
FEATURES = {
    'whatsapp-shopify': 'whatsappShopify',
    'abandoned-cart-recovery': 'abandonedCartRecovery',
    'post-purchase-upsell': 'postPurchaseUpsell',
    'review-collection': 'reviewCollection',
    'whatsapp-campaigns': 'whatsappCampaigns',
    'ai-chatbot': 'aiChatbot',
    'whatsapp-ai-agent': 'whatsappAiAgent',
    'order-notifications': 'orderNotifications',
    'back-in-stock': 'backInStock',
    'automations': 'automations',
    'whatsapp-business-api': 'whatsappBusinessApi',
    'whatsapp-marketing': 'whatsappMarketing',
    'whatsapp-crm': 'whatsappCrm',
    'whatsapp-broadcast': 'whatsappBroadcast',
    'whatsapp-newsletter': 'whatsappNewsletter',
    'instagram-auto-reply': 'instagramAutoReply',
    'instagram-dm-automation': 'instagramDmAutomation',
    'instagram-chatbot': 'instagramChatbot',
    'instagram-automation': 'instagramAutomation',
}
# Pages sur mesure (gabarit dédié) : listées ici pour les liens « autres fonctionnalités »
BESPOKE = {'sms': 'sms', 'sms-campaigns': 'smsCampaigns', 'sms-automation': 'smsAutomation', 'rcs': 'rcs'}

e = lambda s: html.escape(s, quote=False)
a = lambda s: html.escape(s, quote=True)

CHECK = '<svg viewBox="0 0 12 12"><path d="m3 6.2 2 2L9 4" /></svg>'
KANAL_AV = '<span class="chatcard__av chatcard__av--agent"><svg viewBox="-1.5 -1 24 26" aria-hidden="true"><use href="#logo-kanal" width="96" height="24" /></svg></span>'


# ---------- Visuels animés (même balisage que l'accueil : main.js les anime) ----------
def flow(title, sub, icon, steps, foot, total):
    lis = []
    for i, (strong, small, meta) in enumerate(steps):
        win = i == len(steps) - 1
        cls = 'flow__step flow__step--win' if win else 'flow__step'
        meta_cls = 'flow__meta flow__amount' if win else 'flow__meta'
        lis.append(f'<li class="{cls}" style="--i:{i}"><span class="flow__check" aria-hidden="true">{CHECK}</span>'
                   f'<span class="flow__label"><strong>{e(strong)}</strong><small>{e(small)}</small></span>'
                   f'<span class="{meta_cls}">{e(meta)}</span></li>')
    # icon : symbole du sprite (#logo-…) ou image (assets/…) ; total : montant animé, ou texte fixe
    ico = f'<img src="{icon}" alt="" width="18" height="18" />' if icon.startswith('assets/') else f'<svg aria-hidden="true"><use href="#{icon}" /></svg>'
    tot = (f'<strong>{e(total)}</strong>' if isinstance(total, str)
           else f'<strong data-flow-total="{total}">€{total:,.2f}</strong>')
    return (f'<div class="flow" data-flow>\n<div class="flow__head"><span class="flow__icon">{ico}</span>'
            f'<span class="flow__title"><strong>{e(title)}</strong><small>{e(sub)}</small></span><span class="flow__live">Live</span></div>\n'
            f'<ol class="flow__steps">{"".join(lis)}</ol>\n'
            f'<div class="flow__foot"><span>{e(foot)}</span>{tot}</div>\n</div>')


def camp(title, text_html, chips, img='pack'):
    return (f'<div class="camp" data-camp>\n<div class="camp__head"><span class="flow__icon"><svg aria-hidden="true"><use href="#logo-whatsapp" /></svg></span>'
            f'<span class="flow__title"><strong>{e(title)}</strong><small>WhatsApp campaign · Fincut</small></span><span class="camp__state" data-camp-state>Sending</span></div>\n'
            f'<div class="camp__body"><div class="camp__preview"><img src="assets/fincut/{img}.jpg" alt="" loading="lazy" /><p>{text_html}</p></div>\n'
            f'<div class="camp__row"><span class="camp__label">Audience</span><span class="camp__chips">{"".join(f"<span>{e(c)}</span>" for c in chips)}</span></div>\n'
            '<div class="camp__progress"><div class="camp__row"><span class="camp__label">Sent</span><span class="camp__num"><b data-camp-sent>0</b> / 12,480</span></div><div class="camp__bar"><i data-camp-bar></i></div></div></div>\n'
            '<div class="camp__stats"><div><small>Delivered</small><strong data-camp-delivered>0%</strong></div><div><small>Read</small><strong data-camp-read>0%</strong></div><div><small>Revenue</small><strong data-camp-revenue>€0</strong></div></div>\n</div>')


def chat(ask, sys_icon, sys_text, reply, cta, who='AI agent'):
    row = lambda inner, extra='': f'<div class="chatcard__row" data-chat-step{extra}><div class="chatcard__in">{inner}</div></div>'
    return ('<div class="chatcard" data-chat>\n'
            + row('<div class="chatcard__line chatcard__line--in"><span class="avatar chatcard__av">EL</span><div class="chatcard__col">'
                  f'<span class="chatcard__meta"><strong>Emma Laurent</strong>9:41 am</span><p class="chatcard__bubble">{e(ask)}</p></div></div>') + '\n'
            + row(f'<div class="chatcard__line chatcard__line--sys"><span class="chatcard__sys"><svg aria-hidden="true"><use href="#{sys_icon}" /></svg>{e(sys_text)}</span></div>') + '\n'
            + row(f'<div class="chatcard__line chatcard__line--out"><span class="chatcard__typing" aria-hidden="true"><i></i><i></i><i></i></span>{KANAL_AV}</div>', ' data-chat-typing') + '\n'
            + row(f'<div class="chatcard__line chatcard__line--out"><div class="chatcard__col"><span class="chatcard__meta">9:41 am<span class="chatcard__by">{e(who)}</span></span>'
                  f'<p class="chatcard__bubble">{e(reply)}</p></div>{KANAL_AV}</div>') + '\n'
            + row('<div class="chatcard__line chatcard__line--out"><span class="chatcard__cta"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6.5 4H4.8A1.8 1.8 0 0 0 3 5.8v5.4A1.8 1.8 0 0 0 4.8 13h5.4a1.8 1.8 0 0 0 1.8-1.8V9.5M9 3h4v4M13 3 7.5 8.5" /></svg>'
                  f'{e(cta)}</span><span class="chatcard__av chatcard__av--ghost" aria-hidden="true"></span></div>') + '\n</div>')


CART = flow('Abandoned cart flow', 'Fincut · WhatsApp', 'logo-whatsapp', [
    ('Checkout abandoned', 'Tech T-shirt · Black, M', '2:14 pm'),
    ('Wait 1 hour', 'Smart delay, quiet hours respected', '1 h'),
    ('WhatsApp reminder', 'Product photo · 2 buttons', 'Read'),
    ('Customer reply', 'Answered by the AI agent', '12 s'),
    ('Order recovered', '#1042 · Paid in Shopify', '€35.10')], 'Recovered this month', 12445.20)
INSTA_FLOW = flow('Comment to DM', 'Fincut · Instagram', 'logo-instagram', [
    ('Comment on a post', '@emma: “price?”', '6:02 pm'),
    ('Reply to the comment', 'Public reply, sent instantly', '2 s'),
    ('DM with the product', 'Photo · Shop now button', 'Read'),
    ('Question answered', 'Size and delivery, by the AI', '9 s'),
    ('Order placed', '#1057 · Paid in Shopify', '€49.00')], 'Revenue from DMs this month', 6380.50)
SUPPORT_CHAT = chat('Hi, I\'ve been waiting 3 days for my order. Where is it?? Is this a scam?', 'logo-shopify',
                    'Order #1042 · Picked up by carrier',
                    'I just checked: your order was picked up by the carrier this morning and will be with you within 24 hours. Tap the button below to track it.',
                    'Track my order')
SALE_CAMP = camp('Summer Sale · 30% off', 'Summer Sale is on: <strong>30% off everything</strong> until Sunday. Your favourites are waiting.',
                 ['Bought in 12 months', 'Opted in'])

VISUALS = {
    'whatsapp-shopify': ('b', CART),
    'abandoned-cart-recovery': ('b', CART),
    'post-purchase-upsell': ('d', flow('Post-purchase upsell', 'Fincut · WhatsApp', 'logo-whatsapp', [
        ('Order paid', '#1042 · Tech T-shirt', '10:12 am'),
        ('Wait 3 days', 'After delivery confirmation', '3 d'),
        ('Upsell offer', 'Matching shorts · 15% off', 'Read'),
        ('Customer reply', '“Yes, add it”', '40 s'),
        ('Upsell order', '#1061 · Paid in Shopify', '€29.90')], 'Upsell revenue this month', 4215.60)),
    'review-collection': ('c', flow('Review request', 'Fincut · WhatsApp', 'logo-whatsapp', [
        ('Order delivered', '#1042 · Tech T-shirt', 'Mon'),
        ('Wait 5 days', 'Time to try it on', '5 d'),
        ('Review request', 'Star rating in one tap', 'Read'),
        ('5-star review', '“Perfect fit, fast delivery”', '★★★★★'),
        ('Repeat order', '#1088 · With the review discount', '€42.90')], 'Revenue from reviewers this month', 3120.40)),
    'whatsapp-campaigns': ('d', SALE_CAMP),
    'ai-chatbot': ('b', chat('Is the Tech T-shirt true to size? I\'m between M and L.', 'logo-shopify', 'Product · Tech T-shirt · Slim fit',
                             'It\'s a slim fit, so if you like a relaxed feel, go for the L. I\'ve updated your cart with the L and kept your 10% code.',
                             'Complete my order')),
    'whatsapp-ai-agent': ('b', SUPPORT_CHAT),
    'order-notifications': ('c', SUPPORT_CHAT),
    'back-in-stock': ('c', flow('Back in stock alert', 'Fincut · WhatsApp', 'logo-whatsapp', [
        ('Waitlist sign-up', 'Tech T-shirt · Black, M', 'Tue'),
        ('Product restocked', 'Shopify inventory synced', 'Live'),
        ('Back in stock alert', 'Photo · Buy now button', 'Read'),
        ('Clicked “Buy now”', 'Straight to checkout', '1 min'),
        ('Order placed', '#1073 · Paid in Shopify', '€35.10')], 'Revenue from restocks this month', 5610.80)),
    'automations': ('d', flow('Welcome series', 'Fincut · WhatsApp', 'logo-whatsapp', [
        ('New subscriber', 'Opted in at checkout', '9:30 am'),
        ('Wait 10 minutes', 'Smart delay', '10 min'),
        ('Welcome message', '10% code · 2 buttons', 'Read'),
        ('Clicked the offer', 'Browsing the new collection', '3 min'),
        ('First order', '#1066 · Paid in Shopify', '€42.90')], 'Revenue from flows this month', 8930.40)),
    'whatsapp-business-api': ('c', SALE_CAMP),
    'whatsapp-marketing': ('d', camp('Black Friday · Early access', 'Black Friday starts now for you: <strong>early access to 40% off</strong>, 24 hours before everyone else.',
                                     ['VIP customers', 'Opted in'])),
    'whatsapp-crm': ('b', chat('Can I change the delivery address on my order?', 'logo-shopify', 'Customer profile · 3 orders · VIP',
                               'Of course, Emma. I\'ve updated the address on order #1042: it now ships to your office in Lyon.',
                               'View my order')),
    'whatsapp-broadcast': ('c', camp('New collection drop', 'The <strong>new Tech collection</strong> is live: 6 colours, same perfect fit. Shop it before it sells out.',
                                     ['All subscribers', 'France'], 'polo-navy')),
    'whatsapp-newsletter': ('d', camp('Weekly newsletter', 'This week: <strong>new colours</strong>, a styling guide and early access for subscribers.',
                                      ['Newsletter subscribers', 'Opted in'], 'giftbox')),
    'instagram-auto-reply': ('d', INSTA_FLOW),
    'instagram-dm-automation': ('d', INSTA_FLOW),
    'instagram-chatbot': ('b', chat('Do you ship to Belgium? And is the polo in stock in navy?', 'logo-instagram', 'Instagram DM · @fincut',
                                    'Yes to both! The navy polo is in stock in every size, and delivery to Belgium takes 2 to 3 days, free from €60.',
                                    'Shop the polo')),
    'instagram-automation': ('d', INSTA_FLOW),
}

ICONS = [
    '<path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48 2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48 2.83-2.83"/>',
    '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
    '<path d="M18 20V10M12 20V4M6 20v-6"/>',
    '<path d="M12 3 4 6v6c0 5 3.4 8 8 9 4.6-1 8-4 8-9V6z"/><path d="m9 12 2 2 4-4"/>',
    '<path d="m12 3 2.5 5.2 5.7.8-4.1 4 1 5.7L12 16l-5.1 2.7 1-5.7-4.1-4 5.7-.8z"/>',
]


def live(href):
    return href if href.startswith('http') else 'https://getkanal.com' + href


def logos_block():
    s = open(os.path.join(ROOT, 'src/pages/case-studies.html'), encoding='utf-8').read()
    i = s.index('<div class="logos reveal">')
    j = s.index('</div>\n      </div>', i) + len('</div>\n      </div>')
    return s[i:j]


# ---------- Composants partagés : défilement de fonctionnalités et bloc « pour aller plus loin » ----------
KEEP = {'whatsapp': 'WhatsApp', 'instagram': 'Instagram', 'shopify': 'Shopify', 'ai': 'AI', 'sms': 'SMS', 'rcs': 'RCS',
        'ugc': 'UGC', 'api': 'API', 'crm': 'CRM', 'dm': 'DM', 'klaviyo': 'Klaviyo', 'kanal': 'Kanal', 'mcp': 'MCP'}


def sc(text):
    """Title Case → sentence case, en gardant les noms propres et sigles."""
    out = []
    for i, w in enumerate(text.split(' ')):
        core = w.strip('&,.:()')
        if core.lower() in KEEP:
            out.append(w.replace(core, KEEP[core.lower()]))
        elif i == 0:
            out.append(w[:1].upper() + w[1:])
        else:
            out.append(w if (core.isupper() and len(core) > 1) else w.lower())
    return ' '.join(out).replace('WhatsApp business', 'WhatsApp Business')


def menu_labels():
    """Libellés du menu Produit validé : slug → texte."""
    top = open(os.path.join(ROOT, 'src/partials/top.html'), encoding='utf-8').read()
    return {m.group(1): html.unescape(m.group(2)) for m in re.finditer(r'<a href="https://getkanal\.com/([^"]+)">([^<]+)</a>', top)}


def fx_ui(name, icon, titles, active):
    rows = ''.join(
        f'<li class="fxui__row{" is-on" if i == active else (" is-done" if i < active else "")}">'
        f'<span class="fxui__ico"><svg viewBox="0 0 24 24" aria-hidden="true">{ICONS[i % len(ICONS)]}</svg></span>'
        f'<b>{e(t)}</b><i class="fxui__sw" aria-hidden="true"></i></li>' for i, t in enumerate(titles))
    return (f'<div class="fxui" aria-hidden="true"><div class="flow__head"><span class="flow__icon">{icon}</span>'
            f'<span class="flow__title"><strong>{e(name)}</strong><small>Fincut · Kanal</small></span><span class="flow__live">Live</span></div>'
            f'<ul class="fxui__rows">{rows}</ul></div>')


def fx_section(uid, head_html, items, name, icon, grads='bcd'):
    """Titres collants à gauche, une grande carte par élément (texte + panneau peint avec la liste)."""
    titles = [it['title'] for it in items]
    nav = ''.join(f'<a href="#{uid}-{i + 1}"{" class=\"is-on\"" if i == 0 else ""}>{e(t)}</a>' for i, t in enumerate(titles))
    cards = ''.join(
        f'\n          <article class="fx__card reveal reveal--up" id="{uid}-{i + 1}">'
        f'\n            <div class="fx__text"><p class="fx__eyebrow">{icon}{e(name)} · {i + 1:02d}</p><h3>{e(it["title"])}</h3>'
        f'<p class="fx__desc">{e(it["description"])}</p>{it.get("extra", "")}</div>'
        f'\n            <div class="fx__media feature__visual feature__visual--{grads[i % len(grads)]}">{it.get("media") or fx_ui(name, icon, titles, i)}</div>'
        f'\n          </article>' for i, it in enumerate(items))
    return (f'\n    <section class="sec" id="{uid}">\n      <div class="wrap">\n        {head_html}'
            f'\n        <div class="fx" data-fx>\n          <nav class="fx__nav" aria-label="{a(name)}">{nav}</nav>'
            f'\n          <div class="fx__list">{cards}\n          </div>\n        </div>\n      </div>\n    </section>\n')


def ulist(items, label=None):
    """Cas d'usage ou étapes : une seule surface, colonnes séparées par un filet."""
    cells = ''.join(f'<article class="ulist__item"><span class="ulist__num">{e(label(i)) if label else f"{i + 1:02d}"}</span>'
                    f'<h3>{e(it["title"])}</h3><p>{e(it["description"])}</p>{it.get("extra", "")}</article>' for i, it in enumerate(items))
    return f'<div class="ulist reveal reveal--up" style="--n:{len(items)}">{cells}</div>'


EXT = ('<svg viewBox="0 0 10 10" aria-hidden="true"><path d="M3 7 7 3M4 3h3v3" fill="none" stroke="currentColor" '
       'stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" /></svg>')


def related(label, links, resources=None, res_label='Go further'):
    """Grands liens à gauche (comme le menu Produit), carte peinte à droite : guides, sinon études de cas."""
    big = ''.join(f'<a href="{a(h)}">{ic}{e(t)}</a>' for h, t, ic in links)
    resources = resources or []
    if len(resources) == 1:
        r = resources[0]
        card = (f'<a class="mega__card mega__card--a" href="{a(live(r["href"]))}"><span class="mega__card-text"><strong>{e(res_label)}</strong>'
                f'<span>{e(r["label"])}</span></span><span class="mega__card-btn">Read the guide</span></a>')
    elif resources:
        items = ''.join(f'<a href="{a(live(r["href"]))}">{e(r["label"])}{EXT}</a>' for r in resources)
        card = (f'<div class="mega__card mega__card--a"><span class="mega__card-text"><strong>{e(res_label)}</strong></span>'
                f'<div class="rel__links">{items}</div></div>')
    else:
        card = ('<a class="mega__card mega__card--a" href="https://getkanal.com/case-studies"><span class="mega__card-text"><strong>Case studies</strong>'
                '<span>See how Shopify brands grow their sales with Kanal.</span></span><span class="mega__card-btn">Read stories</span></a>')
    return (f'\n    <section class="sec">\n      <div class="wrap">\n        <div class="rel reveal reveal--up">'
            f'\n          <div class="rel__main"><p class="rel__label">{e(label)}</p><nav class="rel__big" aria-label="{a(label)}">{big}</nav></div>'
            f'\n          {card}\n        </div>\n      </div>\n    </section>\n')


def page(slug, key, d, labels, logos):
    t = d[key]
    hero, common = t['hero'], d['common']
    grad, visual = VISUALS[slug]
    out = []
    out.append(f'''  <main class="feature-page">
    <!-- ============ HERO ============ -->
    <section class="ah fh">
      <div class="wrap">
        <span class="ah__eyebrow reveal">{e(hero['preheader'])}</span>
        <h1 class="fh__title reveal" style="--d:1">{e(hero['title'])}</h1>
        <p class="ah__sub reveal" style="--d:2">{e(hero['subtitle'])}</p>
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
''')
    stats = t.get('stats') or []
    if stats:
        cells = ''.join(f'<div class="fstats__cell"><strong>{e(s["value"])}</strong><span>{e(s["label"])}</span></div>' for s in stats)
        out.append(f'        <div class="fstats reveal reveal--up">{cells}</div>\n')
    out.append('      </div>\n    </section>\n')

    feats = t.get('keyFeatures') or []
    if feats:
        head = ('<div class="shead"><h2 class="shead__title reveal">What you get with Kanal.<span class="muted">Built for Shopify stores.</span></h2>'
                '<div class="shead__intro reveal" style="--d:1"><p>Connect your store in a few clicks, then compare the plans to see what each one includes.</p>'
                '<a class="btn btn--light btn--nav" href="https://getkanal.com/pricing">See pricing</a></div></div>')
        icon = f'<svg aria-hidden="true"><use href="#{"logo-instagram" if slug.startswith("instagram") else "logo-whatsapp"}" /></svg>'
        out.append(fx_section('features', head, feats, sc(hero['preheader']), icon))

    shot = t.get('screenshot')
    if shot:
        from PIL import Image
        size = Image.open(os.path.join(ROOT, 'assets/app', os.path.basename(shot['src']))).size
        cap = f'<figcaption>{e(shot["caption"])}</figcaption>' if shot.get('caption') else ''
        out.append(f'''
    <section class="sec">
      <div class="wrap">
        <figure class="fshot reveal reveal--up"><div class="fshot__frame feature__visual feature__visual--b"><img src="assets/app/{os.path.basename(shot['src'])}" alt="{a(shot['alt'])}" width="{size[0]}" height="{size[1]}" loading="lazy" /></div>{cap}</figure>
      </div>
    </section>
''')

    faq = t.get('faq') or []
    if faq:
        items = ''.join(f'''
          <details{' open' if i == 0 else ''}>
            <summary>{e(q['question'])}<span class="faq__icon"></span></summary>
            <div class="faq__body"><p>{e(q['answer'])}</p></div>
          </details>''' for i, q in enumerate(faq))
        out.append(f'''
    <!-- ============ FAQ ============ -->
    <section class="sec" id="faq">
      <div class="wrap wrap--narrow cols cols--top">
        <h2 class="reveal">{e(hero['preheader'])} FAQ</h2>
        <div class="faq reveal">{items}
        </div>
      </div>
    </section>
''')

    order = [x for x in labels if x != slug]
    k = list(labels).index(slug) if slug in labels else 0
    picks = (order[k:] + order[:k])[:6]
    menu = menu_labels()
    links = [(f'https://getkanal.com/{x}', menu.get(x) or sc(labels[x]), '') for x in picks]
    out.append(related(common['otherFeatures'], links, t.get('resources'), common['resources']))
    out.append('  </main>\n')
    meta = t['metadata']
    return {'out': f'{slug}.html', 'title': f"{meta['title']} | Kanal", 'description': meta['description'],
            'styles': ['pages.css', 'feature.css'], 'scripts': [], 'current': None, 'extra': '',
            'main': ''.join(out)}


def pages(site):
    with open(os.path.join(site, 'messages/en.json'), encoding='utf-8') as f:
        d = json.load(f)['featurePages']
    labels = {s: d[k]['hero']['preheader'] for s, k in {**FEATURES, **BESPOKE}.items() if k in d}
    logos = logos_block()
    return [page(slug, key, d, labels, logos) for slug, key in FEATURES.items()]
