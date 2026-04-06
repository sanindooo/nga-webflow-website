/**
 * Nav Toggle — adds/removes "is-nav-open" class on .header.
 * All visibility, colours, and transitions are controlled via CSS in Webflow.
 * JS handles: toggle state, aria attributes, keyboard/link close.
 */

;(function () {
  'use strict'

  const __s = ((window as any).__loadedScripts ??= {});
  if (__s['navToggle']) return; __s['navToggle'] = true;

  const initNavToggle = () => {
    const toggle = document.querySelector<HTMLElement>('[data-nav="open"]');
    const header = document.querySelector<HTMLElement>('.header');
    const menu = document.querySelector<HTMLElement>('[data-nav="menu"]');
    const navLinks = document.querySelectorAll<HTMLAnchorElement>('.nav-custom_menu-link');

    if (!toggle || !header) return;

    // Set initial aria state
    toggle.setAttribute('role', 'button');
    toggle.setAttribute('aria-label', 'Open navigation menu');
    toggle.setAttribute('aria-expanded', 'false');
    if (menu) toggle.setAttribute('aria-controls', menu.id || 'nav-menu');

    const open = () => {
      header.classList.add('is-nav-open');
      toggle.setAttribute('aria-expanded', 'true');
      toggle.setAttribute('aria-label', 'Close navigation menu');
    };

    const close = () => {
      header.classList.remove('is-nav-open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', 'Open navigation menu');
    };

    const isOpen = () => header.classList.contains('is-nav-open');

    toggle.addEventListener('click', () => (isOpen() ? close() : open()));

    // Close on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && isOpen()) close();
    });

    // Close on nav link click
    navLinks.forEach((link) => link.addEventListener('click', close));
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNavToggle);
  } else {
    initNavToggle();
  }
})()
