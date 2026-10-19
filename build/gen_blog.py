"""Blog : page liste (blog.html) et une page par article (blog/<slug>.html).

Source : content/blog/*.md du dépôt getkanal/getkanal.com (front matter YAML +
corps Markdown), articles en anglais uniquement (locale: en ou sans locale).
Libellés repris de messages/en.json → blog et blogArticlePage (mêmes textes que
src/components/BlogList.tsx et BlogArticle.tsx). Temps de lecture calculé comme
sur le site : mots / 200, arrondi, minimum 1.

Le Markdown est converti par un petit convertisseur maison (pas de dépendance) :
titres avec ancres, paragraphes, gras / italique / barré, liens, code en ligne,
blocs de code, listes ordonnées ou non (imbriquées, cases à cocher), citations,
images, tableaux GFM, séparateurs. Les liens /chemin deviennent
https://getkanal.com/chemin (la construction les réécrit vers la page locale
quand elle existe) et les images /images/... pointent vers getkanal.com.
"""
import datetime as dt
import html
import json
import os
import re
from collections import Counter

import yaml

LIVE = 'https://getkanal.com'
PER_PAGE = 12          # comme BlogList.tsx (POSTS_PER_PAGE)
FILTERS = 9            # nombre de pastilles de filtre (étiquettes les plus fréquentes)

e = lambda s: html.escape(str(s), quote=False)
a = lambda s: html.escape(str(s), quote=True)


# =====================================================================
# Markdown → HTML
# =====================================================================
LIST_RE = re.compile(r'^( {0,12})([-*+]|\d{1,9}[.)])( +|$)(.*)$')
FENCE_RE = re.compile(r'^(`{3,}|~{3,})\s*([\w+#.-]*)')
HEAD_RE = re.compile(r'^(#{1,6})\s+(.*?)(?:\s+#+)?\s*$')
HR_RE = re.compile(r'^ {0,3}([-*_])(?:\s*\1){2,}\s*$')
TABLE_SEP_RE = re.compile(r'^\s*\|?\s*:?-{1,}:?\s*(\|\s*:?-{1,}:?\s*)*\|?\s*$')


def slugify(text):
    """Ancre d'un titre, même règle que src/lib/markdown.ts."""
    s = re.sub(r'[^\w\s-]', '', text.lower())
    return re.sub(r'-+', '-', re.sub(r'\s+', '-', s)).strip()


def live_url(url):
    """/chemin → URL getkanal.com (la construction relie ensuite la page locale)."""
    if url.startswith('//'):
        return 'https:' + url
    if url.startswith('/'):
        return LIVE + url
    return url


def is_internal(url):
    return url.startswith('/') and not url.startswith('//') or url.startswith(LIVE)


