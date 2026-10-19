/* Glossaire : filtre des termes côté client et lettres A–Z */
(() => {
  'use strict';
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  const input = $('[data-gl-search]');
  if (!input) return;
  const groups = $$('.gl-group');
  const letters = $$('a.gl-az__l');
  const count = $('[data-gl-count]');
  const empty = $('[data-gl-empty]');
  const query = $('[data-gl-query]');
  const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

  const apply = () => {
    const q = norm(input.value);
    let total = 0;
    groups.forEach((g) => {
      let n = 0;
      $$('.gl-term', g).forEach((t) => {
        const hit = !q || norm(t.dataset.q).includes(q);
        t.hidden = !hit;
        if (hit) n += 1;
      });
      g.hidden = n === 0;
      // les groupes déjà révélés restent visibles quand ils réapparaissent
      if (n && q) g.classList.add('is-visible');
      total += n;
      const pill = letters.find((l) => l.dataset.letter === g.dataset.letter);
      if (pill) pill.classList.toggle('is-off', n === 0);
    });
    count.textContent = total;
    empty.hidden = total > 0;
    query.textContent = `“${input.value.trim()}”`;
  };

  input.addEventListener('input', apply);
  input.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') { input.value = ''; apply(); } });
  $('[data-gl-clear]')?.addEventListener('click', () => { input.value = ''; apply(); input.focus(); });

  letters.forEach((l) => l.addEventListener('click', (ev) => {
    if (l.classList.contains('is-off')) ev.preventDefault();
  }));

  // Lettre courante surlignée pendant le défilement
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      letters.forEach((l) => l.classList.toggle('is-on', l.dataset.letter === en.target.dataset.letter));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  groups.forEach((g) => io.observe(g));
})();
