(() => {
  const root = document.documentElement;
  const elements = [...document.querySelectorAll('[data-reveal]')];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  if (!elements.length || reducedMotion.matches || !('IntersectionObserver' in window)) return;

  let observer;

  const reveal = element => {
    if (!element || element.classList.contains('is-visible')) return;
    element.classList.add('is-visible');
    observer?.unobserve(element);
  };

  const revealTarget = hash => {
    if (!hash || hash === '#') return;

    try {
      const target = document.querySelector(hash);
      if (!target) return;

      const units = new Set(target.querySelectorAll('[data-reveal]'));
      const enclosingUnit = target.closest('[data-reveal]');
      if (enclosingUnit) units.add(enclosingUnit);
      units.forEach(reveal);
    } catch {
      // Invalid fragments should not affect content visibility.
    }
  };

  try {
    const animateHero = window.scrollY < 2 && (!location.hash || location.hash === '#top');
    const heroElements = elements.filter(element => element.dataset.reveal.startsWith('hero'));

    elements.forEach(element => {
      const isHeroElement = element.dataset.reveal.startsWith('hero');

      if (isHeroElement) {
        if (!animateHero) element.classList.add('is-visible');
        return;
      }

      const bounds = element.getBoundingClientRect();
      if (bounds.top < window.innerHeight && bounds.bottom > 0) element.classList.add('is-visible');
    });

    revealTarget(location.hash);

    observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) reveal(entry.target);
      });
    }, {
      threshold: 0,
      rootMargin: window.matchMedia('(max-width: 720px)').matches
        ? '0px 0px -8% 0px'
        : '0px 0px -12% 0px'
    });

    elements.forEach(element => {
      const waitsForHeroEntrance = animateHero && element.dataset.reveal.startsWith('hero');
      if (!element.classList.contains('is-visible') && !waitsForHeroEntrance) observer.observe(element);
    });

    document.addEventListener('click', event => {
      const link = event.target.closest('a[href^="#"]');
      if (link) revealTarget(link.getAttribute('href'));
    });

    document.addEventListener('focusin', event => reveal(event.target.closest('[data-reveal]')));
    window.addEventListener('hashchange', () => revealTarget(location.hash));

    root.classList.add('motion-enabled', 'motion-preparing');

    requestAnimationFrame(() => requestAnimationFrame(() => {
      root.classList.remove('motion-preparing');
      if (animateHero) heroElements.forEach(reveal);
    }));

    reducedMotion.addEventListener?.('change', event => {
      if (!event.matches) return;
      elements.forEach(reveal);
      root.classList.remove('motion-enabled', 'motion-preparing');
      observer?.disconnect();
    });
  } catch {
    root.classList.remove('motion-enabled', 'motion-preparing');
    elements.forEach(element => element.classList.add('is-visible'));
    observer?.disconnect();
  }
})();
