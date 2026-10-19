#!/usr/bin/env python3
"""Kanal email templates, built from the site's design system.

Emails need their own markup: tables, inline styles, no CSS gradients (the
painted panels are exported as images by render_assets.mjs), web fonts with
system fallbacks. This file holds the shared components and the templates.

Usage: python3 emails/build.py [--assets https://cdn.example.com/emails/]
Output: emails/dist/<template>.html + emails/index.html (preview gallery).

Merge tags are neutral ({{first_name}}, {{unsubscribe_url}}, …); README.md
lists the equivalents for Klaviyo and Brevo.
"""
import argparse
import html
import os

ROOT = os.path.dirname(os.path.abspath(__file__))
SITE = 'https://getkanal.com'

# ---------- Jetons (css/style.css, adaptés au mail : contraste un peu plus fort) ----------
C = {
    'page': '#f4f3f0', 'card': '#ffffff', 'soft': '#f9f8f6', 'fg': '#0a0a0a', 'fg70': '#3d3f43',
    'muted': '#6f737a', 'line': '#ebe9e6', 'pill': '#f2f1ef', 'btn_soft': '#edecea', 'green': '#15803d',
}
FONT = "'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
e = lambda s: html.escape(s, quote=False)
a = lambda s: html.escape(s, quote=True)


def utm(url, campaign):
    sep = '&' if '?' in url else '?'
    return f'{url}{sep}utm_source=email&utm_medium=email&utm_campaign={campaign}'


