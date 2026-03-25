/**
 * Nav Toggle — opens/closes the custom fullscreen navigation menu.
 * Uses data-nav attributes for element selection.
 *   data-nav="open"  → hamburger button
 *   data-nav="close" → close button inside overlay
 *   data-nav="menu"  → the fullscreen overlay
 */

const FADE_DURATION = 300; // ms

function initNavToggle(): void {
  const openBtn = document.querySelector<HTMLElement>('[data-nav="open"]');
  const closeBtn = document.querySelector<HTMLElement>('[data-nav="close"]');
  const menu = document.querySelector<HTMLElement>('[data-nav="menu"]');

  if (!openBtn || !closeBtn || !menu) return;

  function openMenu(): void {
    if (!menu) return;
    menu.style.display = 'flex';
    menu.style.opacity = '0';
    requestAnimationFrame(() => {
      menu.style.transition = `opacity ${FADE_DURATION}ms ease`;
      menu.style.opacity = '1';
    });
    document.body.style.overflow = 'hidden';
  }

  function closeMenu(): void {
    if (!menu) return;
    menu.style.transition = `opacity ${FADE_DURATION}ms ease`;
    menu.style.opacity = '0';
    setTimeout(() => {
      menu.style.display = 'none';
      menu.style.transition = '';
    }, FADE_DURATION);
    document.body.style.overflow = '';
  }

  openBtn.addEventListener('click', openMenu);
  closeBtn.addEventListener('click', closeMenu);

  // Close on Escape key
  document.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Escape' && menu.style.display === 'flex') {
      closeMenu();
    }
  });

  // Close when clicking a nav link
  menu.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      closeMenu();
    });
  });
}

// Run on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initNavToggle);
} else {
  initNavToggle();
}
