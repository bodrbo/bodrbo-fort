(() => {
  const header = document.querySelector('[data-header]');
  const menuButton = document.querySelector('.menu-toggle');
  const mobileMenu = document.querySelector('#mobile-menu');
  const reviews = [...document.querySelectorAll('.review')];
  const reviewCount = document.querySelector('[data-review-count]');
  const reviewControls = document.querySelector('.review-controls');
  let activeReview = 0;

  const updateHeader = () => header?.classList.toggle('is-scrolled', window.scrollY > 80);
  const setMenu = open => {
    if (!menuButton || !mobileMenu) return;
    menuButton.setAttribute('aria-expanded', String(open));
    mobileMenu.setAttribute('aria-hidden', String(!open));
    mobileMenu.classList.toggle('is-open', open);
    document.body.classList.toggle('menu-open', open);
  };
  const showReview = index => {
    if (!reviews.length) return;
    activeReview = (index + reviews.length) % reviews.length;
    reviews.forEach((review, current) => review.classList.toggle('is-active', current === activeReview));
    if (reviewCount) reviewCount.textContent = `${activeReview + 1} / ${reviews.length}`;
  };

  updateHeader();
  window.addEventListener('scroll', updateHeader, { passive: true });
  menuButton?.addEventListener('click', () => setMenu(menuButton.getAttribute('aria-expanded') !== 'true'));
  mobileMenu?.querySelectorAll('a').forEach(link => link.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') setMenu(false);
  });

  document.querySelector('[data-scroll-map]')?.addEventListener('click', () => {
    document.querySelector('#route-map')?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
  });
  document.querySelector('[data-review-prev]')?.addEventListener('click', () => showReview(activeReview - 1));
  document.querySelector('[data-review-next]')?.addEventListener('click', () => showReview(activeReview + 1));
  reviewControls?.classList.toggle('is-hidden', reviews.length < 2);
  showReview(0);
})();