class Mail:
    """Accumulates rows inside the 600px card; components return HTML strings."""

    def __init__(self, assets, campaign):
        self.assets, self.campaign = assets, campaign

    def img(self, name):
        return self.assets + name

    def link(self, url):
        return utm(url if url.startswith('http') else SITE + url, self.campaign)

    # ---- briques ----
    def row(self, inner, pad='0 32px', cls=''):
        return f'<tr><td class="px {cls}" style="padding:{pad};">{inner}</td></tr>\n'

    def pill(self, text, dot=False):
        d = (f'<span style="display:inline-block;width:6px;height:6px;border-radius:9999px;background:#22c55e;'
             f'vertical-align:middle;margin:0 7px 2px 0;"></span>') if dot else ''
        return (f'<span class="pill" style="display:inline-block;padding:5px 12px;border-radius:9999px;background:{C["pill"]};'
                f'font-family:{FONT};font-size:13px;line-height:18px;font-weight:500;color:{C["fg70"]};">{d}{e(text)}</span>')

    def title(self, main, muted=None, size=32):
        lh = round(size * 1.18)
        sub = f'<br /><span class="muted" style="color:{C["muted"]};">{e(muted)}</span>' if muted else ''
        return (f'<h1 class="fg" style="margin:0;font-family:{FONT};font-size:{size}px;line-height:{lh}px;font-weight:500;'
                f'letter-spacing:-0.6px;color:{C["fg"]};">{e(main)}{sub}</h1>')

    def h2(self, main, muted=None):
        sub = f'<br /><span class="muted" style="color:{C["muted"]};">{e(muted)}</span>' if muted else ''
        return (f'<h2 class="fg" style="margin:0;font-family:{FONT};font-size:22px;line-height:28px;font-weight:500;'
                f'letter-spacing:-0.3px;color:{C["fg"]};">{e(main)}{sub}</h2>')

    def p(self, text, size=16, color=None, raw=False):
        body = text if raw else e(text)
        return (f'<p class="txt" style="margin:0;font-family:{FONT};font-size:{size}px;line-height:{round(size * 1.6)}px;'
                f'color:{color or C["fg70"]};">{body}</p>')

    def image(self, name, alt, href=None, width=552, radius=20):
        tag = (f'<img src="{a(self.img(name))}" width="{width}" alt="{a(alt)}" '
               f'style="display:block;width:100%;max-width:{width}px;height:auto;border:0;border-radius:{radius}px;" />')
        return f'<a href="{a(self.link(href))}" target="_blank">{tag}</a>' if href else tag

    def button(self, text, href, kind='dark'):
        bg, fg = (C['fg'], '#ffffff') if kind == 'dark' else (C['btn_soft'], C['fg'])
        cls = 'btn-dark' if kind == 'dark' else 'btn-soft'
        return (f'<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="display:inline-table;"><tr>'
                f'<td class="{cls}" bgcolor="{bg}" style="border-radius:9999px;background:{bg};">'
                f'<a class="{cls}-a" href="{a(self.link(href))}" target="_blank" style="display:inline-block;padding:12px 22px;'
                f'font-family:{FONT};font-size:15px;line-height:20px;font-weight:500;color:{fg};text-decoration:none;'
                f'border-radius:9999px;">{e(text)}</a></td></tr></table>')

    def buttons(self, *btns):
        cells = ''.join(f'<td style="padding:0 8px 8px 0;">{b}</td>' for b in btns)
        return f'<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>{cells}</tr></table>'

    def text_link(self, text, href):
        return (f'<a class="fg" href="{a(self.link(href))}" target="_blank" style="font-family:{FONT};font-size:15px;'
                f'line-height:22px;font-weight:500;color:{C["fg"]};text-decoration:none;">{e(text)} &rarr;</a>')

    def spacer(self, h):
        return f'<tr><td style="height:{h}px;line-height:{h}px;font-size:0;">&nbsp;</td></tr>\n'

    def numbered(self, items, label=lambda i: f'{i + 1:02d}'):
        """Liste à une seule surface (composant .ulist du site) : pastille, titre, texte, filet entre les lignes."""
        rows = []
        for i, (t, d) in enumerate(items):
            border = f'border-top:1px solid {C["line"]};' if i else ''
            rows.append(
                f'<tr><td class="line" style="{border}padding:18px 22px;">'
                f'<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>'
                f'<td valign="top" width="78" style="padding-top:1px;"><span class="pill-card" style="display:inline-block;padding:3px 10px;'
                f'border-radius:9999px;background:#ffffff;border:1px solid {C["line"]};font-family:{FONT};font-size:12px;line-height:16px;'
                f'font-weight:500;color:{C["fg70"]};white-space:nowrap;">{e(label(i))}</span></td>'
                f'<td valign="top"><p class="fg" style="margin:0;font-family:{FONT};font-size:16px;line-height:22px;font-weight:500;color:{C["fg"]};">{e(t)}</p>'
                f'<p class="txt" style="margin:4px 0 0;font-family:{FONT};font-size:14px;line-height:22px;color:{C["muted"]};">{e(d)}</p></td>'
                f'</tr></table></td></tr>')
        return (f'<table role="presentation" class="soft" width="100%" cellpadding="0" cellspacing="0" border="0" '
                f'style="background:{C["soft"]};border-radius:20px;">{"".join(rows)}</table>')

    def checks(self, items):
        rows = ''.join(
            f'<tr><td valign="top" width="28" style="padding:6px 0;"><span style="display:inline-block;width:18px;height:18px;border-radius:9999px;'
            f'background:{C["fg"]};color:#ffffff;font-family:{FONT};font-size:11px;line-height:18px;text-align:center;">&#10003;</span></td>'
            f'<td class="txt" style="padding:6px 0;font-family:{FONT};font-size:15px;line-height:22px;color:{C["fg70"]};">'
            f'<strong class="fg" style="color:{C["fg"]};font-weight:500;">{e(t)}</strong> {e(d)}</td></tr>' for t, d in items)
        return f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">{rows}</table>'

    def quote_card(self, label, text):
        """Une demande telle qu'un marchand la tape (bulle grise + pastille)."""
        return (f'<table role="presentation" class="soft" width="100%" cellpadding="0" cellspacing="0" border="0" '
                f'style="background:{C["soft"]};border-radius:18px;"><tr><td style="padding:16px 18px;">'
                f'{self.pill(label)}'
                f'<p class="fg" style="margin:10px 0 0;font-family:{FONT};font-size:16px;line-height:24px;color:{C["fg"]};">&ldquo;{e(text)}&rdquo;</p>'
                f'</td></tr></table>')

    def article(self, img, label, title, desc, href):
        return (f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td>'
                f'{self.image(img, title, href, radius=16)}</td></tr>'
                f'<tr><td style="padding-top:16px;">{self.pill(label)}</td></tr>'
                f'<tr><td style="padding-top:12px;"><a class="fg" href="{a(self.link(href))}" target="_blank" style="font-family:{FONT};'
                f'font-size:20px;line-height:27px;font-weight:500;letter-spacing:-0.2px;color:{C["fg"]};text-decoration:none;">{e(title)}</a></td></tr>'
                f'<tr><td style="padding-top:6px;">{self.p(desc, 15, C["muted"])}</td></tr></table>')

    def article_row(self, img, title, desc, href):
        return (f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>'
                f'<td class="stack" valign="top" width="168" style="padding-right:18px;">'
                f'<a href="{a(self.link(href))}" target="_blank"><img src="{a(self.img(img))}" width="168" alt="{a(title)}" '
                f'style="display:block;width:168px;max-width:100%;height:auto;border:0;border-radius:12px;" /></a></td>'
                f'<td class="stack" valign="top"><a class="fg" href="{a(self.link(href))}" target="_blank" style="font-family:{FONT};font-size:16px;'
                f'line-height:22px;font-weight:500;color:{C["fg"]};text-decoration:none;">{e(title)}</a>'
                f'<p class="txt" style="margin:6px 0 0;font-family:{FONT};font-size:14px;line-height:21px;color:{C["muted"]};">{e(desc)}</p></td>'
                f'</tr></table>')

    def signoff(self, text):
        return (f'<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>'
                f'<td valign="middle" width="52"><img src="{a(self.img("nicolas.jpg"))}" width="40" height="40" alt="Nicolas" '
                f'style="display:block;width:40px;height:40px;border-radius:9999px;border:0;" /></td>'
                f'<td valign="middle" style="font-family:{FONT};font-size:15px;line-height:21px;color:{C["fg70"]};" class="txt">'
                f'{e(text)}<br /><span class="fg" style="color:{C["fg"]};font-weight:500;">Nicolas, Kanal</span></td></tr></table>')

    def hr(self):
        return self.row(f'<div class="line" style="border-top:1px solid {C["line"]};font-size:0;line-height:0;">&nbsp;</div>')

    # ---- document ----
    def document(self, subject, preheader, body):
        logo = (f'<a href="{a(self.link("/"))}" target="_blank" style="text-decoration:none;">'
                f'<img class="logo-light" src="{a(self.img("logo.png"))}" width="96" height="26" alt="Kanal" style="display:block;border:0;width:96px;height:26px;" />'
                f'<!--[if !mso]><!--><img class="logo-dark" src="{a(self.img("logo-white.png"))}" width="96" height="26" alt="Kanal" '
                f'style="display:none;max-height:0;overflow:hidden;border:0;width:96px;height:26px;" /><!--<![endif]--></a>')
        footer_links = ' &nbsp;&middot;&nbsp; '.join(
            f'<a href="{a(self.link(u))}" target="_blank" style="color:{C["muted"]};text-decoration:underline;">{t}</a>'
            for t, u in [('Website', '/'), ('Pricing', '/pricing'), ('Book a demo', '/demo'), ('Blog', '/blog')])
        return f'''<!doctype html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="x-apple-disable-message-reformatting" />
<meta name="color-scheme" content="light dark" />
<meta name="supported-color-schemes" content="light dark" />
<title>{e(subject)}</title>
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500&display=swap" rel="stylesheet" />
<style>
  body {{ margin:0; padding:0; width:100% !important; -webkit-text-size-adjust:100%; }}
  img {{ -ms-interpolation-mode:bicubic; }}
  a {{ text-decoration:none; }}
  @media (max-width: 620px) {{
    .card {{ width:100% !important; border-radius:0 !important; }}
    .px {{ padding-left:20px !important; padding-right:20px !important; }}
    .stack {{ display:block !important; width:100% !important; padding:0 0 12px !important; }}
    h1 {{ font-size:28px !important; line-height:33px !important; }}
  }}
  @media (prefers-color-scheme: dark) {{
    .page {{ background:#0a0a0a !important; }}
    .card {{ background:#141414 !important; }}
    .soft {{ background:#1c1c1c !important; }}
    .fg {{ color:#f4f4f2 !important; }}
    .txt {{ color:#b9bcc1 !important; }}
    .muted {{ color:#8b8f95 !important; }}
    .pill, .pill-card {{ background:#252525 !important; color:#d6d7d9 !important; border-color:#2e2e2e !important; }}
    .line {{ border-color:#262626 !important; }}
    .btn-dark {{ background:#f4f4f2 !important; }} .btn-dark-a {{ color:#0a0a0a !important; }}
    .btn-soft {{ background:#252525 !important; }} .btn-soft-a {{ color:#f4f4f2 !important; }}
    .logo-light {{ display:none !important; }}
    .logo-dark {{ display:block !important; max-height:none !important; }}
  }}
</style>
</head>
<body class="page" style="margin:0;padding:0;background:{C['page']};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">{e(preheader)}&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" class="page" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:{C['page']};">
<tr><td align="center" style="padding:32px 0;">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
<table role="presentation" class="card" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;background:{C['card']};border-radius:28px;">
<tr><td class="px" style="padding:28px 32px 0;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
    <td>{logo}</td>
    <td align="right" style="font-family:{FONT};font-size:12px;line-height:16px;"><a href="{{{{view_in_browser_url}}}}" style="color:{C['muted']};text-decoration:underline;">View in browser</a></td>
  </tr></table>
</td></tr>
{self.spacer(36)}{body}{self.spacer(40)}
<tr><td class="px" style="padding:0 32px 32px;">
  <div class="line" style="border-top:1px solid {C['line']};font-size:0;line-height:0;">&nbsp;</div>
  <p style="margin:24px 0 0;font-family:{FONT};font-size:13px;line-height:20px;color:{C['muted']};">{footer_links}</p>
  <p style="margin:12px 0 0;font-family:{FONT};font-size:12px;line-height:19px;color:{C['muted']};">You're receiving this email because you use Kanal or signed up on getkanal.com. Kanal is the WhatsApp, Instagram, SMS and RCS marketing platform for Shopify brands.<br />{{{{company_address}}}} &middot; <a href="{{{{unsubscribe_url}}}}" style="color:{C['muted']};text-decoration:underline;">Unsubscribe</a></p>
</td></tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr>
</table>
</body>
</html>
'''


