#!/usr/bin/env python3
"""Assemble every page of the mockup from shared partials.

Pages come from two places:
  * src/pages/*.html — hand-written pages: a `<!--page {json} -->` header
    (title, description, styles, scripts, current, extra) followed by <main>.
  * tools/gen_*.py — generated pages, built from the content of the live
    site repository (getkanal/getkanal.com), so the copy matches production.

Every getkanal.com link that has a local page is rewritten to it, so the
menus and footer follow automatically as pages are added. Pages in
sub-folders get their relative URLs prefixed with ../.

Usage: python3 tools/build.py [--site /path/to/getkanal.com]
"""
import argparse
import datetime as dt
import importlib
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, 'tools'))

GENERATORS = sorted(f[:-3] for f in os.listdir(os.path.join(ROOT, 'tools')) if f.startswith('gen_') and f.endswith('.py'))


def read(path):
    with open(os.path.join(ROOT, path), encoding='utf-8') as f:
        return f.read()


def live_path(out):
    """Output file → the path the page has on getkanal.com."""
    p = out[:-5] if out.endswith('.html') else out
    return '/' if p == 'index' else '/' + p


def hand_pages():
    pages = []
    for name in sorted(os.listdir(os.path.join(ROOT, 'src/pages'))):
        if not name.endswith('.html'):
            continue
        raw = read('src/pages/' + name)
        m = re.match(r'<!--page (\{.*?\}) -->\n', raw, re.S)
        meta = json.loads(m.group(1))
        meta['main'] = raw[m.end():].rstrip() + '\n'
        meta['out'] = name
        pages.append(meta)
    return pages


def render(page, partials, local, v):
    out = page['out']
    depth = out.count('/')
    base = '../' * depth
    styles = ''.join(f'  <link rel="stylesheet" href="css/{s}?v={v}" />\n' for s in page.get('styles', []))
    scripts = ''.join(f'  <script src="js/{s}?v={v}"></script>\n' for s in page.get('scripts', []))
    html = (partials['head'].replace('{{title}}', page['title'])
            .replace('{{description}}', page['description'])
            .replace('{{styles}}', styles).replace('{{v}}', v)
            + partials['top'] + page['main']
            + partials['bottom'].replace('{{extra}}', page.get('extra') or '')
            .replace('{{scripts}}', scripts).replace('{{v}}', v))

    # liens getkanal.com qui ont une page locale → page locale (sans nouvel onglet)
    def to_local(m):
        target = local.get((m.group(1) or '/').rstrip('/') or '/')
        if not target:
            return m.group(0)
        return f'href="{target}{m.group(2) or ""}"'
    html = re.sub(r'href="https://getkanal\.com(/[^"#?]*)?(#[^"]*)?"(?: target="_blank" rel="noopener")?', to_local, html)

    current = page.get('current')
    if current:
        html = html.replace(f'<a class="nav__link" href="{current}">',
                            f'<a class="nav__link is-current" href="{current}" aria-current="page">', 1)

    if depth:
        html = re.sub(r'((?:href|src)=")(?!https?:|#|mailto:|tel:|data:|/|\.\./)([^"]+")',
                      lambda m: m.group(1) + base + m.group(2), html)
        html = re.sub(r'(srcset=")(?!https?:)', r'\1' + base, html)
    return html


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--site', default=os.environ.get('KANAL_SITE', '/home/user/getkanal.com'))
    args = ap.parse_args()

    partials = {k: read(f'src/partials/{k}.html') for k in ('head', 'top', 'bottom')}
    pages = hand_pages()
    for name in GENERATORS:
        mod = importlib.import_module(name)
        pages += mod.pages(args.site)

    local = {live_path(p['out']): p['out'] for p in pages}
    v = dt.datetime.now().strftime('%Y%m%d%H%M')
    for p in pages:
        depth = p['out'].count('/')
        rel = {k: '../' * depth + val for k, val in local.items()}
        html = render(p, partials, rel, v)
        dest = os.path.join(ROOT, p['out'])
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        with open(dest, 'w', encoding='utf-8') as f:
            f.write(html)
    print(f'{len(pages)} pages built (v={v})')


if __name__ == '__main__':
    main()