class Inline:
    """Convertisseur en ligne : on met de côté code, liens et images (jetons),
    on échappe le reste, puis on applique gras / italique."""

    def __init__(self):
        self.store = []

    def keep(self, s):
        self.store.append(s)
        return f'\x00{len(self.store) - 1}\x00'

    def restore(self, s):
        while '\x00' in s:
            s = re.sub(r'\x00(\d+)\x00', lambda m: self.store[int(m.group(1))], s)
        return s

    def run(self, text):
        return self.restore(self.convert(text))

    def convert(self, text):
        # code en ligne
        text = re.sub(r'(`+)(.+?)\1', lambda m: self.keep(f'<code>{e(m.group(2).strip())}</code>'), text)
        # échappements
        text = re.sub(r'\\([\\`*_{}\[\]()#+\-.!|~<>$])', lambda m: self.keep(e(m.group(1))), text)
        # liens automatiques <https://…>
        text = re.sub(r'<(https?://[^>\s]+)>', lambda m: self.keep(self.anchor(m.group(1), e(m.group(1)))), text)
        url = r'<?((?:[^\s()<>]|\([^\s()]*\))*)>?(?:\s+"([^"]*)")?'
        # images
        text = re.sub(r'!\[([^\]]*)\]\(\s*' + url + r'\s*\)', lambda m: self.keep(self.image(m.group(1), m.group(2), m.group(3))), text)
        # liens
        text = re.sub(r'\[((?:[^\[\]]|\[[^\[\]]*\])*)\]\(\s*' + url + r'\s*\)',
                      lambda m: self.keep(self.anchor(m.group(2), self.convert(m.group(1)), m.group(3))), text)
        text = e(text)
        # gras et italique
        text = re.sub(r'\*\*\*(?=\S)(.+?)(?<=\S)\*\*\*', r'<strong><em>\1</em></strong>', text)
        text = re.sub(r'\*\*(?=\S)(.+?)(?<=\S)\*\*', r'<strong>\1</strong>', text)
        text = re.sub(r'(?<!\w)__(?=\S)(.+?)(?<=\S)__(?!\w)', r'<strong>\1</strong>', text)
        text = re.sub(r'(?<![*\w])\*(?=[^\s*])(.+?)(?<=[^\s*])\*(?![*\w])', r'<em>\1</em>', text)
        text = re.sub(r'(?<![\w])_(?=[^\s_])(.+?)(?<=[^\s_])_(?!\w)', r'<em>\1</em>', text)
        text = re.sub(r'~~(?=\S)(.+?)(?<=\S)~~', r'<del>\1</del>', text)
        # retours à la ligne forcés
        text = re.sub(r'(?: {2,}|\\)\n', '<br />\n', text)
        return text

    def anchor(self, url, inner, title=None):
        t = f' title="{a(title)}"' if title else ''
        if url.startswith('#'):
            return f'<a href="{a(url)}"{t}>{inner}</a>'
        if is_internal(url):
            return f'<a href="{a(live_url(url))}"{t}>{inner}</a>'
        if url.startswith('mailto:') or url.startswith('tel:'):
            return f'<a href="{a(url)}"{t}>{inner}</a>'
        return f'<a href="{a(url)}"{t} target="_blank" rel="noopener">{inner}</a>'

    def image(self, alt, src, title=None):
        t = f' title="{a(title)}"' if title else ''
        return f'<img src="{a(live_url(src))}" alt="{a(alt)}"{t} loading="lazy" decoding="async" />'


def inline(text):
    return Inline().run(text)


def indent_of(line):
    return len(line) - len(line.lstrip(' '))


def starts_block(line):
    s = line.strip()
    return bool(HEAD_RE.match(s) or FENCE_RE.match(s) or HR_RE.match(line) or s.startswith('>')
                or LIST_RE.match(line) and LIST_RE.match(line).group(4).strip())


def split_row(row):
    row = row.strip()
    if row.startswith('|'):
        row = row[1:]
    if row.endswith('|') and not row.endswith('\\|'):
        row = row[:-1]
    cells, buf, code = [], '', False
    for i, ch in enumerate(row):
        if ch == '`':
            code = not code
        if ch == '|' and not code and (i == 0 or row[i - 1] != '\\'):
            cells.append(buf)
            buf = ''
        else:
            buf += ch
    cells.append(buf)
    return [c.strip().replace('\\|', '|') for c in cells]


def render_table(lines):
    head = split_row(lines[0])
    aligns = []
    for c in split_row(lines[1]):
        left, right = c.startswith(':'), c.endswith(':')
        aligns.append('center' if left and right else 'right' if right else 'left' if left else '')
    al = lambda i: f' style="text-align:{aligns[i]}"' if i < len(aligns) and aligns[i] in ('center', 'right') else ''
    th = ''.join(f'<th{al(i)}>{inline(c)}</th>' for i, c in enumerate(head))
    rows = []
    for line in lines[2:]:
        cells = split_row(line)
        cells = (cells + [''] * len(head))[:len(head)]
        rows.append('<tr>' + ''.join(f'<td{al(i)}>{inline(c)}</td>' for i, c in enumerate(cells)) + '</tr>')
    return (f'<div class="post__table"><table><thead><tr>{th}</tr></thead>'
            f'<tbody>{"".join(rows)}</tbody></table></div>')


