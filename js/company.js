/* =========================================================
   Pages société : formulaires (validation côté client, état envoyé, sans serveur),
   annuaire des partenaires (filtres), sommaire des pages légales
   ========================================================= */
(() => {
  'use strict';
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  /* ---------------- Formulaires ---------------- */
  const validEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
  const validStore = (v) => /^(https?:\/\/)?[^\s.]+\.[^\s]{2,}$/.test(v);
  const validUrl = (v) => { try { const u = new URL(/^https?:\/\//.test(v) ? v : 'https://' + v); return u.hostname.includes('.'); } catch (e) { return false; } };

  $$('form[data-form]').forEach((form) => {
    const submit = $('.dform__submit', form);
    const label = submit.firstChild.textContent;

    // pastilles à choix unique (un second clic désélectionne)
    $$('[data-radio]', form).forEach((group) => {
      const hidden = $('input[type="hidden"]', group), hint = $('[data-hint-for]', group);
      const chips = $$('[role="radio"]', group);
      chips.forEach((chip) => chip.addEventListener('click', () => {
        const on = chip.getAttribute('aria-checked') !== 'true';
        chips.forEach((c) => c.setAttribute('aria-checked', String(on && c === chip)));
        hidden.value = on ? chip.dataset.v : '';
        group.classList.remove('is-invalid');
        if (hint) hint.hidden = !hint.dataset.hintFor.split(' ').includes(hidden.value);
      }));
    });

    const fieldOk = (el) => {
      const v = el.type === 'checkbox' ? el.checked : el.value.trim();
      if (el.type === 'checkbox') return !el.required || v;
      if (!v) return !el.required;
      if (el.type === 'email') return validEmail(v);
      if (el.type === 'url') return validUrl(v);
      if ('store' in el.dataset) return validStore(v);
      if (el.minLength > 0) return v.length >= el.minLength;
      return true;
    };

    form.addEventListener('input', (e) => e.target.closest('.dform__field')?.classList.remove('is-invalid'));
    form.addEventListener('change', (e) => e.target.closest('.dform__field')?.classList.remove('is-invalid'));

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (form.classList.contains('is-sending')) return;
      let first = null;
      $$('input:not([type="hidden"]):not(.hp), textarea', form).forEach((el) => {
        const ok = fieldOk(el);
        el.closest('.dform__field')?.classList.toggle('is-invalid', !ok);
        if (!ok && !first) first = el;
      });
      $$('[data-radio][data-required]', form).forEach((group) => {
        const ok = !!$('input[type="hidden"]', group).value;
        group.classList.toggle('is-invalid', !ok);
        if (!ok && !first) first = $('[role="radio"]', group);
      });
      if (first) { first.focus(); return; }
      if ($('.hp', form).value) return; // robot

      // maquette : pas de serveur, on simule l'envoi
      form.classList.add('is-sending');
      submit.firstChild.textContent = submit.dataset.sending || label;
      setTimeout(() => {
        form.classList.remove('is-sending');
        submit.firstChild.textContent = label;
        form.reset();
        $$('[role="radio"]', form).forEach((c) => c.setAttribute('aria-checked', 'false'));
        $$('[data-hint-for]', form).forEach((h) => { h.hidden = true; });
        form.classList.add('is-done');
        $('.dform__done', form).setAttribute('tabindex', '-1');
        $('.dform__done', form).focus({ preventScroll: true });
      }, 900);
    });
  });

  /* ---------------- Annuaire des partenaires ---------------- */
  const dir = $('[data-partners]');
  if (dir) {
    const cards = $$('.pcard', dir), search = $('[data-search]', dir);
    const catBtns = $$('[data-cat]', $('.pfilters', dir)), specBtns = $$('[data-spec]', dir);
    const summary = $('[data-summary]', dir), count = $('[data-count]', dir), empty = $('[data-empty]', dir);
    let cat = 'all';
    const specs = new Set();
    const apply = () => {
      const q = search.value.trim().toLowerCase();
      let n = 0;
      cards.forEach((c) => {
        const own = c.dataset.specs.split(' ');
        const show = (cat === 'all' || c.dataset.cat === cat)
          && (!specs.size || [...specs].some((s) => own.includes(s)))
          && (!q || c.dataset.text.includes(q));
        c.hidden = !show;
        if (show) n++;
      });
      count.textContent = n;
      summary.hidden = !(cat !== 'all' || specs.size || q);
      empty.hidden = n > 0;
    };
    catBtns.forEach((b) => b.addEventListener('click', () => {
      cat = b.dataset.cat;
      catBtns.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      apply();
    }));
    specBtns.forEach((b) => b.addEventListener('click', () => {
      const s = b.dataset.spec, on = !specs.has(s);
      on ? specs.add(s) : specs.delete(s);
      b.setAttribute('aria-pressed', String(on));
      apply();
    }));
    search.addEventListener('input', apply);
    $$('[data-clear]', dir).forEach((b) => b.addEventListener('click', () => {
      cat = 'all'; specs.clear(); search.value = '';
      catBtns.forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.cat === 'all')));
      specBtns.forEach((x) => x.setAttribute('aria-pressed', 'false'));
      apply();
    }));
  }

  /* ---------------- Sommaire des pages légales ---------------- */
  const toc = $('.toc');
  if (toc) {
    const mq = matchMedia('(max-width: 1000px)');
    const sync = () => { toc.open = !mq.matches; };
    sync();
    mq.addEventListener('change', sync);
    $('summary', toc).addEventListener('click', (e) => { if (!mq.matches) e.preventDefault(); });
    $$('a', toc).forEach((a) => a.addEventListener('click', () => { if (mq.matches) toc.open = false; }));

    const links = new Map($$('a', toc).map((a) => [a.getAttribute('href').slice(1), a]));
    const heads = [...links.keys()].map((id) => document.getElementById(id)).filter(Boolean);
    const mark = () => {
      let cur = heads[0];
      for (const h of heads) { if (h.getBoundingClientRect().top < 140) cur = h; else break; }
      links.forEach((a, id) => a.classList.toggle('is-active', cur && id === cur.id));
    };
    let raf = 0;
    window.addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; mark(); }); }, { passive: true });
    mark();
  }
})();
