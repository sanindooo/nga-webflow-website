"use strict";
(() => {
  (function() {
    "use strict";
    const loadedScripts = window.__loadedScripts ?? (window.__loadedScripts = {});
    if (loadedScripts["teamLeaders"]) return;
    loadedScripts["teamLeaders"] = true;
    const DURATION = 0.5;
    const HIDE_DELAY_MS = 0;
    function getRandomX() {
      const minX = window.innerWidth * 0.2;
      const maxX = window.innerWidth * 0.6;
      return Math.floor(minX + Math.random() * (maxX - minX));
    }
    function init() {
      const gsap = window.gsap;
      if (!gsap) return;
      const listItems = Array.from(document.querySelectorAll(".studio-team-list_item"));
      if (!listItems.length) return;
      listItems.forEach((item) => {
        const figure = item.querySelector(".studio-team_floating-figure");
        if (!figure) return;
        gsap.set(figure, { autoAlpha: 0, border: "1px solid #717171", zIndex: 1e3 });
        item.addEventListener("mouseenter", () => {
          const randomX = getRandomX();
          gsap.set(figure, { left: randomX });
          gsap.to(figure, { autoAlpha: 1, duration: DURATION, ease: "power2.out" });
        });
        item.addEventListener("mouseleave", () => {
          gsap.to(figure, { autoAlpha: 0, duration: DURATION, ease: "power2.in" });
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