def parse_list(lines, i):
    """Une liste (et ses sous-listes) à partir de la ligne i → (html, i suivant)."""
    first = LIST_RE.match(lines[i])
    base = len(first.group(1))
    ordered = first.group(2)[0].isdigit()
    start = int(first.group(2)[:-1]) if ordered else 1
    items, loose, n = [], False, len(lines)
    while i < n:
        m = LIST_RE.match(lines[i])
        if not m or m.group(2)[0].isdigit() != ordered or len(m.group(1)) > base + 3:
            break
        spaces = len(m.group(3)) if m.group(4) else 1
        offset = len(m.group(1)) + len(m.group(2)) + (spaces if spaces <= 4 else 1)
        body = [m.group(4) if spaces <= 4 else ' ' * (spaces - 1) + m.group(4)]
        i += 1
        done = False
        while i < n:
            line = lines[i]
            if not line.strip():
                j = i
                while j < n and not lines[j].strip():
                    j += 1
                if j >= n:
                    i = j
                    done = True
                    break
                nxt = lines[j]
                if indent_of(nxt) >= offset:
                    body += [''] * (j - i)
                    i = j
                    continue
                mm = LIST_RE.match(nxt)
                if mm and len(mm.group(1)) <= base + 3 and mm.group(2)[0].isdigit() == ordered:
                    loose = True
                    i = j
                    break
                i = j
                done = True
                break
            ind = indent_of(line)
            if ind >= offset:
                body.append(line[offset:])
                i += 1
                continue
            mm = LIST_RE.match(line)
            if mm:
                if ind > base + 1:      # sous-liste moins indentée que le texte de l'élément : elle lui appartient
                    body.append(line[ind:])
                    i += 1
                    continue
                break
            if body and body[-1].strip() and not starts_block(line):
                body.append(line.strip())          # continuation paresseuse
                i += 1
                continue
            done = True
            break
        # élément « lâche » s'il contient des lignes vides entre deux blocs
        inner = '\n'.join(body).strip('\n')
        if re.search(r'\S\n\s*\n\s*\S', inner) and not FENCE_RE.match(body[0].strip()):
            loose = True
        items.append(body)
        if done:
            break
    lis = []
    for body in items:
        task = ''
        tm = re.match(r'^\[([ xX])\]\s+', body[0]) if body else None
        if tm:
            checked = ' checked' if tm.group(1).lower() == 'x' else ''
            task = f'<input type="checkbox" disabled{checked} aria-hidden="true" /> '
            body = [body[0][tm.end():]] + body[1:]
        content = render_blocks(body, tight=not loose)
        cls = ' class="is-task"' if task else ''
        lis.append(f'<li{cls}>{task}{content}</li>')
    tag = 'ol' if ordered else 'ul'
    st = f' start="{start}"' if ordered and start != 1 else ''
    return f'<{tag}{st}>\n' + '\n'.join(lis) + f'\n</{tag}>', i


