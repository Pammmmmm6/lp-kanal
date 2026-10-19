# Kanal mockup — design system and page conventions

Reference pages: `index.html` (home) and `pricing.html` are the gold standard. Every new
page must look like it belongs next to them.

## Build

- Never edit generated `*.html` at the repo root by hand. Pages are assembled by
  `python3 build/build.py` from `src/partials/` (head, nav, footer) plus either
  `src/pages/*.html` (hand-written) or a generator `build/gen_*.py` that returns
  page dicts: `{'out', 'title', 'description', 'styles', 'scripts', 'current', 'extra', 'main'}`.
- Content comes from the live site repo (`/home/user/getkanal.com`, English): `messages/en.json`,
  `content/**.md`, `src/lib/*.ts`. Keep the copy faithful; don't invent claims or numbers.
- Links: write live URLs `https://getkanal.com/<path>`; the build rewrites them to local pages
  when one exists (internal links lose `target="_blank"`). Sub-folder pages (`blog/x.html`) get
  `../` prefixed automatically for relative `href`/`src`.
- Each page type gets its own stylesheet `css/<type>.css`, loaded after `css/pages.css`.
- Asset paths are relative (`assets/...`). Copy only the images a page needs.

## Tokens (css/style.css `:root`, dark mode under `[data-theme="dark"]`)

`--bg --fg --fg-70 --fg-60 --fg-40 --muted --card (#f9f8f6) --surface (#fff) --line --line-2
--tint --tint-2 --btn-dark --btn-soft --btn-light --ink --teal --ease`. Never hard-code greys;
always use tokens so dark mode works. Font: Geist (already loaded).

## Rhythm and containers

- Sections: `<section class="sec">` (vertical padding `var(--sec-y)`: 56px desktop, 36px mobile).
  First section after the hero uses `padding-top: 0` when it continues the hero.
- Containers: `.wrap` (1280, 24px gutters), inner content max-width **1080px** centered.
  FAQ uses `.wrap.wrap--narrow.cols.cols--top` (title left, accordion right).

## Components (reuse, don't reinvent)

- Hero: `.ah` > `.ah__eyebrow` (pill label), `.ah__title` (64px) or `.fh__title` (56px, long
  sentences), `.ah__sub`, `.ah__ctas` with `.btn.btn--dark.btn--lg` + `.btn.btn--soft.btn--lg`.
- Section heading: `.shead` with `.shead__title` (28px; second line in `<span class="muted">`)
  and `.shead__intro` (paragraph + optional `.btn.btn--light.btn--nav`).
- Split card: `.duo` (+ `.duo--rev`), `.duo__text`, `.duo__media.feature__visual.feature__visual--b|c|d`
  (painted gradient panel inset 8px, holding a white mini-UI card).
- Cards: `background: var(--card); border-radius: 24px; padding: 28–40px`. Grids gap 16px.
- Painted panels: `.feature__visual` + `--b` (blue/pink), `--c` (green/orange), `--d` (pink/peach).
  Put white UI cards on them (radius 18–20px, soft shadow), never plain text.
- Pills only: every badge, chip, tag and button is fully rounded (`border-radius: 9999px`).
  Outline pills: `box-shadow: inset 0 0 0 1px var(--line-2)`.
- FAQ: `<div class="faq reveal"><details open><summary>Q<span class="faq__icon"></span></summary>
  <div class="faq__body"><p>A</p></div></details>…` (main.js animates it).
- Logos strip: copy the `<div class="logos reveal">…` block from `src/pages/case-studies.html`.
- Reveal on scroll: add `reveal` (and `reveal--up` for cards), stagger with `style="--d:1"`.

## Rules the client gave us (don't break them)

- No uppercase labels (sentence case everywhere), no ALL CAPS eyebrows.
- No final "Ready to launch / Book a demo" CTA band at the bottom of pages.
- No decorative stat badges floating over images.
- Buttons: dark = primary, soft/light grey = secondary, outline = tertiary. 44px (`btn--lg`)
  in content, 40px (`btn--nav`) in compact spots.
- Currency in euros for Kanal prices; quotes from customers stay verbatim.
- Everything must work in light and dark mode, and at 390px wide with no horizontal scroll.

## Verifying

Serve the repo (`python3 -m http.server 8765`) and screenshot with Playwright
(`/opt/node22/lib/node_modules/playwright/index.mjs`, Chromium at
`/opt/pw-browsers/chromium-1194/chrome-linux/chrome`) at 1440 and 390, light and dark.
Check the console has no errors and `document.documentElement.scrollWidth - innerWidth === 0`.
