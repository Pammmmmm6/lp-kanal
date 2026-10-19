"""Guides « Best Shopify apps » générés depuis le contenu du site en ligne.

Sources (dépôt getkanal/getkanal.com, anglais) :
  * content/shopify-apps/*.md : une collection par fichier (front matter YAML :
    titres, colonnes, apps classées ; corps markdown : l'article).
  * src/lib/shopify-apps.ts : mêmes règles que le site (note lue dans la description,
    apps « featured » hors classement, section FAQ du corps, n°1 par besoin, guides associés).
  * messages/en.json → shopifyAppsPage, shopifyCollectionPage : textes des pages.

Pages : best-shopify-apps.html (index) et best-shopify-apps/<slug>.html.
Le markdown est converti ici (pas de module markdown installé) ; les images
/images/... pointent vers getkanal.com, les liens internes vers getkanal.com/<chemin>
(le build les remplace par la page locale quand elle existe).
"""
import datetime as dt
import html
import json
import os
import re

import yaml

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LIVE = 'https://getkanal.com'
SHOPIFY_APP_URL = 'https://apps.shopify.com/kanal-marketing-ai'
BY_NEED_COLLECTIONS = {'best-shopify-apps-for-clothing-stores', 'best-shopify-plus-apps'}

e = lambda s: html.escape(s, quote=False)
a = lambda s: html.escape(s, quote=True)

YES = '<svg class="ct-yes" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="9" /><path d="m6.2 10.2 2.5 2.5 5-5.2" /></svg>'
NO = '<svg class="ct-no" viewBox="0 0 20 20" aria-hidden="true"><path d="m6.5 6.5 7 7M13.5 6.5l-7 7" /></svg>'
ARROW = '<svg class="sa-arrow" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h10M9 4l4 4-4 4" /></svg>'
EXT = '<svg class="sa-arrow" viewBox="0 0 16 16" aria-hidden="true"><path d="M6.5 4H4.8A1.8 1.8 0 0 0 3 5.8v5.4A1.8 1.8 0 0 0 4.8 13h5.4a1.8 1.8 0 0 0 1.8-1.8V9.5M9 3h4v4M13 3 7.5 8.5" /></svg>'
STAR = '<svg class="sa-star" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>'
TRUST = '''<div class="trust reveal" style="--d:4">
          <a class="trust__rating" href="https://apps.shopify.com/kanal-marketing-ai/reviews" target="_blank" rel="noopener"><span class="trust__stars" aria-hidden="true">★★★★★</span><span class="trust__link">5/5 on Shopify</span></a>
          <span class="trust__sep" aria-hidden="true"></span>
          <span class="trust__count">500+ brands trust us</span>
        </div>'''


# ---------- Casse : les titres du site sont en Title Case, la maquette en sentence case ----------
PROPER = {'Shopify', 'Kanal', 'Klaviyo', 'WhatsApp', 'Instagram', 'Facebook', 'Messenger', 'Google', 'Meta', 'TikTok',
          'Gorgias', 'Zendesk', 'Recharge', 'Apple', 'Android', 'Amazon', 'Etsy', 'Europe', 'European', 'English',
          'French', 'Baymard', 'Institute', 'Christmas', 'Pinterest', 'YouTube', 'I', 'Black', 'Friday', 'Cyber',
          'Monday', 'Gen', 'Z', 'Salesforce', 'Zoho', 'Pipedrive', 'Lyro', 'Premio', 'Trustpilot', 'Wallet', 'Flow',
          'Bold'}
PHRASES = ['Shopify Plus', 'Shopify Flow', 'Shopify Inbox', 'Shopify Markets', 'Shopify Forms', 'Shopify POS',
           'Shopify Collective', 'Shopify Messaging', 'Shopify Payments', 'Shopify App Store', 'Performance Max']