def render_blocks(lines, tight=False):
    out, i, n = [], 0, len(lines)
    para = []

    def flush():
        if para:
            text = inline('\n'.join(para).strip())
            fig = re.fullmatch(r'\s*(<img [^>]+/>)\s*(?:<br />)?\s*(.*?)\s*', text, re.S)
            if fig and not tight and '<img' not in fig.group(2):
                # image seule, ou image suivie de sa légende (« _Screenshot of…_ » à la ligne suivante)
                cap = f'<figcaption>{fig.group(2)}</figcaption>' if fig.group(2) else ''
                out.append(f'<figure>{fig.group(1)}{cap}</figure>')
            else:
                out.append(text if tight else f'<p>{text}</p>')
            para.clear()

    while i < n:
        line = lines[i]
        s = line.strip()
        if not s:
            flush()
            i += 1
            continue
        ind = indent_of(line)
        m = FENCE_RE.match(s)
        if m and ind < 4:
            flush()
            fence, lang, buf = m.group(1), m.group(2), []
            i += 1
            while i < n and not lines[i].strip().startswith(fence[0] * len(fence)):
                ln = lines[i]
                buf.append(ln[ind:] if ln[:ind].strip() == '' else ln.lstrip())
                i += 1
            i += 1
            cls = f' class="language-{a(lang)}"' if lang else ''
            out.append(f'<pre><code{cls}>{e(chr(10).join(buf))}</code></pre>')
            continue
        m = HEAD_RE.match(s)
        if m and ind < 4:
            flush()
            level = len(m.group(1))
            text = m.group(2)
            plain = re.sub(r'[*_`]|\[([^\]]*)\]\([^)]*\)', lambda x: x.group(1) or '', text)
            out.append(f'<h{level} id="{a(slugify(plain))}">{inline(text)}</h{level}>')
            i += 1
            continue
        if HR_RE.match(line):
            flush()
            out.append('<hr />')
            i += 1
            continue
        if s.startswith('>') and ind < 4:
            flush()
            buf = []
            while i < n and lines[i].strip():
                ln = lines[i].strip()
                if ln.startswith('>'):
                    buf.append(re.sub(r'^> ?', '', ln))
                elif buf and buf[-1].strip() and not starts_block(lines[i]):
                    buf.append(ln)
                else:
                    break
                i += 1
            out.append(f'<blockquote>{render_blocks(buf)}</blockquote>')
            continue
        if '|' in s and i + 1 < n and TABLE_SEP_RE.match(lines[i + 1]) and '-' in lines[i + 1]:
            flush()
            buf = [lines[i], lines[i + 1]]
            i += 2
            while i < n and lines[i].strip() and '|' in lines[i]:
                buf.append(lines[i])
                i += 1
            out.append(render_table(buf))
            continue
        m = LIST_RE.match(line)
        if m and (m.group(4).strip() or not para) and (not para or not m.group(2)[0].isdigit() or m.group(2)[:-1] == '1'):
            flush()
            block, i = parse_list(lines, i)
            out.append(block)
            continue
        para.append(line.strip() if not line.endswith('  ') else line.strip() + '  ')
        i += 1
    flush()
    return '\n'.join(out)


def markdown(md):
    lines = md.replace('\r\n', '\n').replace('\t', '    ').split('\n')
    return render_blocks(lines)


def word_count(md):
    """Même calcul que countWordsFromMarkdown (src/app/[locale]/blog/[slug]/page.tsx)."""
    return len([w for w in re.split(r'\s+', re.sub(r'[#*\[\]()!`>-]', ' ', md)) if w])


# =====================================================================
# Contenu
# =====================================================================
# Étiquettes en casse de phrase : on garde les noms propres et les sigles.
KEEP_PHRASES = ['WhatsApp Business API', 'WhatsApp Business', 'WhatsApp Web', 'WhatsApp Channels', 'WhatsApp Status',
                'WhatsApp Flows', 'WhatsApp Cloud API', 'Cloud API', 'Shopify Plus', 'Shopify Flow', 'Shopify Inbox',
                'Shopify Magic', 'Shopify Payments', 'Shopify Sidekick', 'Apple Messages for Business', 'Black Friday',
                'Click to WhatsApp', 'Meta AI', 'Meta Ads', 'Judge.me']
PROPER = {'Shopify', 'Instagram', 'Klaviyo', 'Meta', 'Gorgias', 'Android', 'Attentive', 'Omnisend', 'Mailchimp',
          'Recharge', 'Zendesk', 'Tidio', 'Yotpo', 'Amazon', 'Etsy', 'Wix', 'Squarespace', 'Sidekick', 'Apple',
          'Google', 'Facebook', 'Manychat', 'LinkDM'}
TAG_ALIASES = {'ecommerce': 'E-commerce', 'click-to-chat': 'Click to Chat', 'comparison': 'Comparisons'}


