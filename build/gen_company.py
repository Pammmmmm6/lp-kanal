"""Company and marketing pages, generated from the live site repository.

Sources (getkanal/getkanal.com, English):
  * messages/en.json → contact, careers, partnersPage, agency, premiumSetup, testimonials
  * src/components/InstagramPage.tsx → the `COPY.en` object (kept in the component on
    the live site) and src/app/[locale]/instagram/page.tsx → its metadata
  * Sanity (public CDN API, read-only) → partners and legal pages
  * join.com public jobs widget API → open positions on the careers page

Sanity and join.com answers are snapshotted in build/data/*.json so the build works
offline and stays reproducible. Set KANAL_REFRESH=1 to fetch them again.

Pages: contact, careers, partners, whatsapp-marketing-agency, premium-setup,
instagram, legal/privacy, legal/terms, legal/sub-processors.
"""
import datetime as dt
import html
import json
import os
import re
import urllib.parse
import urllib.request

from gen_features import logos_block

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, 'build', 'data')

SANITY = 'https://he1ih8vg.apicdn.sanity.io/v2023-05-03/data/query/production'
QUERIES = {
    'sanity-partners.json': '*[_type == "partner"] | order(order asc) { "slug": slug.current, name, description, "logoUrl": logo.asset->url, websiteUrl, category, specialties, offer, featured, order }',
    'sanity-legal.json': '*[_type == "legalPage"] | order(title asc) { "slug": slug.current, title, lastUpdated, content }',
}
JOIN_URL = 'https://join.com/api/widget/jobs?page=1&pageSize=25'
SHOPIFY_APP = 'https://apps.shopify.com/kanal-marketing-ai'

e = lambda s: html.escape(s, quote=False)
a = lambda s: html.escape(s, quote=True)


# ---------- Données externes (instantané local, rafraîchi à la demande) ----------
def _fetch(url, headers=None):
    req = urllib.request.Request(url, headers={'User-Agent': 'kanal-mockup', **(headers or {})})
    with urllib.request.urlopen(req, timeout=15) as r:
        return json.loads(r.read().decode('utf-8'))


def snapshot(name, site):
    path = os.path.join(DATA, name)
    if os.environ.get('KANAL_REFRESH') == '1' or not os.path.exists(path):
        try:
            if name in QUERIES:
                data = _fetch(SANITY + '?query=' + urllib.parse.quote(QUERIES[name]))
            else:  # jeton public du widget join.com, lu dans CareersPage.tsx
                src = open(os.path.join(site, 'src/components/CareersPage.tsx'), encoding='utf-8').read()
                bundle = urllib.request.urlopen(re.search(r"'(https://join\.com/api/widget/bundle/[^']+)'", src).group(1), timeout=15).read().decode()
                token = re.search(r'"accessToken":"([^"]+)"', bundle).group(1)
                data = _fetch(JOIN_URL, {'access-token': token})
            os.makedirs(DATA, exist_ok=True)
            with open(path, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=1)
        except Exception as err:  # pas de réseau : on garde l'instantané
            print(f'gen_company: could not refresh {name} ({err})')
    if not os.path.exists(path):
        return None
    with open(path, encoding='utf-8') as f:
        return json.load(f)


# ---------- Casse de phrase pour titres, libellés et boutons ----------
KEEP = {'WhatsApp', 'Shopify', 'Kanal', 'Instagram', 'Meta', 'Klaviyo', 'Stripe', 'AI', 'FAQ', 'ROI', 'ROAS',
        'VIP', 'API', 'SMS', 'RCS', 'DM', 'DMs', 'CRM', 'RFM', 'SaaS', 'UGC', 'CV', 'LinkedIn', 'I', 'A/B', 'Reels'}


def sc(s):
    out = []
    for i, word in enumerate(s.split(' ')):
        parts = []
        for j, p in enumerate(word.split('-')):
            core = re.sub(r'^\W+|\W+$', '', p)
            keep = (i == 0 and j == 0) or core in KEEP or (len(core) > 1 and core.isupper()) \
                or re.search(r'[a-z][A-Z]', core) or re.match(r'\d', core)
            parts.append(p if keep else p.lower())
        out.append('-'.join(parts))
    return ' '.join(out)


def page_title(t):
    return t if re.search(r'\bKanal\b', t) else f'{t} | Kanal'


def live(href):
    return href if href.startswith(('http', 'mailto:', '#')) else 'https://getkanal.com' + href


# ---------- Blocs partagés ----------
TRUST = '''<div class="trust{cls} reveal" style="--d:{d}">
              <a class="trust__rating" href="https://apps.shopify.com/kanal-marketing-ai/reviews" target="_blank" rel="noopener"><span class="trust__stars" aria-hidden="true">★★★★★</span><span class="trust__link">5/5 on Shopify</span></a>
              <span class="trust__sep" aria-hidden="true"></span>
              <span class="trust__count">500+ brands trust us</span>
            </div>'''
ARROW = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 8h9M8.5 4l4 4-4 4" /></svg>'
EXT = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6.5 4H4.8A1.8 1.8 0 0 0 3 5.8v5.4A1.8 1.8 0 0 0 4.8 13h5.4a1.8 1.8 0 0 0 1.8-1.8V9.5M9 3h4v4M13 3 7.5 8.5" /></svg>'
TICK = '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="m3 6.2 2 2L9 4" /></svg>'
CROSS = '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M4 4l4 4M8 4 4 8" /></svg>'
OK_ICON = '<span class="dform__ok"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="m6 10.4 2.6 2.6L14 7.4" /></svg></span>'
MARK = '<span class="dform__mark"><svg aria-hidden="true"><use href="#logo-kanal-mark" /></svg></span>'
HONEYPOT = '<input class="hp" type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true" />'

ICONS = {
    'zap': '<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>',
    'list': '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
    'chat': '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    'clock': '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
    'chart': '<path d="M18 20V10M12 20V4M6 20v-6"/>',
    'shield': '<path d="M12 3 4 6v6c0 5 3.4 8 8 9 4.6-1 8-4 8-9V6z"/><path d="m9 12 2 2 4-4"/>',
    'star': '<path d="m12 3 2.5 5.2 5.7.8-4.1 4 1 5.7L12 16l-5.1 2.7 1-5.7-4.1-4 5.7-.8z"/>',
    'cart': '<circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/><path d="M2 3h3l2.6 12.2a1.6 1.6 0 0 0 1.6 1.3h8.6a1.6 1.6 0 0 0 1.6-1.2L21 8H6"/>',
    'filter': '<path d="M3 5h18l-7 8v6l-4 2v-8z"/>',
    'reply': '<path d="M9 17 4 12l5-5"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/>',
    'story': '<circle cx="12" cy="12" r="9" stroke-dasharray="3 3"/><circle cx="12" cy="12" r="4"/>',
    'help': '<circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01"/>',
    'repeat': '<path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14M7 22l-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>',
    'layers': '<path d="m12 2 10 5-10 5L2 7z"/><path d="m2 17 10 5 10-5M2 12l10 5 10-5"/>',
    'tag': '<path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L2 12V2h10l8.6 8.6a2 2 0 0 1 0 2.8z"/><path d="M7 7h.01"/>',
    'search': '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.6-3.6"/>',
    'grid': '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    'users': '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
    'code': '<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>',
    'cloud': '<path d="M18 10h-1.3A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>',
    'pin': '<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
    'briefcase': '<rect x="2.5" y="7" width="19" height="13" rx="2"/><path d="M8.5 7V5a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v2"/>',
    'home': '<path d="m3 11 9-7 9 7"/><path d="M5 10v10h14V10"/>',
}