def sentence(text, keep=()):
    """« Best WhatsApp Marketing Apps for Shopify » → « Best WhatsApp marketing apps for Shopify »,
    sans toucher aux noms d'apps, sigles et noms propres."""
    spans = []
    for p in sorted(set(PHRASES) | set(keep), key=len, reverse=True):
        # un nom d'app suivi d'un mot en capitale fait partie d'un titre en Title Case
        # (« Best Shopify Email Marketing Apps ») : on ne le protège pas
        tail = r'(?!\w)' if p in PHRASES else r'(?!\w)(?! (?!(?:' + '|'.join(PROPER) + r')\b)[A-Z][a-z])'
        for m in re.finditer(r'(?<!\w)' + re.escape(p) + tail, text):
            spans.append((m.start(), m.end()))
    # « Plus » seul désigne Shopify Plus (« Plus-Only Apps », « on Plus »)
    spans += [m.span() for m in re.finditer(r'(?<=\bon )Plus\b|\bPlus(?=[- ](?:Only|Stores|App|Scale)\b)', text)]
    out, pos, first = [], 0, True
    for m in re.finditer(r'[^\s-]+', text):  # mots, et chaque moitié d'un mot composé
        out.append(text[pos:m.start()])
        w, pos = m.group(0), m.end()
        core = re.sub(r'^[^\w#]+|[^\w]+$', '', w)
        if first:
            first = not core or core.startswith('#') or bool(re.fullmatch(r'\d+[.)]', w))  # « #1 Kanal », « 1. Is … »
            out.append(w)
            continue
        if (not any(s <= m.start() < t for s, t in spans) and not PROPER.intersection(re.split(r"['’]", core))
                and re.fullmatch(r"[A-Z][a-z]+(?:['’][a-z]+)?", core)):
            w = w.replace(core, core.lower(), 1)
        out.append(w)
    return ''.join(out) + text[pos:]


# ---------- Markdown → HTML (ce dont les guides ont besoin) ----------
def heading_id(text):
    """Même calcul que le renderer de titres de src/lib/markdown.ts."""
    t = re.sub(r'[^\w\s-]', '', text.lower())
    return re.sub(r'-+', '-', re.sub(r'\s+', '-', t)).strip()


def link_href(href):
    href = href.replace('"', '%22')
    if href.startswith('/') and not href.startswith('//'):
        return LIVE + href, False
    return href, href.startswith('http') and not href.startswith(LIVE)


def inline(s):
    keep = []

    def hold(h):
        keep.append(h)
        return f'\x00{len(keep) - 1}\x00'

    s = re.sub(r'`([^`]+)`', lambda m: hold(f'<code>{e(m.group(1))}</code>'), s)
    s = e(s)

    def img(m):
        src = m.group(2)
        src = LIVE + src if src.startswith('/') else src
        return hold(f'<img src="{src}" alt="{m.group(1)}" loading="lazy" decoding="async" />')
    s = re.sub(r'!\[([^\]]*)\]\(([^)\s]+)(?:\s+&quot;[^)]*&quot;)?\)', img, s)

    def link(m):
        href, ext = link_href(m.group(2))
        attrs = ' target="_blank" rel="noopener"' if ext else ''
        return hold(f'<a href="{href}"{attrs}>{emphasis(m.group(1))}</a>')
    s = re.sub(r'\[([^\]]+)\]\(([^)\s]+)(?:\s+&quot;[^)]*&quot;)?\)', link, s)
    s = re.sub(r'(?<![\w"])(https?://[^\s<]+[^\s<.,;:!?)])', lambda m: hold(f'<a href="{m.group(1)}" target="_blank" rel="noopener">{m.group(1)}</a>'), s)
    s = emphasis(s)
    while '\x00' in s:
        s = re.sub(r'\x00(\d+)\x00', lambda m: keep[int(m.group(1))], s)
    return s


def emphasis(s):
    s = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', s)
    s = re.sub(r'(?<!\w)__(.+?)__(?!\w)', r'<strong>\1</strong>', s)
    s = re.sub(r'(?<![\w*])\*(?![\s*])(.+?)(?<![\s*])\*(?![\w*])', r'<em>\1</em>', s)
    s = re.sub(r'(?<![\w_])_(?![\s_])(.+?)(?<![\s_])_(?![\w_])', r'<em>\1</em>', s)
    return s


LIST_RE = re.compile(r'^(\s*)([-*+]|\d+[.)])\s+(.*)$')
TABLE_SEP = re.compile(r'^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$')


def cells(line):
    line = line.strip()
    if line.startswith('|'):
        line = line[1:]
    if line.endswith('|') and not line.endswith('\\|'):
        line = line[:-1]
    return [c.strip().replace('\\|', '|') for c in re.split(r'(?<!\\)\|', line)]


def is_block_start(lines, i):
    l = lines[i]
    return (re.match(r'^(#{1,6})\s', l) or l.startswith('```') or l.startswith('>') or LIST_RE.match(l)
            or re.match(r'^(-{3,}|\*{3,}|_{3,})\s*$', l)
            or (l.lstrip().startswith('|') and i + 1 < len(lines) and TABLE_SEP.match(lines[i + 1])))