def sentence(tag):
    tag = TAG_ALIASES.get(tag.lower(), tag)
    keep = {}
    for i, p in enumerate(KEEP_PHRASES):
        if p.lower() in tag.lower():
            k = f'\x01{i}\x01'
            tag = re.sub(re.escape(p), k, tag, flags=re.I)
            keep[k] = p
    words = tag.split(' ')
    for i, w in enumerate(words):
        if i == 0 or '\x01' in w or w in PROPER or not w[:1].isupper() or any(ch.isupper() for ch in w[1:]):
            continue
        words[i] = w.lower()
    out = ' '.join(words)
    for k, p in keep.items():
        out = out.replace(k, p)
    return out[:1].upper() + out[1:]


def tag_key(tag):
    return re.sub(r'[^a-z0-9]+', '-', sentence(tag).lower()).strip('-')


def fmt_date(s):
    try:
        d = dt.date.fromisoformat(str(s)[:10])
    except ValueError:
        return str(s)
    return f'{d:%b} {d.day}, {d.year}'


def load_posts(site):
    folder = os.path.join(site, 'content/blog')
    posts = []
    for name in sorted(os.listdir(folder)):
        if not name.endswith('.md'):
            continue
        raw = open(os.path.join(folder, name), encoding='utf-8').read()
        m = re.match(r'---\s*\n(.*?)\n---\s*\n', raw, re.S)
        fm = yaml.safe_load(m.group(1)) if m else {}
        if (fm.get('locale') or 'en') != 'en':
            continue
        body = raw[m.end():] if m else raw
        tags = []
        for t in fm.get('tags') or []:
            label = sentence(str(t))
            if tag_key(label) not in [tag_key(x) for x in tags]:
                tags.append(label)
        posts.append({
            'slug': name[:-3],
            'title': str(fm.get('title') or name[:-3]),
            'description': str(fm.get('description') or '').strip(),
            'date': str(fm.get('date') or ''),
            'author': str(fm.get('author') or 'Nicolas Provost'),
            'image': fm.get('image'),
            'tags': tags,
            'keys': [tag_key(t) for t in tags],
            'faq': fm.get('faq') or [],
            'takeaways': [str(x).strip() for x in fm.get('keyTakeaways') or [] if str(x).strip()],
            'body': body,
            'minutes': max(1, round(word_count(body) / 200)),
        })
    posts.sort(key=lambda p: (p['date'], p['slug']), reverse=True)
    return posts


# =====================================================================
# Gabarits
# =====================================================================
ARROW = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3.5 10.5 8 6 12.5" /></svg>'


def avatar(author):
    if re.search(r'nicolas\s*provost', author, re.I):
        return '<img class="bmeta__av" src="assets/blog/nicolas-provost.jpg" alt="" width="24" height="24" />'
    initials = ''.join(w[0] for w in author.split()[:2]).upper()
    return f'<span class="bmeta__av bmeta__av--txt" aria-hidden="true">{e(initials)}</span>'


def cover(p, cls, eager=False):
    if not p['image']:
        return f'<div class="{cls} {cls}--empty" aria-hidden="true"><svg viewBox="0 0 96 24"><use href="#logo-kanal" /></svg></div>'
    load = 'fetchpriority="high"' if eager else 'loading="lazy" decoding="async"'
    return (f'<div class="{cls}"><img src="{a(live_url(p["image"]))}" alt="" width="1200" height="675" {load} /></div>')


def card(p, topic, d=0, extra=''):
    return (f'<a class="bcard reveal reveal--up" style="--d:{d}" href="{LIVE}/blog/{p["slug"]}" data-tags="{" ".join(p["keys"])}"{extra}>'
            f'{cover(p, "bcard__media")}'
            f'<div class="bcard__body"><span class="btag">{e(topic)}</span>'
            f'<h3 class="bcard__title">{e(p["title"])}</h3>'
            f'<p class="bcard__desc">{e(p["description"])}</p>'
            f'<span class="bcard__meta">{fmt_date(p["date"])} · {p["minutes"]} min read</span></div></a>')


