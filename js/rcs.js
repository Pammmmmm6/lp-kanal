/* Page RCS : défilement automatique des carrousels de cartes produits
   (pause au survol / au toucher, et quand le carrousel sort de l'écran). */
(() => {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.querySelectorAll('[data-rcar]').forEach((car) => {
    const track = car.querySelector('.rcar__track');
    const items = [...track.children];
    const dots = [...car.querySelectorAll('.rcar__dots i')];
    let i = 0, visible = false, held = false;

    const mark = () => dots.forEach((d, k) => d.classList.toggle('is-on', k === i));
    track.addEventListener('scroll', () => {
      const k = Math.round(track.scrollLeft / (items[0].offsetWidth + 8));
      if (k !== i) { i = Math.min(k, items.length - 1); mark(); }
    }, { passive: true });

    if (reduced) return;
    const hold = (on) => () => { held = on; };
    car.addEventListener('pointerenter', hold(true));
    car.addEventListener('pointerleave', hold(false));
    car.addEventListener('touchstart', hold(true), { passive: true });
    new IntersectionObserver(([en]) => { visible = en.isIntersecting; }, { threshold: 0.5 }).observe(car);

    setInterval(() => {
      if (!visible || held || document.hidden) return;
      i = (i + 1) % items.length;
      track.scrollTo({ left: items[i].offsetLeft - items[0].offsetLeft, behavior: 'smooth' });
      mark();
    }, 2600);
  });
})();