# =====================================================================
#  Templates
# =====================================================================
def mcp_launch(m):
    """Annonce produit : Kanal MCP (contenu de la page /mcp du site)."""
    b = ''
    b += m.row(m.pill('New · Kanal MCP', dot=True))
    b += m.spacer(18)
    b += m.row(m.title('Run Kanal from your AI assistant.', 'Just ask, in plain language.'))
    b += m.spacer(18)
    b += m.row(m.p('Hi {{first_name}},', raw=True))
    b += m.spacer(12)
    b += m.row(m.p('You can now connect Kanal to Claude, Claude Code, Codex or Cursor. Your assistant measures, prepares '
                   'and builds in your Kanal account: WhatsApp campaigns, segments and automations. And no campaign goes out '
                   'without your confirmation.'))
    b += m.spacer(28)
    b += m.row(m.image('mcp-hero.jpg', 'Claude preparing a win-back campaign in Kanal, waiting for confirmation', '/mcp'))
    b += m.spacer(28)
    b += m.row(m.buttons(m.button('Connect Kanal MCP', '/mcp'), m.button('Book a demo', '/demo', 'soft')))
    b += m.spacer(44)
    b += m.row(m.h2('Ask, and your assistant does it in Kanal.', 'No screen to open.'))
    b += m.spacer(18)
    for label, ask in [('Measure', 'How is my abandoned-cart automation performing this month?'),
                       ('Create a segment', 'Create a segment of customers who ordered at least twice, but not in the last 60 days.'),
                       ('Prepare a send', 'Then prepare a win-back campaign for Thursday at 10 am.')]:
        b += m.row(m.quote_card(label, ask))
        b += m.spacer(10)
    b += m.spacer(34)
    b += m.row(m.h2('From request to action in three steps.', 'Set it up once, then just ask.'))
    b += m.spacer(18)
    b += m.row(m.numbered([
        ('Connect', 'Add the Kanal MCP server to your assistant and link it to your Kanal account.'),
        ('Ask', 'Ask a question or give an instruction in plain language: measure a campaign, create a segment, prepare a send, build an automation.'),
        ('Take action', 'The assistant acts in your Kanal account. For a campaign, it shows you the audience, the date and the estimated cost, then waits for your confirmation.'),
    ], label=lambda i: f'Step {i + 1}'))
    b += m.spacer(44)
    b += m.row(m.h2('You stay in control.', 'Your assistant acts, you decide.'))
    b += m.spacer(14)
    b += m.row(m.checks([
        ('A send takes two steps.', 'Nothing goes out before your explicit confirmation.'),
        ('Templates go through Meta.', 'Customers only receive them once approved.'),
        ('Automations are switched on in Kanal.', 'You review the flow and activate it yourself.'),
        ('Analysis only, if you prefer.', 'It reads your data without creating or sending anything.'),
    ]))
    b += m.spacer(28)
    b += m.row(m.p(f'Kanal MCP is included from the Scale plan, as well as on Business and Agency. '
                   f'<a class="fg" href="{a(m.link("/pricing"))}" target="_blank" style="color:{C["fg"]};font-weight:500;text-decoration:underline;">See plans</a>',
                   15, C['muted'], raw=True))
    b += m.spacer(32)
    b += m.hr()
    b += m.spacer(24)
    b += m.row(m.signoff('Reply to this email if you want us to connect it with you.'))
    return ('Run Kanal from Claude, Codex or Cursor',
            'Your assistant prepares campaigns, segments and automations in Kanal. Nothing goes out without your confirmation.', b)