def ico(name, cls='ico'):
    return f'<svg class="{cls}" viewBox="0 0 24 24" aria-hidden="true">{ICONS[name]}</svg>'


def logo(name):
    return f'<svg aria-hidden="true"><use href="#logo-{name}" /></svg>'


def shead(title, intro, btn=None, muted=None):
    m = f'<span class="muted">{e(muted)}</span>' if muted else ''
    b = f'<a class="btn btn--light btn--nav" href="{a(btn[1])}"{ext_attrs(btn[1])}>{e(btn[0])}</a>' if btn else ''
    return f'''        <div class="shead">
          <h2 class="shead__title reveal">{e(title)}{m}</h2>
          <div class="shead__intro reveal" style="--d:1"><p>{e(intro)}</p>{b}</div>
        </div>
'''


def ext_attrs(href):
    return ' target="_blank" rel="noopener"' if href.startswith('http') and 'getkanal.com' not in href else ''


def faq(title, items, sub=None):
    body = ''.join(f'''
          <details{' open' if i == 0 else ''}>
            <summary>{e(q['question'])}<span class="faq__icon"></span></summary>
            <div class="faq__body"><p>{e(q['answer'])}</p></div>
          </details>''' for i, q in enumerate(items))
    s = f'<p class="cfaq__sub">{e(sub)}</p>' if sub else ''
    return f'''
    <!-- ============ FAQ ============ -->
    <section class="sec" id="faq">
      <div class="wrap wrap--narrow cols cols--top">
        <div class="cfaq__head reveal"><h2>{e(title)}</h2>{s}</div>
        <div class="faq reveal">{body}
        </div>
      </div>
    </section>
'''


def field(label, name, kind='text', placeholder='', err='', optional=False, extra=''):
    opt = ' <em>Optional</em>' if optional else ''
    req = '' if optional else ' required'
    ctl = (f'<textarea name="{name}" rows="5" placeholder="{a(placeholder)}"{req}{extra}></textarea>' if kind == 'textarea'
           else f'<input type="{kind}" name="{name}" placeholder="{a(placeholder)}"{req}{extra} />')
    er = f'<span class="dform__err">{e(err)}</span>' if err else ''
    return f'<label class="dform__field"><span class="dform__label">{e(label)}{opt}</span>{ctl}{er}</label>'


def aui_rows(rows):
    return '<ul class="aui__rows">' + ''.join(rows) + '</ul>'


def check_row(text, em=''):
    m = f'<em>{e(em)}</em>' if em else ''
    return f'<li><span class="aui__tick" aria-hidden="true">{TICK}</span>{e(text)}{m}</li>'


def toggle_row(text):
    return f'<li>{e(text)}<span class="aui__switch" aria-hidden="true"></span></li>'


def mini_chat(question, answer, cta):
    return (f'<div class="minichat"><div class="minichat__in">{e(question)}</div>'
            f'<div class="minichat__out"><div class="minichat__txt">{e(answer)}</div><span>{e(cta)}</span></div></div>')


# =====================================================================
#  Contact
# =====================================================================
def contact(d):
    t = d['contact']
    reasons = [('whatsapp-banned', t['reasonWhatsappBanned']), ('partner', t['reasonPartner']), ('other', t['reasonOther'])]
    chips = ''.join(f'<button type="button" role="radio" aria-checked="false" data-v="{v}">{e(l)}</button>' for v, l in reasons)
    company_label = re.sub(r'\s*\(optional\)\s*$', '', t['companyLabel'], flags=re.I)
    main = f'''  <main class="company-page">
    <!-- ============ HERO + FORMULAIRE ============ -->
    <section class="dh">
      <div class="wrap">
        <div class="dh__grid">
          <div class="dh__text">
            <span class="ah__eyebrow reveal">{e(sc(t['preheader']))}</span>
            <h1 class="dh__title reveal" style="--d:1">{e(t['h1'])}</h1>
            <p class="dh__sub reveal" style="--d:2">{e(t['subtitle'])}</p>
            {TRUST.format(cls=' dh__trust', d=3)}
          </div>

          <div class="dh__panel feature__visual feature__visual--b reveal reveal--up" style="--d:2">
            <form class="dform" id="contactForm" data-form novalidate>
              <div class="dform__head">
                {MARK}
                <span><strong>Kanal</strong><small>{e(t['successMessage'].split('. ', 1)[-1])}</small></span>
              </div>
              <div class="dform__row">
                {field(t['nameLabel'], 'name', 'text', t['namePlaceholder'], 'Enter your name.', extra=' autocomplete="name"')}
                {field(t['emailLabel'], 'email', 'email', t['emailPlaceholder'], 'Enter a valid email.', extra=' autocomplete="email"')}
              </div>
              {field(company_label, 'company', 'text', t['companyPlaceholder'], optional=True, extra=' autocomplete="organization"')}
              <div class="dform__field" data-radio="reason" data-required>
                <span class="dform__label" id="reasonLabel">{e(t['reasonLabel'])}</span>
                <div class="dform__chips dform__chips--wrap" role="radiogroup" aria-labelledby="reasonLabel">{chips}</div>
                <input type="hidden" name="reason" />
                <p class="dform__hint" data-hint-for="whatsapp-banned other" hidden>{e(t['offTargetHint'])}</p>
                <span class="dform__err">{e(t['reasonPlaceholder'])}.</span>
              </div>
              {field(t['messageLabel'], 'message', 'textarea', t['messagePlaceholder'], 'Write your message.')}
              {HONEYPOT}
              <button type="submit" class="btn btn--dark btn--lg dform__submit" data-sending="{a(t['sending'])}">{e(t['submit'])}{ARROW}</button>
              <div class="dform__done" aria-live="polite">
                {OK_ICON}
                <strong>{e(t['successTitle'])}</strong>
                <small>{e(t['successMessage'])}</small>
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>

    <section class="sec plogos-demo">
      <div class="wrap">
      {logos_block()}
      </div>
    </section>
  </main>
'''
    return {'out': 'contact.html', 'title': page_title(t['title']), 'description': t['metaDescription'],
            'styles': ['pages.css', 'demo.css', 'company.css'], 'scripts': ['company.js'], 'current': None,
            'extra': '', 'main': main}


