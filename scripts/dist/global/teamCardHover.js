"use strict";
(() => {
  (function() {
    "use strict";
    const loadedScripts = window.__loadedScripts ?? (window.__loadedScripts = {});
    if (loadedScripts["teamCardHover"]) return;
    loadedScripts["teamCardHover"] = true;
    const DURATION = 0.45;
    const EASE = "power2.inOut";
    function init() {
      const gsap = window.gsap;
      if (!gsap) return;
      const cards = Array.from(document.querySelectorAll(".studio-team_card"));
      if (!cards.length) return;
      cards.forEach((card) => {
        const description = card.querySelector(".studio-team_card-info p");
        const image = card.querySelector(".studio-team_card img");
        if (!description) return;
        gsap.set(description, { autoAlpha: 0, yPercent: 20 });
        card.addEventListener("mouseenter", () => {
          gsap.killTweensOf(description);
          gsap.to(description, { autoAlpha: 1, yPercent: 0, duration: DURATION, ease: EASE });
          gsap.to(image, { scale: 1.1, duration: DURATION, ease: EASE });
        });
        card.addEventListener("mouseleave", () => {
          gsap.killTweensOf(description);
          gsap.to(description, { autoAlpha: 0, yPercent: 20, duration: DURATION, ease: EASE });
          gsap.to(image, { scale: 1, duration: DURATION, ease: EASE });
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