def product_update(m):
    """Nouveautés produit : une carte par nouveauté (image peinte, pastille, titre, texte, lien)."""
    items = [
        ('update-rcs.jpg', 'RCS', 'Rich messages, signed with your brand',
         'Product cards, carousels and buttons in the phone’s own messaging app, under your verified brand name. Kanal brings RCS to Shopify stores, alongside WhatsApp.', '/rcs'),
        ('update-sms.jpg', 'SMS campaigns', 'Write and send SMS campaigns in minutes',
         'Pick a customer segment, write your message with a live character counter, send now or schedule. Orders are attributed to each campaign.', '/sms-campaigns'),
        ('update-instagram.jpg', 'Instagram', 'Turn Instagram conversations into orders',
         'Comment to DM, auto-replies and AI answers, powered by the same engine as Kanal on WhatsApp. Early access is open for Shopify brands.', '/instagram'),
        ('update-klaviyo.jpg', 'Integration', 'Supercharge Klaviyo with WhatsApp',
         'Sync your Klaviyo segments and trigger WhatsApp messages from your existing flows, with revenue tracked next to email and SMS.', '/whatsapp-integration/klaviyo'),
    ]
    b = m.row(m.pill('Product update · {{month}}'))
    b += m.spacer(18)
    b += m.row(m.title('What’s new in Kanal.', 'Four things you can use today.'))
    b += m.spacer(18)
    b += m.row(m.p('Hi {{first_name}}, here is what shipped recently, and where to find it in your account.', raw=True))
    b += m.spacer(36)
    for i, (img, label, title, text, href) in enumerate(items):
        if i:
            b += m.spacer(36)
            b += m.hr()
            b += m.spacer(36)
        b += m.row(m.image(img, title, href))
        b += m.spacer(20)
        b += m.row(m.pill(label))
        b += m.spacer(12)
        b += m.row(m.h2(title))
        b += m.spacer(10)
        b += m.row(m.p(text))
        b += m.spacer(16)
        b += m.row(m.text_link('Learn more', href))
    b += m.spacer(44)
    b += m.row(f'<table role="presentation" class="soft" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:{C["soft"]};border-radius:20px;">'
               f'<tr><td style="padding:24px 24px 18px;">{m.h2("Want a walkthrough?", "15 minutes, on your own store.")}'
               f'<div style="height:16px;line-height:16px;font-size:0;">&nbsp;</div>{m.buttons(m.button("Book a demo", "/demo"))}</td></tr></table>')
    b += m.spacer(32)
    b += m.row(m.signoff('Questions or ideas? Just reply, it comes straight to us.'))
    return ('What’s new in Kanal: RCS, SMS campaigns, Instagram and Klaviyo',
            'RCS rich messages, SMS campaigns in minutes, Instagram early access and WhatsApp in your Klaviyo flows.', b)