# =====================================================================
#  Careers
# =====================================================================
def careers(d, site):
    t = d['careers']
    f = t['form']
    jobs = (snapshot('join-jobs.json', site) or {}).get('jobs', [])
    cards = []
    for i, j in enumerate(jobs):
        pills = [('briefcase', j.get('category')), ('pin', j.get('place')),
                 ('home', (j.get('workplaceType') or '').capitalize() or None), ('users', j.get('employmentType'))]
        pill_html = ''.join(f'<span class="cpill">{ico(n)}{e(v)}</span>' for n, v in pills if v)
        cards.append(f'''          <article class="cjob reveal reveal--up" style="--d:{i % 3}">
            <div class="cjob__main"><h3>{e(j['title'])}</h3><div class="cjob__pills">{pill_html}</div></div>
            <a class="btn btn--dark btn--nav" href="{a(j['url'])}" target="_blank" rel="noopener">Apply{EXT}</a>
          </article>
''')
    jobs_html = ''.join(cards) or f'''          <div class="cjob cjob--empty reveal"><p>{e(t['spontaneous']['title'])}</p><a class="btn btn--light btn--nav" href="#spontaneous">{e(sc(t['hero']['cta']))}</a></div>
'''
    main = f'''  <main class="company-page">
    <!-- ============ HERO ============ -->
    <section class="ah">
      <div class="wrap">
        <span class="ah__eyebrow reveal">{e(sc(t['preheader']))}</span>
        <h1 class="ah__title reveal" style="--d:1">{e(t['hero']['title'])}</h1>
        <p class="ah__sub reveal" style="--d:2">{e(t['hero']['subtitle'])}</p>
        <div class="ah__ctas reveal" style="--d:3">
          <a class="btn btn--dark btn--lg" href="#spontaneous">{e(sc(t['hero']['cta']))}</a>
        </div>
      </div>
    </section>

    <!-- ============ POSTES OUVERTS ============ -->
    <section class="sec cfirst" id="openings">
      <div class="wrap">
{shead(t['openings']['title'], t['openings']['subtitle'])}        <div class="cjobs">
{jobs_html}        </div>
      </div>
    </section>

    <!-- ============ CANDIDATURE SPONTANÉE ============ -->
    <section class="sec" id="spontaneous">
      <div class="wrap">
        <div class="csplit">
          <div class="csplit__text">
            <h2 class="reveal">{e(t['spontaneous']['title'])}</h2>
            <p class="reveal" style="--d:1">{e(t['spontaneous']['subtitle'])}</p>
          </div>
          <div class="dh__panel feature__visual feature__visual--d reveal reveal--up" style="--d:1">
            <form class="dform" id="careersForm" data-form novalidate>
              <div class="dform__head">
                {MARK}
                <span><strong>{e(sc(t['hero']['cta']))}</strong><small>Kanal · {e(sc(t['preheader']))}</small></span>
              </div>
              <div class="dform__row">
                {field(f['name'], 'name', 'text', '', 'Enter your name.', extra=' autocomplete="name"')}
                {field(f['email'], 'email', 'email', '', 'Enter a valid email.', extra=' autocomplete="email"')}
              </div>
              {field(re.sub(r'\s*\(optional\)\s*$', '', f['link'], flags=re.I), 'link', 'url', 'https://', 'Enter a valid link.', optional=True)}
              {field(f['message'], 'message', 'textarea', '', 'Tell us a bit more (20 characters minimum).', extra=' minlength="20"')}
              {HONEYPOT}
              <button type="submit" class="btn btn--dark btn--lg dform__submit" data-sending="{a(f['sending'])}">{e(f['submit'])}{ARROW}</button>
              <div class="dform__done" aria-live="polite">
                {OK_ICON}
                <strong>{e(f['successTitle'])}</strong>
                <small>{e(f['successBody'])}</small>
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  </main>
'''
    return {'out': 'careers.html', 'title': page_title(t['metadata']['title']), 'description': t['metadata']['description'],
            'styles': ['pages.css', 'demo.css', 'company.css'], 'scripts': ['company.js'], 'current': None,
            'extra': '', 'main': main}


# =====================================================================
#  Partners
# =====================================================================
CAT_ICON = {'app': 'grid', 'agency': 'users', 'integration': 'code', 'saas': 'cloud'}


def partners(d, site):
    t = d['partnersPage']
    fl = t['filters']
    data = (snapshot('sanity-partners.json', site) or {}).get('result') or []
    data = sorted(data, key=lambda p: (not p.get('featured'), p.get('order') if p.get('order') is not None else 1e9))
    cats = []
    for p in data:
        if p['category'] not in cats:
            cats.append(p['category'])
    specs = sorted({s for p in data for s in (p.get('specialties') or [])})
    cap = lambda s: s[:1].upper() + s[1:]

    cat_btns = f'<button type="button" class="cchip" aria-pressed="true" data-cat="all">{e(fl["all"])}</button>' + ''.join(
        f'<button type="button" class="cchip" aria-pressed="false" data-cat="{a(c)}">{ico(CAT_ICON.get(c, "grid"))}{e(fl.get(c, cap(c)))}</button>' for c in cats)
    spec_btns = ''.join(f'<button type="button" class="cchip cchip--sm" aria-pressed="false" data-spec="{a(s)}">{ico("filter")}{e(cap(s))}</button>' for s in specs)

    cards = []
    for i, p in enumerate(data):
        img = f'assets/partners/{p["slug"]}.png'
        logo_html = (f'<img src="{img}" alt="" width="48" height="48" loading="lazy" />' if os.path.exists(os.path.join(ROOT, img))
                     else f'<span>{e(p["name"][:1])}</span>')
        sp = ''.join(f'<span class="cpill cpill--sm">{e(cap(s))}</span>' for s in p.get('specialties') or [])
        offer = f'<p class="pcard__offer">{ico("tag")}{e(p["offer"])}</p>' if p.get('offer') else ''
        feat = f'<span class="pcard__feat">{e(t["card"]["featured"])}</span>' if p.get('featured') else ''
        hay = ' '.join([p['name'], p.get('description') or '', *(p.get('specialties') or [])]).lower()
        cards.append(f'''          <article class="pcard reveal reveal--up" style="--d:{i % 3}" data-cat="{a(p['category'])}" data-specs="{a(' '.join(p.get('specialties') or []))}" data-text="{a(hay)}">
            {feat}<div class="pcard__head"><span class="pcard__logo">{logo_html}</span><div><h3>{e(p['name'])}</h3><span class="cpill cpill--sm">{ico(CAT_ICON.get(p['category'], 'grid'))}{e(fl.get(p['category'], cap(p['category'])))}</span></div></div>
            <p class="pcard__desc">{e(' '.join((p.get('description') or '').split()))}</p>
            <div class="pcard__specs">{sp}</div>
            {offer}
            <a class="btn btn--dark btn--nav pcard__cta" href="{a(p['websiteUrl'])}" target="_blank" rel="noopener">{e(sc(t['card']['visitBtn']))}{EXT}</a>
          </article>
''')
    main = f'''  <main class="company-page">
    <!-- ============ HERO ============ -->
    <section class="ah">
      <div class="wrap">
        <span class="ah__eyebrow reveal">{e(sc(t['preheader']))}</span>
        <h1 class="ah__title reveal" style="--d:1">{e(sc(t['title']))}</h1>
        <p class="ah__sub reveal" style="--d:2">{e(t['subtitle'])}</p>
        <div class="ah__ctas reveal" style="--d:3">
          <a class="btn btn--dark btn--lg" href="{SHOPIFY_APP}" target="_blank" rel="noopener"><svg class="btn__logo" aria-hidden="true"><use href="#logo-shopify" /></svg>{e(sc(t['installBtn']))}</a>
          <a class="btn btn--soft btn--lg" href="https://getkanal.com/demo">{e(t['demoBtn'])}</a>
        </div>
        {TRUST.format(cls='', d=4)}
      </div>
    </section>

    <section class="sec fh-logos cfirst">
      <div class="wrap">
      {logos_block()}
      </div>
    </section>

    <!-- ============ ANNUAIRE ============ -->
    <section class="sec" id="directory">
      <div class="wrap">
        <div class="pdir" data-partners>
          <div class="pfilters reveal">
            <label class="psearch">{ico('search')}<span class="sr-only">{e(fl['searchPlaceholder'])}</span><input type="search" placeholder="{a(fl['searchPlaceholder'])}" data-search autocomplete="off" /></label>
            <div class="pfilters__group"><span class="pfilters__label">{e(fl['categoryLabel'])}</span><div class="pfilters__chips">{cat_btns}</div></div>
            {f'<div class="pfilters__group"><span class="pfilters__label">{e(fl["specialtyLabel"])}</span><div class="pfilters__chips">{spec_btns}</div></div>' if specs else ''}
            <div class="pfilters__foot" data-summary hidden><span><b data-count>{len(data)}</b> {e(fl['resultsLabel'])}</span><button type="button" class="btn btn--light btn--nav" data-clear>{e(fl['clearAll'])}</button></div>
          </div>
          <div class="pgrid">
{''.join(cards)}          </div>
          <div class="pempty" data-empty{'' if not data else ' hidden'}>
            {ico('search')}
            <p>{e(t['emptyState'])}</p>
            <button type="button" class="btn btn--light btn--nav" data-clear>{e(fl['clearAll'])}</button>
          </div>
        </div>
      </div>
    </section>
  </main>
'''
    return {'out': 'partners.html', 'title': page_title(t['title']), 'description': t['subtitle'],
            'styles': ['pages.css', 'feature.css', 'company.css'], 'scripts': ['company.js'], 'current': None,
            'extra': '', 'main': main}


