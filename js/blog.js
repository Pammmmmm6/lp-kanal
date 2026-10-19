/* Blog : filtre par étiquette (#tag-<clé>) et « Load more articles » (12 par page, comme BlogList.tsx).
   Sans JavaScript, tous les articles restent affichés. */
(() => {
  const grid = document.querySelector('[data-blog-grid]');
  if (!grid) return;
  const per = Number(grid.dataset.perPage) || 12;
  const cards = Array.from(grid.querySelectorAll('.bcard'));
  const pills = Array.from(document.querySelectorAll('[data-blog-filter] [data-tag]'));
  const featured = document.querySelector('[data-blog-featured]');
  const count = document.querySelector('[data-blog-count]');
  const load = document.querySelector('[data-blog-load]');
  const done = document.querySelector('[data-blog-done]');
  const known = new Set(pills.map((p) => p.dataset.tag));
  let tag = '';
  let page = 1;

  const render = () => {
    const matches = cards.filter((c) => (tag ? c.dataset.tags.split(' ').includes(tag) : !c.hasAttribute('data-featured')));
    const limit = page * per;
    cards.forEach((c) => { c.hidden = true; });
    matches.forEach((c, i) => {
      if (i < limit) { c.hidden = false; c.style.setProperty('--d', i % 3); }
    });
    if (featured) featured.hidden = Boolean(tag);
    const extra = tag || !featured ? 0 : 1;
    const shown = Math.min(limit, matches.length);
    if (count) count.textContent = count.dataset.template.replace('{shown}', shown + extra).replace('{total}', matches.length + extra);
    const more = shown < matches.length;
    if (load) load.hidden = !more;
    if (done) done.hidden = more || matches.length <= per;
    pills.forEach((p) => p.setAttribute('aria-pressed', String(p.dataset.tag === tag)));
  };

  const fromHash = () => {
    const m = location.hash.match(/^#tag-([a-z0-9-]+)$/);
    tag = m && known.has(m[1]) ? m[1] : '';
    page = 1;
    render();
  };

  pills.forEach((p) => p.addEventListener('click', () => {
    tag = p.dataset.tag;
    page = 1;
    try { history.replaceState(null, '', tag ? '#tag-' + tag : location.pathname + location.search); } catch (e) {}
    render();
  }));
  if (load) load.addEventListener('click', () => { page += 1; render(); });
  window.addEventListener('hashchange', fromHash);
  fromHash();
})();