def newsletter(m):
    """Lettre d'information : un article à la une, puis trois articles en ligne."""
    b = m.row(m.pill('The Kanal letter · {{issue_date}}'))
    b += m.spacer(18)
    b += m.row(m.title('WhatsApp marketing insights.', 'E-commerce resources, every month.'))
    b += m.spacer(18)
    b += m.row(m.p('Hi {{first_name}}, here are this month’s guides for Shopify brands selling on WhatsApp and Instagram.', raw=True))
    b += m.spacer(32)
    b += m.row(m.article('blog-instagram-integration.jpg', 'Instagram · 12 min read', 'Shopify Instagram Integration: Connect Your Store (2026)',
                         'How to connect Shopify to Instagram with the Facebook & Instagram sales channel: requirements, steps, catalog sync, common errors and product tags.',
                         '/blog/shopify-instagram-integration'))
    b += m.spacer(40)
    b += m.row(m.h2('More from the blog'))
    b += m.spacer(20)
    rows = [
        ('blog-manychat.jpg', 'ManyChat for Instagram: How It Works, Setup and Rules',
         'Connecting a professional account, the comment, story reply and DM keyword triggers, and the Meta rules that apply.', '/blog/manychat-instagram'),
        ('blog-abandoned-cart.jpg', 'Abandoned Cart Email: 12 Examples That Convert (2026)',
         '12 examples with full copy, subject line patterns, the 1h/24h/72h sequence and how to pair it with WhatsApp.', '/blog/abandoned-cart-email-examples-2026'),
        ('blog-black-friday.jpg', 'Black Friday WhatsApp Marketing: 6-Step Shopify Playbook',
         'Pre-BF list building, broadcast timing, cart recovery, templates and KPIs for 2026.', '/blog/black-friday-whatsapp-playbook'),
    ]
    for i, r in enumerate(rows):
        if i:
            b += m.spacer(20)
        b += m.row(m.article_row(*r))
    b += m.spacer(36)
    b += m.row(m.buttons(m.button('Read the blog', '/blog'), m.button('Free tools', '/tools', 'soft')))
    b += m.spacer(32)
    b += m.hr()
    b += m.spacer(24)
    b += m.row(m.signoff('A topic you want us to cover? Reply and tell us.'))
    return ('This month: Instagram for Shopify, ManyChat, cart emails and Black Friday',
            'Four guides for Shopify brands selling on WhatsApp and Instagram.', b)