# =====================================================================
#  WhatsApp marketing agency
# =====================================================================
def agency(d):
    t = d['agency']
    stats = ''.join(f'<div class="fstats__cell"><strong>{e(s["value"])}</strong><span>{e(sc(s["label"]))}</span></div>' for s in t['stats'])
    sv = t['services']
    services = ''.join(
        f'''<article class="fcard reveal reveal--up" style="--d:{i % 3}"><span class="fcard__ico fcard__ico--wa">{logo('whatsapp')}</span>'''
        f'''<h3>{e(sc(s['title']))}</h3><p>{e(s['description'])}</p>'''
        f'''<a class="btn btn--light btn--nav fcard__more" href="{a(live(s['href']))}">{e(sv['learnMore'])}{ARROW}</a></article>'''
        for i, s in enumerate(sv['items']))
    wk = t['whyKanal']
    why = ''.join(f'''<article class="why__card"><span class="why__tick" aria-hidden="true">{TICK}</span><h3>{e(sc(w['title']))}</h3><p>{e(w['description'])}</p></article>'''
                  for w in wk['items'])
    pr = t['process']
    arts = [
        ('b', f'<div class="aui"><div class="aui__head"><strong>Store audit</strong><span class="aui__chip">Strategy</span></div>'
              + aui_rows([check_row('Customer journey'), check_row('Current channels'), check_row('Revenue goals')]) + '</div>'),
        ('c', '<div class="aui"><div class="aui__head"><strong>Integrations</strong><span class="aui__ok">Connected</span></div>'
              + aui_rows([f'<li><span class="aui__ico aui__ico--brand">{logo("shopify")}</span>Shopify<em>Synced</em></li>',
                          f'<li><span class="aui__ico aui__ico--brand">{logo("whatsapp")}</span>WhatsApp<em>Live</em></li>',
                          f'<li><span class="aui__ico aui__ico--nl">{ico("zap", "")}</span>Automations<em>Configured</em></li>']) + '</div>'),
        ('d', '<div class="aui"><div class="aui__head"><strong>Automations</strong><span class="aui__ok">Live</span></div>'
              + aui_rows([toggle_row('Abandoned cart'), toggle_row('Welcome series'), toggle_row('Post-purchase')]) + '</div>'),
        ('b', '<div class="aui"><div class="aui__head"><strong>Dashboard</strong><span class="aui__chip">Optimize</span></div>'
              + aui_rows([check_row('A/B test messages'), check_row('Refine segments'), check_row('Scale what works')]) + '</div>'),
    ]
    steps = ''.join(f'''
          <article class="step reveal reveal--up" style="--d:{i}">
            <div class="step__art feature__visual feature__visual--{arts[i][0]}">{arts[i][1]}</div>
            <span class="step__num">Step {e(s['step'])}</span>
            <h3>{e(sc(s['title']))}</h3>
            <p>{e(s['description'])}</p>
          </article>''' for i, s in enumerate(pr['steps']))
    ex = t['explore']
    explore = ''.join(f'<a href="{a(h)}">{e(sc(l))}</a>' for l, h in [
        (ex['pricing'], 'https://getkanal.com/pricing'), (ex['tools'], 'https://getkanal.com/tools'),
        (ex['caseStudies'], 'https://getkanal.com/case-studies'), (ex['blog'], 'https://getkanal.com/blog')])
    main = f'''  <main class="company-page">
    <!-- ============ HERO ============ -->
    <section class="ah">
      <div class="wrap">
        <span class="ah__eyebrow reveal">{e(sc(t['preheader']))}</span>
        <h1 class="fh__title reveal" style="--d:1">{e(sc(t['title']))}</h1>
        <p class="ah__sub reveal" style="--d:2">{e(t['subtitle'])}</p>
        <div class="ah__ctas reveal" style="--d:3">
          <a class="btn btn--dark btn--lg" href="{a(t['ctaPrimaryUrl'])}" target="_blank" rel="noopener"><svg class="btn__logo" aria-hidden="true"><use href="#logo-shopify" /></svg>{e(sc(t['ctaPrimary']))}</a>
          <a class="btn btn--soft btn--lg" href="https://getkanal.com/demo">{e(sc(t['ctaSecondary']))}</a>
        </div>
        {TRUST.format(cls='', d=4)}
      </div>
    </section>

    <section class="sec cfirst">
      <div class="wrap">
        <div class="fstats fstats--4 reveal reveal--up">{stats}</div>
      </div>
    </section>

    <!-- ============ SERVICES ============ -->
    <section class="sec" id="services">
      <div class="wrap">
{shead(sc(sv['title']), sv['subtitle'])}        <div class="fcards fcards--3">{services}</div>
      </div>
    </section>

    <!-- ============ POURQUOI KANAL ============ -->
    <section class="sec" id="why">
      <div class="wrap">
{shead(sc(wk['title']), wk['subtitle'], (sc(wk['cta']), 'https://getkanal.com/pricing'))}        <div class="why feature__visual feature__visual--c reveal reveal--up">{why}</div>
      </div>
    </section>

    <!-- ============ PROCESSUS ============ -->
    <section class="sec" id="process">
      <div class="wrap">
        <div class="ahow">
          <div class="ahow__head">
            <h2 class="ahow__title reveal">{e(sc(pr['title']))}</h2>
            <div class="ahow__intro reveal" style="--d:1"><p>{e(pr['subtitle'])}</p></div>
          </div>
          <div class="steps steps--4">{steps}
          </div>
        </div>
      </div>
    </section>

    <!-- ============ EXPLORER ============ -->
    <section class="sec">
      <div class="wrap">
        <div class="cexplore reveal">
          <div><h2>{e(sc(ex['title']))}</h2><p>{e(ex['subtitle'])}</p></div>
          <nav class="fpills" aria-label="{a(sc(ex['title']))}">{explore}</nav>
        </div>
      </div>
    </section>
{faq(sc(t['faq']['title']), t['faq']['items'], t['faq']['subtitle'])}  </main>
'''
    return {'out': 'whatsapp-marketing-agency.html', 'title': page_title(t['metadata']['title']), 'description': t['metadata']['description'],
            'styles': ['pages.css', 'feature.css', 'company.css'], 'scripts': [], 'current': None, 'extra': '', 'main': main}


