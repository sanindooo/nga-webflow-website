/**
 * Nav Toggle — adds/removes "is-nav-open" class on .header.
 * Open: fades in nav items. Close: .nav-custom_list slides from left and
 * .nav-custom_list.u-social-links slides from right, meeting at center, then closes.
 * Requires GSAP to be available globally.
 */

(function () {
  "use strict";

  const __s = ((window as any).__loadedScripts ??= {});
  if (__s["navToggle"]) return;
  __s["navToggle"] = true;

  const initNavToggle = () => {
    const toggle = document.querySelector<HTMLElement>('[data-nav="open"]');
    const header = document.querySelector<HTMLElement>(".header");
    const menu = document.querySelector<HTMLElement>('[data-nav="menu"]');
    const navLinks = document.querySelectorAll<HTMLAnchorElement>(
      ".nav-custom_menu-link",
    );
    const navList = document.querySelector<HTMLElement>(
      ".nav-custom_list:not(.u-social-links)",
    );
    const socialList = document.querySelector<HTMLElement>(
      ".nav-custom_list.u-social-links",
    );

    if (!toggle || !header) return;

    // Set initial aria state
    toggle.setAttribute("role", "button");
    toggle.setAttribute("aria-label", "Open navigation menu");
    toggle.setAttribute("aria-expanded", "false");
    if (menu) toggle.setAttribute("aria-controls", menu.id || "nav-menu");

    let isAnimating = false;

    const open = () => {
      // Reset any close-animation transforms first
      if (navList) gsap.set(navList, { x: 0 });
      if (socialList) gsap.set(socialList, { x: 0 });

      header.classList.add("is-nav-open");
      gsap.to(header, {
        backgroundColor: "#d2c8b9d9",
        backdropFilter: "blur(20px)",
        duration: 0.35,
        ease: "power2.out",
      });
      toggle.setAttribute("aria-expanded", "true");
      toggle.setAttribute("aria-label", "Close navigation menu");

      // Fade in all direct children of both lists
      const items = [
        ...(navList ? Array.from(navList.children) : []),
        ...(socialList ? Array.from(socialList.children) : []),
      ];

      if (items.length) {
        gsap.fromTo(
          items,
          { opacity: 0, y: 8 },
          {
            opacity: 1,
            y: 0,
            duration: 0.35,
            // stagger: 0.06,
            ease: "power2.out",
          },
        );
      }
    };

    const close = () => {
      if (isAnimating) return;
      isAnimating = true;
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", "Open navigation menu");

      // Calculate how far each list needs to travel to reach viewport center
      const centerX = window.innerWidth / 2;
      // const navTarget = navList
      //   ? centerX -
      //     (navList.getBoundingClientRect().left + navList.offsetWidth / 2)
      //   : 0;
      // const socialTarget = socialList
      //   ? centerX -
      //     (socialList.getBoundingClientRect().left + socialList.offsetWidth / 2)
      //   : 0;

      const timeline = gsap.timeline({
        onComplete: () => {
          header.classList.remove("is-nav-open");
          if (navList) gsap.set(navList, { x: 0 });
          if (socialList) gsap.set(socialList, { x: 0 });
          isAnimating = false;
        },
      });

      // Fade out header background and blur as part of close animation
      if (navList) {
        timeline.to(
          navList,
          { x: centerX / 2, duration: 0.75, ease: "power2.in" },
          0,
        );
      }
      if (socialList) {
        timeline.to(
          socialList,
          { x: -centerX / 2, duration: 0.75, ease: "power2.in" },
          0,
        );
      }
      // Fade out items as they converge
      const items = [
        ...(navList ? Array.from(navList.children) : []),
        ...(socialList ? Array.from(socialList.children) : []),
      ];
      if (items.length) {
        timeline.to(
          items,
          { opacity: 0, duration: 0.5, ease: "power1.in" },
          0.2,
        );
      }
      timeline.to(
        header,
        {
          backgroundColor: "rgba(0,0,0,0)",
          backdropFilter: "blur(0px)",
          duration: 0.5,
          ease: "power2.in",
        },
        0.2,
      );
    };

    const isOpen = () => header.classList.contains("is-nav-open");

    toggle.addEventListener("click", () => {
      if (isAnimating) return;
      isOpen() ? close() : open();
    });

    // Close on Escape
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && isOpen()) close();
    });

    // Close on nav link click
    navLinks.forEach((link) =>
      link.addEventListener("click", () => {
        if (!isAnimating) close();
      }),
    );
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initNavToggle);
  } else {
    initNavToggle();
  }
})();