def md(text, keep=(), shift=0):
    """Markdown → HTML. `keep` : noms protégés de la mise en sentence case ; `shift` : décalage des niveaux de titre."""
    lines = text.replace('\r\n', '\n').split('\n')
    out, i = [], 0
    while i < len(lines):
        l = lines[i]
        if not l.strip():
            i += 1
            continue
        m = re.match(r'^(#{1,6})\s+(.*?)\s*#*\s*$', l)
        if m:
            n = min(6, len(m.group(1)) + shift)
            raw = m.group(2)
            out.append(f'<h{n} id="{heading_id(raw)}">{inline(sentence(raw, keep))}</h{n}>')
            i += 1
            continue
        if l.startswith('```'):
            lang, buf = l[3:].strip(), []
            i += 1
            while i < len(lines) and not lines[i].startswith('```'):
                buf.append(lines[i])
                i += 1
            i += 1
            out.append(f'<pre class="md__code"{f" data-lang={chr(34)}{a(lang)}{chr(34)}" if lang else ""}><code>{e(chr(10).join(buf))}</code></pre>')
            continue
        if re.match(r'^(-{3,}|\*{3,}|_{3,})\s*$', l):
            out.append('<hr />')
            i += 1
            continue
        if l.lstrip().startswith('|') and i + 1 < len(lines) and TABLE_SEP.match(lines[i + 1]):
            head = cells(l)
            aligns = ['center' if c.startswith(':') and c.endswith(':') else 'right' if c.endswith(':') else ''
                      for c in cells(lines[i + 1])]
            i += 2
            rows = []
            while i < len(lines) and lines[i].strip().startswith('|'):
                rows.append(cells(lines[i]))
                i += 1
            al = lambda k: f' style="text-align:{aligns[k]}"' if k < len(aligns) and aligns[k] else ''
            th = ''.join(f'<th{al(k)}>{inline(c)}</th>' for k, c in enumerate(head))
            trs = ''.join('<tr>' + ''.join(f'<td{al(k)}>{inline(c)}</td>' for k, c in enumerate(r)) + '</tr>' for r in rows)
            out.append(f'<div class="md__table"><table><thead><tr>{th}</tr></thead><tbody>{trs}</tbody></table></div>')
            continue
        if l.startswith('>'):
            buf = []
            while i < len(lines) and lines[i].startswith('>'):
                buf.append(re.sub(r'^>\s?', '', lines[i]))
                i += 1
            out.append(f'<blockquote>{md(chr(10).join(buf), keep, shift)}</blockquote>')
            continue
        lm = LIST_RE.match(l)
        if lm:
            indent = len(lm.group(1))
            ordered = lm.group(2)[0].isdigit()
            items = []
            while i < len(lines):
                cur = lines[i]
                cm = LIST_RE.match(cur)
                if cm and len(cm.group(1)) == indent:
                    items.append([cm.group(3)])
                    i += 1
                elif cur.strip() and (len(cur) - len(cur.lstrip()) > indent) and items:
                    items[-1].append(cur[indent + 2:] if cur[:indent + 2].strip() == '' else cur.strip())
                    i += 1
                elif not cur.strip() and i + 1 < len(lines) and items and (
                        (LIST_RE.match(lines[i + 1]) and len(LIST_RE.match(lines[i + 1]).group(1)) == indent)
                        or len(lines[i + 1]) - len(lines[i + 1].lstrip()) > indent):
                    i += 1
                else:
                    break
            lis = []
            for it in items:
                first, rest = it[0], it[1:]
                sub = md('\n'.join(rest), keep, shift) if rest and any(LIST_RE.match(r) for r in rest) else ''
                text = first if sub else ' '.join([first] + rest)
                lis.append(f'<li>{inline(text)}{sub}</li>')
            start = int(re.match(r'\d+', lm.group(2)).group(0)) if ordered else 1
            tag = 'ol' if ordered else 'ul'
            out.append(f'<{tag}{f" start={chr(34)}{start}{chr(34)}" if ordered and start != 1 else ""}>{"".join(lis)}</{tag}>')
            continue
        buf = [l.strip()]
        i += 1
        while i < len(lines) and lines[i].strip() and not is_block_start(lines, i):
            buf.append(lines[i].strip())
            i += 1
        para = ' '.join(buf)
        im = re.fullmatch(r'!\[([^\]]*)\]\(([^)\s]+)\)', para)
        if im:
            out.append(f'<figure class="md__fig">{inline(para)}{f"<figcaption>{e(im.group(1))}</figcaption>" if im.group(1) else ""}</figure>')
        else:
            out.append(f'<p>{inline(para)}</p>')
    return '\n'.join(out)


# ---------- Données (même logique que src/lib/shopify-apps.ts) ----------
RATING_RE = re.compile(r'(\d(?:[.,]\d)?)\s*/\s*5(?:\s*\(\s*(\d[\d.,\s]*?)\s*(?:reviews?|avis|reseñas)\b[^)]*\))?', re.I)
FAQ_HEADING = re.compile(r'^##\s+(?:Frequently Asked Questions|FAQs?|Questions fr[ée]quentes|Preguntas frecuentes)\b[^\n]*$', re.I | re.M)


