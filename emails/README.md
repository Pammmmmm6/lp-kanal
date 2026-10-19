# Kanal email templates

Emails built on the site's design system (Geist, neutral palette, pills, painted panels, sentence case),
in the markup email clients need: tables, inline styles, 600 px wide, light and dark mode.

Preview: `emails/index.html` (on the mockup site: `/emails/`).

| Template | File | Use |
|---|---|---|
| Product launch | `dist/mcp-launch.html` | Kanal MCP announcement (copy from the /mcp page) |
| Product update | `dist/product-update.html` | Monthly "what's new": one card per feature (image, pill, title, text, link) |
| Newsletter | `dist/newsletter.html` | Blog digest: one featured article, three in rows |

## Editing

- Content and components live in `build.py` (one function per template, shared components in `Mail`:
  `pill`, `title`, `h2`, `p`, `image`, `button(s)`, `numbered`, `checks`, `quote_card`, `article`,
  `article_row`, `signoff`). Add a template by writing a function and listing it in `TEMPLATES`.
- Rebuild: `python3 emails/build.py` (images from the mockup site) or
  `python3 emails/build.py --assets https://your-cdn/emails/` once the images are uploaded to your ESP or CDN.
- Painted visuals are screenshots of the site's real components:
  serve the repo (`python3 -m http.server 8650`), then `node emails/render_assets.mjs 8650`
  and `python3 emails/prepare_assets.py` (crop, resize to 1104 px = 552 px at 2x, JPEG).
  Blog covers are converted from the site's WebP (Outlook does not show WebP).

## Merge tags

The templates use neutral tags. Replace them with your ESP's syntax before importing:

| Template tag | Klaviyo | Brevo |
|---|---|---|
| `{{first_name}}` | `{{ first_name\|default:'there' }}` | `{{ contact.FIRSTNAME \| default:'there' }}` |
| `{{unsubscribe_url}}` | `{% unsubscribe_url %}` | `{{ unsubscribe }}` |
| `{{view_in_browser_url}}` | `{% web_view %}` | `{{ mirror }}` |
| `{{company_address}}` | `{{ organization.full_address }}` | your company address (required by law) |
| `{{month}}`, `{{issue_date}}` | type the value | type the value |

## Rules kept from the site

- Sentence case, no uppercase labels; euros for Kanal prices; no invented claims (copy comes from the site).
- Dark buttons are primary, soft grey secondary; pills everywhere.
- Every link carries `utm_source=email&utm_medium=email&utm_campaign=<template>` so the site's
  first-touch attribution records email traffic.
- Tested at 600 px and 390 px, light and dark (Apple Mail dark mode swaps the logo; Gmail inverts colors itself).
  Send a test to Gmail, Outlook and Apple Mail from your ESP before any campaign.