def topic_of(p, filter_keys):
    for t, k in zip(p['tags'], p['keys']):
        if k in filter_keys:
            return t, k
    return (p['tags'][0], p['keys'][0]) if p['tags'] else ('Blog', '')


def list_page(posts, t, filters):
    fkeys = {k for k, _ in filters}
    feat, rest = posts[0], posts[1:]
    ftopic, _ = topic_of(feat, fkeys)
    pills = ''.join(f'<button class="bfilter__pill" type="button" data-tag="{k}" aria-pressed="false">{e(label)}</button>'
                    for k, label in filters)
    cards = '\n          '.join(card(p, topic_of(p, fkeys)[0], i % 3) for i, p in enumerate(rest))
    dup = card(feat, ftopic, 0, ' data-featured hidden')
    total = len(posts)                    # la carte à la une compte dans le total
    shown = min(PER_PAGE, len(rest)) + 1
    title = t['title']
    # « WhatsApp Marketing Insights & E-commerce Resources » → deux lignes en casse de phrase
    head, _, tail = title.partition(' & ')
    h1 = (f'{e(sentence(head))}<br /><span class="muted">{e(sentence(tail))}</span>' if tail else e(sentence(title)))
    main = f'''  <main class="blog-page">
    <!-- ============ HERO ============ -->
    <section class="ah">
      <div class="wrap">
        <span class="ah__eyebrow reveal">{e(sentence(t['preheader']))}</span>
        <h1 class="ah__title reveal" style="--d:1">{h1}</h1>
        <p class="ah__sub reveal" style="--d:2">{e(t['subtitle'])}</p>
        <nav class="bfilter reveal" style="--d:3" aria-label="Filter articles by topic" data-blog-filter>
          <button class="bfilter__pill" type="button" data-tag="" aria-pressed="true">All articles</button>{pills}
        </nav>
      </div>
    </section>

    <!-- ============ À LA UNE ============ -->
    <section class="sec blog-feat" data-blog-featured>
      <div class="wrap">
        <a class="duo bfeat reveal reveal--up" href="{LIVE}/blog/{feat['slug']}">
          {cover(feat, 'bfeat__media', eager=True)}
          <div class="duo__text bfeat__text">
            <div class="bfeat__top"><span class="btag">{e(ftopic)}</span><span class="bfeat__new">Latest article</span></div>
            <h2>{e(feat['title'])}</h2>
            <p>{e(feat['description'])}</p>
            <div class="bmeta">{avatar(feat['author'])}<span><strong>{e(feat['author'])}</strong>{fmt_date(feat['date'])} · {feat['minutes']} min read</span></div>          </div>
        </a>
      </div>
    </section>

    <!-- ============ ARTICLES ============ -->
    <section class="sec blog-list">
      <div class="wrap">
        <div class="bgrid" data-blog-grid data-per-page="{PER_PAGE}">
          {dup}
          {cards}
        </div>
        <div class="bmore" data-blog-more>
          <p class="bmore__count" data-blog-count data-template="{a(t['articlesCount'])}">{e(t['articlesCount'].replace('{shown}', str(shown)).replace('{total}', str(total)))}</p>
          <button class="btn btn--soft btn--lg" type="button" data-blog-load>{e(t['loadMore'])}<svg class="btn__icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg></button>
          <p class="bmore__done" data-blog-done hidden>{e(t['allDisplayed'])}</p>
        </div>
      </div>
    </section>
  </main>
'''
    return {'out': 'blog.html', 'title': a(f"{title} | Kanal"), 'description': a(t['subtitle']),
            'styles': ['pages.css', 'blog.css'], 'scripts': ['blog.js'], 'current': None, 'extra': '', 'main': main}


def related(p, posts, fkeys):
    _, tk = topic_of(p, fkeys)
    def score(q):
        shared = len(set(p['keys']) & set(q['keys']))
        return (tk in q['keys'], shared, q['date'])
    others = [q for q in posts if q['slug'] != p['slug']]
    return sorted(others, key=score, reverse=True)[:3]