def parse_rating(desc):
    m = RATING_RE.search(desc or '')
    if not m:
        return None, None
    r = float(m.group(1).replace(',', '.'))
    if not 0 < r <= 5:
        return None, None
    rev = re.sub(r'[.,\s]', '', m.group(2)) if m.group(2) else ''
    return r, (int(rev) if rev.isdigit() and int(rev) > 0 else None)


def desc_paragraphs(desc, rating):
    """Description de l'app (HTML de l'export Webflow) sans la ligne de note, en paragraphes de texte."""
    d = desc or ''
    if rating:
        d = re.sub(r'^\s*<p[^>]*>\s*<strong>[^<]*/\s*5[^<]*</strong>\s*</p>', '', d, flags=re.I)
    parts = re.split(r'</p>|<br\s*/?>', d)
    return [t for t in (html.unescape(re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', ' ', p))).strip() for p in parts) if t]


def split_faq(content):
    m = FAQ_HEADING.search(content)
    if not m:
        return content, None, [], ''
    before, rest = content[:m.start()], content[m.start():]
    nl = rest.find('\n')
    title = re.sub(r'^##\s+', '', rest if nl < 0 else rest[:nl]).strip()
    body = '' if nl < 0 else rest[nl + 1:]
    nxt = re.search(r'^##\s', body, re.M)
    section, after = (body, '') if not nxt else (body[:nxt.start()], body[nxt.start():])
    items = []
    for block in re.split(r'^###\s+', section, flags=re.M)[1:]:
        q, _, ans = block.partition('\n')
        if q.strip() and ans.strip():
            items.append((q.strip(), ans.strip()))
    return before, title, items, after


def name_key(s):
    return re.sub(r'[^a-z0-9]+', ' ', s.lower()).strip()


def section_ids(content, apps):
    heads = []
    for m in re.finditer(r'^#{2,3}[ \t]+((?:#\d+|Featured:?|En bonus ?:?)[ \t]+.+?)[ \t]*$', content, re.M):
        t = m.group(1).strip()
        heads.append((heading_id(t), name_key(re.sub(r'^(?:#\d+|Featured:?|En bonus ?:?)\s+', '', t))))
    res = []
    for app in apps:
        k = name_key(app['name'])
        hit = next((h for h in heads if h[1] == k), None) or next((h for h in heads if h[1].startswith(k + ' ')), None)
        res.append(hit[0] if k and hit else None)
    return res


def reading_minutes(c):
    text = ' '.join([c['content']] + [x.get('description') or '' for x in c['apps']])
    text = re.sub(r'[|#*_`>\[\]()!]', ' ', re.sub(r'<[^>]+>', ' ', text))
    return max(1, round(len(text.split()) / 200))


def iso_day(v):
    v = str(v or '')
    return v[:10] if re.match(r'\d{4}-\d{2}-\d{2}', v) else ''


def load(site):
    d = os.path.join(site, 'content/shopify-apps')
    cols = []
    for fn in os.listdir(d):
        if not fn.endswith('.md'):
            continue
        raw = open(os.path.join(d, fn), encoding='utf-8').read()
        _, fm, body = raw.split('---\n', 2)
        meta = yaml.safe_load(fm)
        apps = []
        for x in meta.get('apps') or []:
            r, rev = parse_rating(x.get('description'))
            apps.append({**x, 'rating': r, 'reviews': rev, 'featured': x.get('featured') is True})
        cols.append({'slug': fn[:-3], 'title': meta.get('title') or fn[:-3], 'shortTitle': meta.get('shortTitle') or meta.get('title'),
                     'description': meta.get('description') or '', 'date': str(meta.get('date') or ''),
                     'dateModified': str(meta.get('dateModified') or ''), 'sectionTitle': meta.get('sectionTitle') or '',
                     'featureColumns': meta.get('featureColumns') or ['Feature 1', 'Feature 2', 'Feature 3'],
                     'apps': apps, 'content': body, 'tags': meta.get('tags') or []})
    return sorted(cols, key=lambda c: c['date'], reverse=True)


def ranked(apps):
    return [x for x in apps if not x['featured']]


def related(cur, cols, limit=3):
    tags = {t.lower() for t in cur['tags']}
    pool = [c for c in cols if c['slug'] != cur['slug']]
    mod = lambda c: c['dateModified'] or c['date']
    shared = lambda c: len([t for t in c['tags'] if t.lower() in tags])
    pool.sort(key=lambda c: (shared(c), mod(c), c['date']), reverse=True)
    return pool[:limit]


# ---------- Morceaux de page ----------
def fmt_num(n):
    return f'{n:,}'


def rating_html(app, compact=False):
    if not app.get('rating'):
        return ''
    r = app['rating']
    rs = f'{r:g}'
    suffix = f'({fmt_num(app["reviews"])} reviews on Shopify)' if app.get('reviews') else 'on Shopify'
    if compact:
        suffix = f'({fmt_num(app["reviews"])})' if app.get('reviews') else ''
    return f'<span class="sa-rating">{STAR}<strong>{rs}/5</strong>{f"<span>{suffix}</span>" if suffix else ""}</span>'


def icon_html(app, size=48):
    src = app.get('icon') or ''
    if src.startswith('/'):
        src = LIVE + src
    if src:
        return f'<img class="sa-icon" src="{a(src)}" alt="" width="{size}" height="{size}" loading="lazy" />'
    return f'<span class="sa-icon sa-icon--letter" aria-hidden="true">{e(app["name"][:1])}</span>'


def feature_val(v):
    v = str(v or '').strip()
    if re.match(r'(?i)^yes\b', v):
        rest = re.sub(r'(?i)^yes\b[\s:,.-]*', '', v).strip()
        return 'yes', rest
    if re.match(r'(?i)^no\b', v):
        rest = re.sub(r'(?i)^no\b[\s:,.-]*', '', v).strip()
        return 'no', rest
    return '', v


def app_card(app, rank, cols, sid, keep, k):
    lines = []
    for label, key in zip(cols, ('feature1', 'feature2', 'feature3')):
        kind, rest = feature_val(app.get(key))
        if not kind and not rest:
            continue
        ico = YES if kind == 'yes' else NO if kind == 'no' else '<span class="sa-dot" aria-hidden="true"></span>'
        word = {'yes': 'Yes', 'no': 'No'}.get(kind, '')
        val = (f'<b>{word}</b>' if word else '') + (f'<span>{e(rest)}</span>' if rest else '')
        lines.append(f'<li class="sa-feat sa-feat--{kind or "info"}">{ico}<span class="sa-feat__label">{e(sentence(label, keep))}</span><span class="sa-feat__val">{val}</span></li>')
    paras = desc_paragraphs(app.get('description'), app.get('rating'))
    anchor = sid or heading_id(app['name'])
    rank_pill = f'<span class="sa-rank">#{rank}</span>' if rank else '<span class="sa-rank sa-rank--featured">Featured</span>'
    badge = f'<span class="sa-badge">{e(sentence(app["badge"], keep))}</span>' if app.get('badge') else ''
    price = f'<span class="sa-price">{e(app["price"])}</span>' if app.get('price') else ''
    actions = []
    if app.get('shopifyUrl'):
        actions.append(f'<a class="btn btn--dark btn--nav" href="{a(app["shopifyUrl"])}" target="_blank" rel="noopener">View on Shopify{EXT}</a>')
    if sid:
        actions.append(f'<a class="sa-review-link" href="#{sid}">Read the full review{ARROW}</a>')
    return f'''
          <article class="sa-app reveal reveal--up" id="{a(heading_id(app['name']))}" style="--d:{k % 2}">
            <div class="sa-app__head">
              {icon_html(app)}
              <div class="sa-app__id">
                <div class="sa-app__name">{rank_pill}<h3>{e(app['name'])}</h3>{badge}</div>
                <div class="sa-app__meta">{rating_html(app)}{price}</div>
              </div>
            </div>
            {''.join(f'<p class="sa-app__desc">{e(p)}</p>' for p in paras)}
            {f'<ul class="sa-feats">{"".join(lines)}</ul>' if lines else ''}
            {f'<div class="sa-app__actions">{"".join(actions)}</div>' if actions else ''}
          </article>'''


def faq_section(title, items, answer_html=False, sid='faq'):
    rows = ''.join(f'''
          <details{' open' if i == 0 else ''}>
            <summary>{e(q)}<span class="faq__icon"></span></summary>
            <div class="faq__body">{ans if answer_html else f'<p>{e(ans)}</p>'}</div>
          </details>''' for i, (q, ans) in enumerate(items))
    return f'''
    <!-- ============ FAQ ============ -->
    <section class="sec" id="{sid}">
      <div class="wrap wrap--narrow cols cols--top">
        <h2 class="reveal">{e(title)}</h2>
        <div class="faq reveal">{rows}
        </div>
      </div>
    </section>
'''


def hero_ctas(t, d=3):
    return (f'<div class="ah__ctas reveal" style="--d:{d}">\n'
            f'          <a class="btn btn--dark btn--lg" href="{SHOPIFY_APP_URL}" target="_blank" rel="noopener">{e(t["installBtn"])}</a>\n'
            f'          <a class="btn btn--soft btn--lg" href="{LIVE}/demo">Book a demo</a>\n'
            '        </div>')


def collection_page(c, cols, t, keep):
    apps = c['apps']
    sids = section_ids(c['content'], apps)
    before, faq_title, faq_items, after = split_faq(c['content'])
    n_ranked = len(ranked(apps))
    upd = ''
    if iso_day(c['dateModified']):
        upd = f"{t['updated']} {dt.date.fromisoformat(iso_day(c['dateModified'])).strftime('%B %Y')}"
    facts = [f for f in (upd, t['glanceApps'].replace('{count}', str(n_ranked)),
                         t['glanceReadingTime'].replace('{minutes}', str(reading_minutes(c)))) if f]
    facts_html = '<span aria-hidden="true">·</span>'.join(f'<span>{e(f)}</span>' for f in facts)

    cards, rank, seen_featured = [], 0, False
    for k, app in enumerate(apps):
        if app['featured']:
            if not seen_featured:
                cards.append(f'\n          <h3 class="sa-sub reveal">{e(sentence(t["featuredHeading"]))}</h3>')
                seen_featured = True
            cards.append(app_card(app, None, c['featureColumns'], sids[k], keep, k))
        else:
            rank += 1
            cards.append(app_card(app, rank, c['featureColumns'], sids[k], keep, k))

    jumps = [('apps', t['inPageNav']), ('guide', t['tableOfContents'])]
    if faq_items:
        jumps.append(('faq', t['jumpFaq']))
    jump_html = ''.join(f'<a href="#{i}">{e(lbl)}</a>' for i, lbl in jumps)

    rel = related(c, cols)
    rel_html = ''.join(f'''
          <a class="sa-guide reveal reveal--up" style="--d:{k}" href="{LIVE}/best-shopify-apps/{g['slug']}">
            <span class="sa-count">{e(t['glanceApps'].replace('{count}', str(len(ranked(g['apps'])))))}</span>
            <strong>{e(sentence(g['shortTitle'], keep))}</strong>
            <span class="sa-guide__desc">{e(g['description'])}</span>
            <span class="sa-guide__cta">{e(t['viewGuide'])}{ARROW}</span>
          </a>''' for k, g in enumerate(rel))
    rel_html += f'''
          <a class="sa-guide sa-guide--hub feature__visual feature__visual--b reveal reveal--up" style="--d:3" href="{LIVE}/whatsapp-shopify">
            <span class="sa-guide__card"><span class="sa-count"><svg aria-hidden="true"><use href="#logo-kanal-mark" /></svg>Kanal</span>
            <strong>{e(t['relatedHub'])}</strong>
            <span class="sa-guide__desc">{e(t['relatedHubDescription'])}</span>
            <span class="sa-guide__cta">{e(t['viewGuide'])}{ARROW}</span></span>
          </a>'''

    faq_html = ''
    if faq_items:
        faq_html = faq_section(sentence(faq_title or t['faqTitle']),
                               [(sentence(q, keep), md(ans, keep)) for q, ans in faq_items], answer_html=True)
    after_html = ''
    if after.strip():
        after_html = f'''
    <section class="sec">
      <div class="wrap">
        <div class="sa-col md reveal">
{md(after, keep)}
        </div>
      </div>
    </section>
'''
    main = f'''  <main class="sa-page">
    <!-- ============ HERO ============ -->
    <section class="ah">
      <div class="wrap">
        <nav class="ah__eyebrow sa-crumb reveal" aria-label="Breadcrumb"><a href="{LIVE}/best-shopify-apps">{e(sentence(t['breadcrumbApps']))}</a><span aria-hidden="true">/</span><span aria-current="page">{e(sentence(c['shortTitle'], keep))}</span></nav>
        <h1 class="ah__title sa-title reveal" style="--d:1">{e(sentence(c['title'], keep))}</h1>
        <p class="sa-facts reveal" style="--d:2">{facts_html}</p>
        <p class="ah__sub reveal" style="--d:2">{e(c['description'])}</p>
        {hero_ctas(t)}
        <nav class="sa-jump reveal" style="--d:4" aria-label="{a(t['jumpTo'])}">{jump_html}</nav>
      </div>
    </section>

    <!-- ============ APPS CLASSÉES ============ -->
    <section class="sec sa-first" id="apps">
      <div class="wrap">
        <div class="sa-col">
          <h2 class="sa-h2 reveal">{e(sentence(c['sectionTitle'], keep))}</h2>
          <div class="sa-apps">{''.join(cards)}
          </div>
        </div>
      </div>
    </section>

    <!-- ============ ARTICLE ============ -->
    <section class="sec" id="guide">
      <div class="wrap">
        <article class="sa-col md reveal">
{md(before, keep)}
        </article>
      </div>
    </section>
{faq_html}{after_html}
    <!-- ============ GUIDES ASSOCIÉS ============ -->
    <section class="sec">
      <div class="wrap">
        <div class="shead shead--solo">
          <h2 class="shead__title reveal">{e(t['relatedTitle'])}.<span class="muted">More Shopify app comparisons.</span></h2>
        </div>
        <div class="sa-guides">{rel_html}
        </div>
      </div>
    </section>
  </main>
'''
    return {'out': f'best-shopify-apps/{c["slug"]}.html', 'title': c['title'] + ' | Kanal', 'description': c['description'],
            'styles': ['pages.css', 'pricing.css', 'shopify-apps.css'], 'scripts': [], 'current': None, 'extra': '',
            'main': main}


def index_page(cols, t, logos, keep):
    by_slug = {c['slug']: c for c in cols}
    groups = [g for g in t['mustHave']['groups'] if any(s in by_slug for s in g['slugs'])]
    placed = {s for g in groups for s in g['slugs']}
    others = [c['slug'] for c in cols if c['slug'] not in placed]
    if others:
        groups.append({'title': t['bestByNeed']['otherGroup'], 'description': '', 'slugs': others})
    bn = t['bestByNeed']
    cats = bn['categories']

    # Tableau « n°1 par besoin » : une ligne par collection classée par qualité, sous les titres des groupes
    rows_html, latest = [], ''
    for g in groups:
        rows = []
        for s in g['slugs']:
            c = by_slug.get(s)
            if not c or s in BY_NEED_COLLECTIONS:
                continue
            r = ranked(c['apps'])
            if not r:
                continue
            top = r[0]
            latest = max(latest, iso_day(c['dateModified'] or c['date']))
            rating = (f'{STAR}<strong>{top["rating"]:g}/5</strong>' + (f'<span>({fmt_num(top["reviews"])} review{"s" if top["reviews"] != 1 else ""})</span>' if top.get('reviews') else '')
                      ) if top.get('rating') else f'<span>{e(bn["noRating"])}</span>'
            compare = f'Compare {len(r)} apps'
            rows.append(f'<div class="ct__row sa-bn__row" role="row"><div class="ct__feat" role="rowheader"><span>{e(cats.get(s, c["shortTitle"]))}</span></div>'
                        f'<div class="ct__val sa-bn__app" role="cell">{icon_html(top, 32)}<span>{e(top["name"])}</span></div>'
                        f'<div class="ct__val sa-bn__rating" role="cell" data-label="{a(bn["columns"]["rating"])}"><span class="sa-rating">{rating}</span></div>'
                        f'<div class="ct__val sa-bn__price" role="cell" data-label="{a(bn["columns"]["price"])}">{e(top.get("price") or "")}</div>'
                        f'<div class="ct__val sa-bn__link" role="cell"><a href="{LIVE}/best-shopify-apps/{s}">{compare}<span class="sa-vh">: {e(c["shortTitle"])}</span>{ARROW}</a></div></div>')
        if rows:
            rows_html.append(f'<div class="ct__group" role="row"><span role="rowheader">{e(g["title"])}</span></div>' + ''.join(rows))
    cols_head = bn['columns']
    table = (f'<div class="ct sa-bn reveal" role="table" aria-label="{a(bn["caption"])}">'
             f'<div class="ct__head" role="row"><div class="ct__feat" role="columnheader">{e(cols_head["category"])}</div>'
             f'<div class="ct__plan" role="columnheader">{e(cols_head["app"])}</div><div class="ct__plan" role="columnheader">{e(cols_head["rating"])}</div>'
             f'<div class="ct__plan" role="columnheader">{e(cols_head["price"])}</div><div class="ct__plan" role="columnheader">{e(cols_head["comparison"])}</div></div>'
             + '\n          '.join(rows_html) + '</div>')
    updated = bn['updated'].replace('{date}', dt.date.fromisoformat(latest).strftime('%B %-d, %Y')) if latest else ''

    # Collections regroupées par besoin
    group_html = []
    for gi, g in enumerate(groups):
        cards = []
        for k, s in enumerate(g['slugs']):
            c = by_slug.get(s)
            if not c:
                continue
            r = ranked(c['apps'])
            names = ''.join(f'<span>{e(x["name"])}</span>' for x in r[:4])
            more = f'<span class="sa-more">{e(t["moreApps"].replace("{count}", str(len(r) - 4)))}</span>' if len(r) > 4 else ''
            icons = ''.join(icon_html(x, 28) for x in r[:4])
            cards.append(f'''
            <a class="sa-coll reveal reveal--up" style="--d:{k % 3}" href="{LIVE}/best-shopify-apps/{s}">
              <span class="sa-coll__top"><span class="sa-coll__icons">{icons}</span><span class="sa-count">{len(r)} {e(t['appsCompared'])}</span></span>
              <strong>{e(sentence(c['shortTitle'], keep))}</strong>
              <span class="sa-coll__desc">{e(c['description'])}</span>
              <span class="sa-coll__names"><em>{e(t['appsIncludedLabel'])}</em>{names}{more}</span>
              <span class="sa-coll__cta">{e(sentence(t['viewBtn']))}{ARROW}</span>
            </a>''')
        group_html.append(f'''
        <div class="sa-group">
          <div class="sa-group__head reveal"><h3>{e(g['title'])}</h3>{f"<p>{e(g['description'])}</p>" if g['description'] else ''}</div>
          <div class="sa-colls">{''.join(cards)}
          </div>
        </div>''')

    main = f'''  <main class="sa-page">
    <!-- ============ HERO ============ -->
    <section class="ah">
      <div class="wrap">
        <span class="ah__eyebrow reveal">{e(sentence(t['preheader']))}</span>
        <h1 class="ah__title sa-title reveal" style="--d:1">{e(sentence(t['title'], keep))}</h1>
        <p class="ah__sub reveal" style="--d:2">{e(t['subtitle'])}</p>
        {hero_ctas(t)}
        {TRUST}
      </div>
    </section>

    <section class="sec sa-logos">
      <div class="wrap">
      {logos}
      </div>
    </section>

    <!-- ============ N°1 PAR BESOIN ============ -->
    <section class="sec" id="best-app-by-need">
      <div class="wrap">
        <div class="shead">
          <h2 class="shead__title reveal">{e(bn['title'])}.<span class="muted">{e(updated)}</span></h2>
          <div class="shead__intro reveal" style="--d:1"><p>{e(bn['intro'])}</p></div>
        </div>
        <div class="sa-table">
          {table}
          <p class="sa-foot reveal">{e(bn['footnote'])}</p>
        </div>
      </div>
    </section>

    <!-- ============ COLLECTIONS PAR BESOIN ============ -->
    <section class="sec" id="collections">
      <div class="wrap">
        <div class="shead">
          <h2 class="shead__title reveal">{e(t['mustHave']['title'])}.<span class="muted">{len(cols)} comparisons by need.</span></h2>
          <div class="shead__intro reveal" style="--d:1"><p>{e(t['mustHave']['intro'])}</p></div>
        </div>
        <div class="sa-groups">{''.join(group_html)}
        </div>
        <div class="sa-intro reveal">
          <p>{e(t['seoIntro'])}</p>
          <p>{e(t['seoIntroLine2Prefix'])}<a href="{LIVE}/alternatives">{e(t['seoIntroLine2Link1'])}</a>{e(t['seoIntroLine2Middle'])}<a href="{LIVE}/blog">{e(t['seoIntroLine2Link2'])}</a>{e(t['seoIntroLine2Suffix'])}</p>
        </div>
      </div>
    </section>
{faq_section(sentence(t['faqTitle'], keep), [(q['question'], q['answer']) for q in t['faq']])}  </main>
'''
    return {'out': 'best-shopify-apps.html', 'title': t['title'] + ' | Kanal', 'description': t['subtitle'],
            'styles': ['pages.css', 'pricing.css', 'shopify-apps.css'], 'scripts': [], 'current': None, 'extra': '',
            'main': main}


def logos_block():
    s = open(os.path.join(ROOT, 'src/pages/case-studies.html'), encoding='utf-8').read()
    i = s.index('<div class="logos reveal">')
    j = s.index('</div>\n      </div>', i) + len('</div>\n      </div>')
    return s[i:j]


def pages(site):
    with open(os.path.join(site, 'messages/en.json'), encoding='utf-8') as f:
        msgs = json.load(f)
    t_list, t_coll = msgs['shopifyAppsPage'], msgs['shopifyCollectionPage']
    cols = load(site)
    keep = sorted({x['name'] for c in cols for x in c['apps']}, key=len, reverse=True)
    out = [index_page(cols, t_list, logos_block(), keep)]
    out += [collection_page(c, cols, t_coll, keep) for c in cols]
    return out