# =====================================================================
#  Premium setup
# =====================================================================
def kpi_card(rows, trend, bars, plain):
    lines = ''.join(f'<li>{e(l)}<b>{e(v)}</b></li>' for l, v in rows)
    bar = ''.join(f'<i style="--h:{h}%"></i>' for h in bars)
    return (f'<div class="aui kpi{" kpi--plain" if plain else ""}"><ul class="kpi__rows">{lines}</ul>'
            f'<div class="kpi__foot"><span>Over 6 months</span><span class="kpi__trend">{trend}</span></div>'
            f'<div class="kpi__bars" aria-hidden="true">{bar}</div></div>')


def premium(d, site):
    t = d['premiumSetup']
    pr, fm, cmp, pil = t['pricing'], t['form'], t['comparison'], t['pillars']
    amount = pr['amount']
    title = re.sub(r'<highlight>(.*?)</highlight>', lambda m: '\x00' + m.group(1) + '\x01', t['title'])
    title = e(title).replace('\x00', '<span class="muted">').replace('\x01', '</span>')
    stats = ''.join(f'<div class="fstats__cell"><strong>{e(s["value"])}</strong><span>{e(s["label"])}</span></div>' for s in t['heroStats'])

    tt = d['testimonials']
    avatars = {'Alex Shane': 'alex', 'Andrea Albrizio': 'andrea', 'Alexandre Perez': 'alexandre'}
    quotes = ''.join(
        f'''<figure class="quote reveal reveal--up" style="--d:{i}"><span class="quote__stars" aria-label="5 out of 5">★★★★★</span><blockquote>“{e(q['text'])}”</blockquote>'''
        f'''<figcaption><img src="assets/people/{avatars.get(q['name'], 'k')}.jpg" alt="" width="40" height="40" loading="lazy" /><span><strong>{e(q['name'])}</strong><small>{e(q['role'])}</small></span></figcaption></figure>'''
        for i, q in enumerate(t['testimonials']['items'][:3]))

    seg = lambda n: f'{n:,}'
    arts = [
        ('b', '<div class="aui"><div class="aui__head"><strong>Automations</strong><span class="aui__ok">Live</span></div>'
              + aui_rows([toggle_row('Abandoned cart'), toggle_row('Post-purchase upsell'), toggle_row('Review collection')]) + '</div>'),
        ('c', '<div class="aui"><div class="aui__head"><strong>Segments</strong><span class="aui__chip">Contacts</span></div>'
              + '<ul class="aui__rows">' + ''.join(f'<li>{l}<em>{seg(n)}</em></li>' for l, n in [('VIP', 1240), ('Opt-ins', 8950), ('Black Friday', 5210)]) + '</ul></div>'),
        ('d', '<div class="aui">' + mini_chat('Do your products work for an adult?', 'Yes, perfectly. The size L is designed for adults, it’s our bestseller.', 'Order the product') + '</div>'),
    ]
    pillars = ''.join(f'''
          <article class="step reveal reveal--up" style="--d:{i}">
            <div class="step__art feature__visual feature__visual--{arts[i][0]}">{arts[i][1]}</div>
            <span class="step__num">{e(p['label'])}</span>
            <h3>{e(p['title'])}</h3>
            <p>{e(p['description'])}</p>
          </article>''' for i, p in enumerate(pil['items']))

    without = kpi_card([('Avg. ROAS', 'x2'), ('Messages / mo', '1,500'), ('Revenue / mo', '€2,400')], '+3%', [20, 24, 18, 22, 19, 23, 20], True)
    with_k = kpi_card([('Avg. ROAS', 'x80'), ('Messages / mo', '90,000'), ('Revenue / mo', '€88,000')], '+184%', [22, 34, 30, 48, 62, 80, 100], False)
    li = lambda items, icon, cls: ''.join(f'<li><span class="cmp__mark cmp__mark--{cls}" aria-hidden="true">{icon}</span>{e(x)}</li>' for x in items)

    feats = ''.join(f'<li><span class="aui__tick" aria-hidden="true">{TICK}</span>{e(f)}</li>' for f in pr['features'])
    with_price = lambda s: s.replace('{price}', amount)
    faq_items = [{'question': with_price(q['question']), 'answer': with_price(q['answer'])} for q in t['faq']['items']]

    main = f'''  <main class="company-page">
    <!-- ============ HERO ============ -->
    <section class="ah">
      <div class="wrap">
        <span class="ah__eyebrow reveal">{e(sc(t['preheader']))}</span>
        <h1 class="fh__title reveal" style="--d:1">{title}</h1>
        <p class="ah__sub reveal" style="--d:2">{e(t['subtitle'])}</p>
        <div class="ah__ctas reveal" style="--d:3">
          <a class="btn btn--dark btn--lg" href="#book">{e(t['ctaPrimary'])}</a>
        </div>
      </div>
    </section>

    <section class="sec cfirst">
      <div class="wrap">
        <div class="fstats fstats--4 reveal reveal--up">{stats}</div>
        <figure class="fshot pshot reveal reveal--up"><div class="fshot__frame feature__visual feature__visual--b"><img src="assets/premium/dashboard.svg" alt="{a(t['heroImageAlt'])}" width="1000" height="392" /></div></figure>
      </div>
    </section>

    <!-- ============ TÉMOIGNAGES ============ -->
    <section class="sec" id="reviews">
      <div class="wrap">
{shead(tt['title'], tt['subtitle'])}        <div class="quotes">{quotes}</div>
      </div>
    </section>

    <!-- ============ CE QUE NOUS CONSTRUISONS ============ -->
    <section class="sec" id="pillars">
      <div class="wrap">
        <div class="ahow">
          <div class="ahow__head">
            <h2 class="ahow__title reveal">{e(pil['title'])}</h2>
            <div class="ahow__intro reveal" style="--d:1"><p>{e(pil['subtitle'])}</p></div>
          </div>
          <div class="steps">{pillars}
          </div>
        </div>
      </div>
    </section>

    <!-- ============ AVEC / SANS ============ -->
    <section class="sec" id="comparison">
      <div class="wrap">
{shead(cmp['title'], cmp['subtitle'])}        <div class="cmp">
          <article class="cmp__col reveal reveal--up">
            <h3>{e(cmp['withoutTitle'])}</h3>
            <div class="cmp__art">{without}</div>
            <ul class="cmp__list">{li(cmp['without'], CROSS, 'no')}</ul>
          </article>
          <article class="cmp__col cmp__col--with reveal reveal--up" style="--d:1">
            <h3>{e(cmp['withPrefix'])} Kanal</h3>
            <div class="cmp__art feature__visual feature__visual--b">{with_k}</div>
            <ul class="cmp__list">{li(cmp['with'], TICK, 'yes')}</ul>
            <a class="btn btn--dark btn--lg" href="#book">{e(cmp['cta'])}</a>
          </article>
        </div>
      </div>
    </section>

    <!-- ============ TARIF + FORMULAIRE ============ -->
    <section class="sec" id="book">
      <div class="wrap">
{shead(pr['title'], fm['subtitle'])}        <div class="cplan">
          <article class="cplan__card reveal reveal--up">
            <h3>{e(sc(pr['name']))}</h3>
            <p class="cplan__tag">{e(pr['tagline'])}</p>
            <div class="cplan__price"><strong>{e(pr['price'])}</strong><s>{e(pr['priceOriginal'])}</s><span>{e(pr['priceNote'])}</span></div>
            <a class="btn btn--dark btn--lg cplan__cta" href="#premiumForm">{e(pr['cta'])}</a>
            <ul class="cplan__list">{feats}</ul>
          </article>
          <div class="cplan__panel dh__panel feature__visual feature__visual--d reveal reveal--up" style="--d:1">
            <form class="dform" id="premiumForm" data-form novalidate>
              <div class="dform__head">
                {MARK}
                <span><strong>{e(fm['title'])}</strong><small>{e(sc(pr['name']))} · {e(amount)}</small></span>
              </div>
              <div class="dform__row">
                {field(fm['firstName'], 'firstName', 'text', '', 'Enter your first name.', extra=' autocomplete="given-name"')}
                {field(fm['lastName'], 'lastName', 'text', '', 'Enter your last name.', extra=' autocomplete="family-name"')}
              </div>
              {field(fm['shopUrl'], 'shopUrl', 'text', fm['shopPlaceholder'], 'Enter your store URL.', extra=' autocomplete="url" data-store')}
              <div class="dform__field">
                <label class="dform__check"><input type="checkbox" name="consent" required /><span class="dform__box" aria-hidden="true">{TICK}</span><span>{e(fm['consent'].replace('{price}', amount))}</span></label>
                <span class="dform__err">{e(fm['consentError'])}</span>
              </div>
              {HONEYPOT}
              <button type="submit" class="btn btn--dark btn--lg dform__submit" data-sending="{a(fm['sending'])}">{e(fm['submit'])}{ARROW}</button>
              <div class="dform__done" aria-live="polite">
                {OK_ICON}
                <strong>{e(fm['success'].split('! ')[0])}!</strong>
                <small>{e(fm['success'].split('! ', 1)[-1])}</small>
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
{faq(sc(t['faq']['title']), faq_items, t['faq']['subtitle'])}  </main>
'''
    return {'out': 'premium-setup.html', 'title': page_title(t['metadata']['title']),
            'description': t['metadata']['description'].replace('{price}', amount),
            'styles': ['pages.css', 'feature.css', 'demo.css', 'company.css'], 'scripts': ['company.js'], 'current': None,
            'extra': '', 'main': main}