def article_page(p, posts, t, fkeys):
    topic, tk = topic_of(p, fkeys)
    crumb_tag = (f'<a href="{LIVE}/blog#tag-{tk}">{e(topic)}</a>' if tk in fkeys else f'<span>{e(topic)}</span>')
    out = [f'''  <main class="post-page">
    <article class="post">
      <div class="wrap">
        <header class="post__head">
          <nav class="post__crumbs reveal" aria-label="Breadcrumb"><a href="{LIVE}/blog">Blog</a>{ARROW}{crumb_tag}</nav>
          <h1 class="post__title reveal" style="--d:1">{e(p['title'])}</h1>
          <p class="post__lead reveal" style="--d:2">{e(p['description'])}</p>
          <div class="bmeta post__meta reveal" style="--d:3">{avatar(p['author'])}<span><strong>{e(p['author'])}</strong>{fmt_date(p['date'])} · {p['minutes']} {t['minRead']}</span></div>
        </header>
''']
    if p['image']:
        out.append(f'''        <figure class="post__cover reveal reveal--up"><img src="{a(live_url(p['image']))}" alt="{a(p['title'])}" width="1200" height="675" fetchpriority="high" /></figure>
''')
    out.append('        <div class="post__col">\n')
    if p['takeaways']:
        lis = ''.join(f'<li>{inline(x)}</li>' for x in p['takeaways'])
        out.append(f'''          <section class="post__takeaways reveal" aria-labelledby="key-takeaways">
            <h2 id="key-takeaways">{e(t['takeawaysTitle'])}</h2>
            <ul>{lis}</ul>
          </section>
''')
    out.append(f'          <div class="prose">\n{markdown(p["body"])}\n          </div>\n        </div>\n      </div>\n    </article>\n')
    if p['faq']:
        items = ''.join(f'''
          <details{' open' if i == 0 else ''}>
            <summary>{e(q['question'])}<span class="faq__icon"></span></summary>
            <div class="faq__body"><p>{inline(str(q['answer']).strip())}</p></div>
          </details>''' for i, q in enumerate(p['faq']))
        out.append(f'''
    <!-- ============ FAQ ============ -->
    <section class="sec post-faq" id="faq">
      <div class="wrap wrap--narrow cols cols--top">
        <h2 class="reveal">{e(t['faqTitle'])}</h2>
        <div class="faq reveal">{items}
        </div>
      </div>
    </section>
''')
    rel = related(p, posts, fkeys)
    if rel:
        cards = ''.join(card(q, topic_of(q, fkeys)[0], i) for i, q in enumerate(rel))
        out.append(f'''
    <!-- ============ ARTICLES SUGGÉRÉS ============ -->
    <section class="sec post-related">
      <div class="wrap">
        <div class="bhead reveal">
          <h2>{e(t['suggestedTitle'])}</h2>
          <a class="btn btn--light btn--nav" href="{LIVE}/blog">All articles</a>
        </div>
        <div class="bgrid bgrid--related">{cards}</div>
      </div>
    </section>
''')
    out.append('  </main>\n')
    return {'out': f'blog/{p["slug"]}.html', 'title': a(f"{p['title']} | Kanal"), 'description': a(p['description']),
            'styles': ['pages.css', 'blog.css'], 'scripts': [], 'current': None, 'extra': '', 'main': ''.join(out)}


def pages(site):
    with open(os.path.join(site, 'messages/en.json'), encoding='utf-8') as f:
        msgs = json.load(f)
    t_list, t_post = msgs['blog'], msgs['blogArticlePage']
    posts = load_posts(site)
    if not posts:
        return []
    counts = Counter(k for p in posts for k in p['keys'])
    labels = {}
    for p in posts:
        for t, k in zip(p['tags'], p['keys']):
            labels.setdefault(k, t)
    filters = [(k, labels[k]) for k, _ in counts.most_common(FILTERS)]
    fkeys = {k for k, _ in filters}
    return [list_page(posts, t_list, filters)] + [article_page(p, posts, t_post, fkeys) for p in posts]
