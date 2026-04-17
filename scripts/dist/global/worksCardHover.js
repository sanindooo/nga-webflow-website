"use strict";
(() => {
  (function() {
    "use strict";
    const __s = window.__loadedScripts ?? (window.__loadedScripts = {});
    if (__s["worksCardHover"]) return;
    __s["worksCardHover"] = true;
    const gsap = window.gsap;
    const desktopMediaQuery = window.matchMedia("(min-width: 992px)");
    function init() {
      if (!gsap) return;
      const cardItems = document.querySelectorAll(".works_list-item");
      cardItems.forEach((card) => {
        const overlay = card.querySelector(".works_content-wrapper .overlay");
        const contentWrapper = card.querySelector(".works_content");
        const image = card.querySelector("img");
        if (!overlay || !contentWrapper) return;
        gsap.set(overlay, { autoAlpha: 0 });
        gsap.set(contentWrapper, { autoAlpha: 0, y: -12 });
        gsap.set(image?.parentElement, { overflow: "hidden" });
        card.addEventListener("mouseenter", () => {
          if (!desktopMediaQuery.matches) return;
          gsap.to(overlay, { autoAlpha: 1, duration: 0.4, ease: "power2.out" });
          gsap.to(contentWrapper, { autoAlpha: 1, y: 0, duration: 0.4, ease: "power2.out" });
          if (image) gsap.to(image, { scale: 1.1, duration: 0.4, ease: "power2.out" });
        });
        card.addEventListener("mouseleave", () => {
          if (!desktopMediaQuery.matches) return;
          gsap.to(overlay, { autoAlpha: 0, duration: 0.4, ease: "power2.in" });
          gsap.to(contentWrapper, { autoAlpha: 0, y: -12, duration: 0.4, ease: "power2.in" });
          if (image) gsap.to(image, { scale: 1, duration: 0.4, ease: "power2.in" });
        });
        desktopMediaQuery.addEventListener("change", (event) => {
          if (!event.matches) {
            gsap.set(overlay, { autoAlpha: 1, clearProps: "opacity,visibility" });
            gsap.set(contentWrapper, {
              autoAlpha: 1,
              y: 0,
              clearProps: "opacity,visibility,transform"
            });
            if (image) gsap.set(image, { scale: 1, clearProps: "transform" });
          } else {
            gsap.set(overlay, { autoAlpha: 0 });
            gsap.set(contentWrapper, { autoAlpha: 0, y: -12 });
          }
        });
      });
    }
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", init);
    } else {
      init();
    }
  })();
})();