# =====================================================================
#  Instagram for Shopify
# =====================================================================
def js_object(src):
    """Littéral d'objet TS/JS (clés nues, chaînes entre apostrophes) → JSON."""
    out, i, n = [], 0, len(src)
    while i < n:
        c = src[i]
        if c in '\'"`':
            j, buf = i + 1, []
            while src[j] != c:
                if src[j] == '\\':
                    j += 1
                buf.append(src[j])
                j += 1
            out.append(json.dumps(''.join(buf)))
            i = j + 1
        elif c == '/' and src[i + 1] == '/':
            i = src.index('\n', i)
        elif c.isalpha() or c == '_':
            m = re.match(r'[A-Za-z_]\w*', src[i:])
            out.append(json.dumps(m.group(0)))
            i += len(m.group(0))
        else:
            out.append(c)
            i += 1
    return json.loads(re.sub(r',(\s*[}\]])', r'\1', ''.join(out)))


def instagram_copy(site):
    src = open(os.path.join(site, 'src/components/InstagramPage.tsx'), encoding='utf-8').read()
    start = src.index('{', src.index('en: {', src.index('const COPY')))
    end = src.index('\n  fr: {', start)
    copy = js_object(src[start:src.rindex('}', start, end) + 1])
    meta_src = open(os.path.join(site, 'src/app/[locale]/instagram/page.tsx'), encoding='utf-8').read()
    m = re.search(r"en: \{\s*title: '([^']*)',\s*description:\s*'([^']*)'", meta_src)
    return copy, m.group(1), m.group(2)


def chatcard(user, ask, sys_icon, sys_text, reply, cta, who):
    av = '<span class="chatcard__av chatcard__av--agent"><svg viewBox="-1.5 -1 24 26" aria-hidden="true"><use href="#logo-kanal" width="96" height="24" /></svg></span>'
    initials = ''.join(w[0] for w in re.split(r'[.\s_]+', user.strip('@')) if w)[:2].upper()
    row = lambda inner, extra='': f'<div class="chatcard__row" data-chat-step{extra}><div class="chatcard__in">{inner}</div></div>'
    return ('<div class="chatcard" data-chat>\n'
            + row(f'<div class="chatcard__line chatcard__line--in"><span class="avatar chatcard__av">{e(initials)}</span><div class="chatcard__col">'
                  f'<span class="chatcard__meta"><strong>{e(user)}</strong>6:02 pm</span><p class="chatcard__bubble">{e(ask)}</p></div></div>') + '\n'
            + row(f'<div class="chatcard__line chatcard__line--sys"><span class="chatcard__sys"><svg aria-hidden="true"><use href="#{sys_icon}" /></svg>{e(sys_text)}</span></div>') + '\n'
            + row(f'<div class="chatcard__line chatcard__line--out"><span class="chatcard__typing" aria-hidden="true"><i></i><i></i><i></i></span>{av}</div>', ' data-chat-typing') + '\n'
            + row(f'<div class="chatcard__line chatcard__line--out"><div class="chatcard__col"><span class="chatcard__meta">6:02 pm<span class="chatcard__by">{e(who)}</span></span>'
                  f'<p class="chatcard__bubble">{e(reply)}</p></div>{av}</div>') + '\n'
            + row(f'<div class="chatcard__line chatcard__line--out"><span class="chatcard__cta">{EXT}{e(cta)}</span><span class="chatcard__av chatcard__av--ghost" aria-hidden="true"></span></div>') + '\n</div>')