TEMPLATES = [
    ('mcp-launch', 'Product launch', 'Kanal MCP announcement', mcp_launch),
    ('product-update', 'Product update', 'Monthly what’s new', product_update),
    ('newsletter', 'Newsletter', 'Blog digest', newsletter),
]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--assets', default='https://pammmmmm6.github.io/lp-kanal/emails/assets/')
    args = ap.parse_args()
    os.makedirs(os.path.join(ROOT, 'dist'), exist_ok=True)
    cards = []
    for slug, kind, name, fn in TEMPLATES:
        m = Mail(args.assets, slug)
        subject, preheader, body = fn(m)
        with open(os.path.join(ROOT, 'dist', f'{slug}.html'), 'w', encoding='utf-8') as f:
            f.write(m.document(subject, preheader, body))
        cards.append((slug, kind, name, subject, preheader))
        print('emails/dist/%s.html' % slug)
    # galerie d'aperçu (servie par GitHub Pages avec la maquette)
    items = ''.join(
        f'<article class="it"><div class="meta"><span class="k">{e(k)}</span><h2>{e(n)}</h2>'
        f'<p><b>Subject</b> {e(s)}</p><p><b>Preheader</b> {e(p)}</p><a href="dist/{sl}.html" target="_blank">Open the email &rarr;</a></div>'
        f'<iframe src="dist/{sl}.html" title="{a(n)}" loading="lazy"></iframe></article>' for sl, k, n, s, p in cards)
    with open(os.path.join(ROOT, 'index.html'), 'w', encoding='utf-8') as f:
        f.write(f'''<!doctype html><html lang="en"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Kanal email templates</title><link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500&display=swap" rel="stylesheet" />
<style>
:root {{ --bg:#fff; --fg:#0a0a0a; --muted:#7d8187; --card:#f9f8f6; --line:rgba(0,0,0,.1); }}
@media (prefers-color-scheme: dark) {{ :root {{ --bg:#0a0a0a; --fg:#f4f4f2; --muted:#8b8f95; --card:#141414; --line:rgba(255,255,255,.12); }} }}
body {{ margin:0; background:var(--bg); color:var(--fg); font-family:Geist, system-ui, sans-serif; }}
main {{ max-width:1080px; margin:0 auto; padding:56px 24px; }}
h1 {{ margin:0; font-size:44px; line-height:50px; font-weight:500; letter-spacing:-1px; }} h1 span {{ display:block; color:var(--muted); }}
.lead {{ margin:16px 0 40px; max-width:620px; font-size:17px; line-height:28px; color:var(--muted); }}
.it {{ display:grid; grid-template-columns:minmax(0,1fr) 640px; gap:32px; margin-bottom:16px; padding:8px 8px 8px 32px; border-radius:28px; background:var(--card); }}
.meta {{ padding:24px 0; }} .k {{ display:inline-block; padding:4px 12px; border-radius:9999px; box-shadow:inset 0 0 0 1px var(--line); font-size:13px; }}
.meta h2 {{ margin:16px 0 12px; font-size:28px; line-height:34px; font-weight:500; letter-spacing:-.4px; }}
.meta p {{ margin:8px 0 0; font-size:14px; line-height:22px; color:var(--muted); }} .meta b {{ color:var(--fg); font-weight:500; }}
.meta a {{ display:inline-block; margin-top:20px; padding:10px 18px; border-radius:9999px; background:var(--fg); color:var(--bg); font-size:14px; text-decoration:none; }}
iframe {{ width:100%; height:820px; border:0; border-radius:20px; background:#f4f3f0; }}
@media (max-width:1000px) {{ .it {{ grid-template-columns:minmax(0,1fr); padding:8px; }} .meta {{ padding:20px 16px 8px; }} h1 {{ font-size:34px; line-height:40px; }} }}
</style></head><body><main>
<h1>Kanal email templates.<span>Built on the site’s design system.</span></h1>
<p class="lead">Table-based HTML with inline styles, light and dark, 600 px wide. Painted panels are images exported from the site’s components. Merge tags like {{{{first_name}}}} are listed in emails/README.md.</p>
{items}
</main></body></html>''')
    print('emails/index.html')


if __name__ == '__main__':
    main()
