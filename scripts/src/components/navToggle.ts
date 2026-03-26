/**
 * Nav Toggle — adds/removes "is-nav-open" class on click.
 * All visibility, colours, and transitions are controlled via CSS in Webflow.
 */

const initNavToggle = () => {
  const toggle = document.querySelector('[data-nav="open"]');
  const header = document.querySelector('.header');

  if (!toggle || !header) return;

  toggle.addEventListener('click', () => {
    header.classList.toggle('is-nav-open');
  });
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initNavToggle);
} else {
  initNavToggle();
}