def instagram(site):
    c, meta_title, meta_desc = instagram_copy(site)
    h, hm = c['hero'], c['heroMock']
    title = e(h['titleBefore']) + f'<span class="ig-word"><svg aria-hidden="true"><use href="#logo-instagram" /></svg>{e(h["titleHighlight"])}</span>' + e(h['titleAfter'])
    marquee = lambda items, rev: (f'<div class="marq{" marq--rev" if rev else ""}"><div class="marq__track">'
                                  + ''.join(f'<span class="cpill cpill--lg"{" aria-hidden=\"true\"" if k else ""}>{logo("instagram")}{e(x)}</span>' for k in (0, 1) for x in items)
                                  + '</div></div>')
    cm = c['commentMock']
    arts = [
        ('d', f'<div class="aui"><div class="aui__head"><strong>{e(cm["trigger"])}</strong><span class="aui__ok">Live</span></div>'
              + '<ul class="aui__rows">' + ''.join(f'<li>{e(r["label"])}<em>{r["value"]}</em></li>' for r in cm['rows']) + '</ul></div>'),
        ('b', '<div class="aui"><div class="aui__head"><strong>Auto-replies</strong><span class="aui__ok">On</span></div>'
              + aui_rows([toggle_row(x) for x in c['togglesMock']]) + '</div>'),
        ('c', '<div class="aui">' + mini_chat(c['aiMock']['question'], c['aiMock']['answer'], c['aiMock']['cta']) + '</div>'),
    ]
    pil = c['pillars']
    pillars = ''.join(f'''
          <article class="step reveal reveal--up" style="--d:{i}">
            <div class="step__art feature__visual feature__visual--{arts[i][0]}">{arts[i][1]}</div>
            <h3 class="step__title">{e(p['title'])}</h3>
            <p>{e(p['description'])}</p>
          </article>''' for i, p in enumerate(pil['items']))
    uc = c['useCases']
    uc_icons = ['clock', 'chat', 'story', 'filter', 'cart', 'help']
    usecases = ''.join(f'''<article class="fcard reveal reveal--up" style="--d:{i % 3}"><span class="fcard__ico">{ico(uc_icons[i % 6], '')}</span><h3>{e(x['title'])}</h3><p>{e(x['description'])}</p></article>'''
                       for i, x in enumerate(uc['items']))
    br = c['bridge']
    node_icons = ['logo-instagram', 'logo-kanal-mark', 'logo-whatsapp']
    nodes = ''.join(f'''<li class="flow__step{' flow__step--win' if i == len(br['nodes']) - 1 else ''} is-done" style="--i:{i}"><span class="flow__check" aria-hidden="true">{TICK}</span>'''
                    f'''<span class="flow__label"><strong>{e(n['label'])}</strong><small>{e(n['sublabel'])}</small></span><span class="flow__meta bridge__ico"><svg aria-hidden="true"><use href="#{node_icons[i % 3]}" /></svg></span></li>'''
                    for i, n in enumerate(br['nodes']))
    checklist = ''.join(f'<li><span class="aui__tick" aria-hidden="true">{TICK}</span>{e(x)}</li>' for x in br['checklist'])
    st = c['steps']
    steps = ''.join(f'''
          <article class="step step--plain reveal reveal--up" style="--d:{i}">
            <span class="step__num">Step {i + 1:02d}</span>
            <h3>{e(s['title'])}</h3>
            <p>{e(s['description'])}</p>
          </article>''' for i, s in enumerate(st['items']))
    ea = c['earlyAccess']
    ea_feats = ''.join(f'<li><span class="aui__tick" aria-hidden="true">{TICK}</span>{e(f)}</li>' for f in ea['features'])
    demo = 'https://getkanal.com/demo'
    main = f'''  <main class="company-page ig-page">
    <!-- ============ HERO ============ -->
    <section class="dh">
      <div class="wrap">
        <div class="dh__grid">
          <div class="dh__text">
            <span class="ah__eyebrow ig-eyebrow reveal">{logo('instagram')}{e(h['eyebrow'])}</span>
            <h1 class="dh__title reveal" style="--d:1">{title}</h1>
            <p class="dh__sub reveal" style="--d:2">{e(h['subtitle'])}</p>
            <div class="ah__ctas ig-ctas reveal" style="--d:3"><a class="btn btn--dark btn--lg" href="{demo}">{e(h['ctaPrimary'])}</a></div>
            <p class="ig-note reveal" style="--d:4">{e(h['note'])}</p>
          </div>
          <div class="dh__panel ig-panel feature__visual feature__visual--d reveal reveal--up" style="--d:2">
            {chatcard('@' + hm['commentContext'].split(' ')[0].lstrip('@'), hm['userDm'], 'logo-instagram', hm['commentContext'], hm['reply'], hm['productCta'], hm['channel'])}
          </div>
        </div>
      </div>
    </section>

    <section class="sec cfirst">
      <div class="marqs reveal">
        {marquee(c['marqueeTop'], False)}
        {marquee(c['marqueeBottom'], True)}
      </div>
    </section>

    <!-- ============ PILIERS ============ -->
    <section class="sec" id="automate">
      <div class="wrap">
        <div class="ahow">
          <div class="ahow__head">
            <h2 class="ahow__title reveal">{e(pil['title'])}</h2>
            <div class="ahow__intro reveal" style="--d:1"><p>{e(pil['subtitle'])}</p></div>
          </div>
          <div class="steps">{pillars}
          </div>
        </div>
      </div>
    </section>

    <!-- ============ CAS D'USAGE ============ -->
    <section class="sec" id="use-cases">
      <div class="wrap">
{shead(uc['title'], uc['subtitle'])}        <div class="fcards fcards--3">{usecases}</div>
      </div>
    </section>

    <!-- ============ INSTAGRAM → WHATSAPP ============ -->
    <section class="sec" id="bridge">
      <div class="wrap">
        <div class="duo reveal reveal--up">
          <div class="duo__text">
            <span class="ps__tag"><svg aria-hidden="true"><use href="#logo-kanal-mark" /></svg>{e(br['eyebrow'])}</span>
            <h2 class="bridge__title">{e(br['title'])}</h2>
            <p>{e(br['subtitle'])}</p>
            <ul class="ticks">{checklist}</ul>
          </div>
          <div class="duo__media feature__visual feature__visual--c">
            <div class="flow bridge">
              <div class="flow__head"><span class="flow__icon">{logo('instagram')}</span><span class="flow__title"><strong>{e(br['nodes'][0]['label'])} → {e(br['nodes'][-1]['label'])}</strong><small>Kanal · Instagram · WhatsApp</small></span><span class="flow__live">Live</span></div>
              <ol class="flow__steps">{nodes}</ol>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ============ ÉTAPES ============ -->
    <section class="sec" id="steps">
      <div class="wrap">
        <div class="ahow">
          <div class="ahow__head">
            <h2 class="ahow__title reveal">{e(st['title'])}</h2>
            <div class="ahow__intro reveal" style="--d:1"><p>{e(st['subtitle'])}</p></div>
          </div>
          <div class="steps">{steps}
          </div>
        </div>
      </div>
    </section>

    <!-- ============ ACCÈS ANTICIPÉ ============ -->
    <section class="sec" id="early-access">
      <div class="wrap">
        <div class="cplan cplan--solo">
          <article class="cplan__card reveal reveal--up">
            <span class="ea-badge"><i aria-hidden="true"></i>{e(ea['badge'])}</span>
            <h3>{e(ea['title'])}</h3>
            <p class="cplan__tag">{e(ea['tagline'])}</p>
            <a class="btn btn--dark btn--lg cplan__cta" href="{demo}">{e(ea['cta'])}</a>
            <ul class="cplan__list">{ea_feats}</ul>
          </article>
        </div>
      </div>
    </section>
{faq(c['faq']['title'], c['faq']['items'], c['faq']['subtitle'])}  </main>
'''
    return {'out': 'instagram.html', 'title': page_title(meta_title), 'description': meta_desc,
            'styles': ['pages.css', 'feature.css', 'demo.css', 'company.css'], 'scripts': [], 'current': None,
            'extra': '', 'main': main}


# =====================================================================
#  Legal (Sanity portable text → HTML)
# =====================================================================
ZW = '‍​﻿'
LEGAL_LANG = {'terms': 'fr'}  # le contenu Sanity des CGU est en français


def clean(s):
    return re.sub(f'[{ZW}]', '', s)


def block_text(b):
    return clean(''.join(ch.get('text', '') for ch in b.get('children', []))).strip()


def fully_bold(b):
    ch = [c for c in b.get('children', []) if clean(c.get('text', '')).strip()]
    return bool(ch) and all('strong' in (c.get('marks') or []) for c in ch)


def heading_text(s):
    s = ' '.join(s.split())
    letters = [c for c in s if c.isalpha()]
    if letters and sum(c.isupper() for c in letters) / len(letters) > .5:
        s = s.lower()
    return s[:1].upper() + s[1:]


def spans(b):
    defs = {m['_key']: m for m in b.get('markDefs') or []}
    out = []
    for ch in b.get('children', []):
        txt = e(clean(ch.get('text', ''))).replace('\n', '<br />')
        for m in ch.get('marks') or []:
            if m == 'strong':
                txt = f'<strong>{txt}</strong>'
            elif m == 'em':
                txt = f'<em>{txt}</em>'
            elif m in defs and defs[m].get('_type') == 'link':
                href = defs[m].get('href', '#')
                txt = f'<a href="{a(href)}"{ext_attrs(href)}>{txt}</a>'
        out.append(txt)
    return ''.join(out).strip()


def slugify(s, used):
    base = re.sub(r'[^a-z0-9]+', '-', s.lower().encode('ascii', 'ignore').decode()).strip('-')[:48] or 'section'
    k, n = base, 2
    while k in used:
        k, n = f'{base}-{n}', n + 1
    used.add(k)
    return k


def portable(content):
    """Retourne (html, toc). Les titres sont déduits de la structure : styles h2/h3,
    paragraphes entièrement en gras, éléments de liste numérotée en gras suivis d'un paragraphe."""
    blocks = [b for b in content if b.get('_type') != 'block' or block_text(b)]
    items, used, toc = [], set(), []
    for i, b in enumerate(blocks):
        nxt = blocks[i + 1] if i + 1 < len(blocks) else None
        nxt_list = bool(nxt and nxt.get('_type') == 'block' and nxt.get('listItem') and nxt.get('level', 1) == b.get('level', 1))
        if b.get('_type') == 'dataTable':
            items.append(('table', b))
            continue
        txt = block_text(b)
        style, li = b.get('style') or 'normal', b.get('listItem')
        if style in ('h1', 'h2'):
            items.append(('h2', txt))
        elif style in ('h3', 'h4'):
            items.append(('h3', txt))
        elif li and b.get('level', 1) >= 2 and len(txt) < 90:
            items.append(('h3', txt))
        elif li and fully_bold(b) and not nxt_list:
            items.append(('h2', txt))
        elif li and not nxt_list and len(txt) < 70 and not re.search(r'[;:.,]$', txt) and nxt and not nxt.get('listItem'):
            items.append(('h3', txt))
        elif li:
            items.append(('li', b))
        elif fully_bold(b) and len(txt) < 120 and i == 0 and txt.upper() == txt:
            items.append(('doc', txt))
        elif fully_bold(b) and len(txt) < 120 and not txt.startswith(('«', '"', '“')):
            items.append(('h2', txt))
        elif re.match(r'^\d+\.\d+\.?\s', txt) and len(txt) < 80:
            items.append(('h3', txt))
        else:
            items.append(('p', b))

    out, k = [], 0
    while k < len(items):
        kind, v = items[k]
        if kind in ('h2', 'h3'):
            label = heading_text(v)
            hid = slugify(label, used)
            if kind == 'h2':
                toc.append((hid, label))
            out.append(f'<{kind} id="{hid}">{e(label)}</{kind}>')
        elif kind == 'doc':
            out.append(f'<p class="legal__doc">{e(heading_text(v))}</p>')
        elif kind == 'p':
            out.append(f'<p>{spans(v)}</p>')
        elif kind == 'table':
            head = ''.join(f'<th scope="col">{e(x)}</th>' for x in v.get('headers') or [])
            rows = ''.join('<tr>' + ''.join(f'<td>{e(c)}</td>' for c in r.get('cells') or []) + '</tr>' for r in v.get('rows') or [])
            cap = f'<figcaption>{e(v["caption"])}</figcaption>' if v.get('caption') else ''
            out.append(f'<figure class="legal__table"><div class="legal__scroll"><table><thead><tr>{head}</tr></thead><tbody>{rows}</tbody></table></div>{cap}</figure>')
        elif kind == 'li':
            tag = 'ol' if v.get('listItem') == 'number' else 'ul'
            lis = []
            while k < len(items) and items[k][0] == 'li' and ('ol' if items[k][1].get('listItem') == 'number' else 'ul') == tag:
                lis.append(f'<li>{spans(items[k][1])}</li>')
                k += 1
            out.append(f'<{tag}>{"".join(lis)}</{tag}>')
            continue
        k += 1
    return '\n          '.join(out), toc


def legal_pages(site):
    data = (snapshot('sanity-legal.json', site) or {}).get('result') or []
    order = ['privacy', 'terms', 'sub-processors']
    data = sorted(data, key=lambda p: order.index(p['slug']) if p['slug'] in order else 99)
    tabs = [(p['slug'], sc(p['title'])) for p in data]
    pages = []
    for p in data:
        body, toc = portable(p.get('content') or [])
        lang = LEGAL_LANG.get(p['slug'])
        updated = ''
        if p.get('lastUpdated'):
            d = dt.date.fromisoformat(p['lastUpdated'][:10])
            updated = f'<p class="legal__date">Last updated: {d.strftime("%B")} {d.day}, {d.year}</p>'
        nav = ''.join(f'<a href="https://getkanal.com/legal/{s}"{" aria-current=\"page\"" if s == p["slug"] else ""}>{e(lbl)}</a>' for s, lbl in tabs)
        toc_links = ''.join(f'<li><a href="#{h}">{e(lbl)}</a></li>' for h, lbl in toc)
        toc_html = f'''<aside class="legal__toc">
            <details class="toc" open>
              <summary>On this page<span class="faq__icon" aria-hidden="true"></span></summary>
              <ol{f' lang="{lang}"' if lang else ''}>{toc_links}</ol>
            </details>
          </aside>''' if len(toc) > 1 else ''
        main = f'''  <main class="legal-page">
    <section class="legal__hero">
      <div class="wrap">
        <div class="legal__head">
          <span class="ah__eyebrow reveal">Legal</span>
          <h1 class="reveal" style="--d:1">{e(sc(p['title']))}</h1>
          {updated}
          <nav class="legal__tabs reveal" style="--d:2" aria-label="Legal">{nav}</nav>
        </div>
      </div>
    </section>
    <section class="sec legal__sec">
      <div class="wrap">
        <div class="legal{' legal--toc' if toc_html else ''}">
          {toc_html}
          <article class="legal__body"{f' lang="{lang}"' if lang else ''}>
          {body}
          </article>
        </div>
      </div>
    </section>
  </main>
'''
        pages.append({'out': f'legal/{p["slug"]}.html', 'title': page_title(p['title']), 'description': p['title'],
                      'styles': ['pages.css', 'legal.css'], 'scripts': ['company.js'], 'current': None, 'extra': '', 'main': main})
    return pages


def pages(site):
    with open(os.path.join(site, 'messages/en.json'), encoding='utf-8') as f:
        d = json.load(f)
    return [contact(d), careers(d, site), partners(d, site), agency(d), premium(d, site), instagram(site), *legal_pages(site)]
