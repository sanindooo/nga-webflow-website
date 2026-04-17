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
    const mobileMediaQuery = window.matchMedia("(max-width: 991px)");
    function init() {
      const gsap = window.gsap;
      if (!gsap) return;
      const listItems = Array.from(document.querySelectorAll(".studio-team-list_item"));
      if (!listItems.length) return;
      let activeMobileItem = null;
      listItems.forEach((item) => {
        const figure = item.querySelector(".studio-team_floating-figure");
        if (!figure) return;
        gsap.set(figure, { autoAlpha: 0, border: "1px solid #717171", zIndex: 1e3 });
        item.addEventListener("mouseenter", () => {
          if (mobileMediaQuery.matches) return;
          const randomX = getRandomX();
          gsap.set(figure, { left: randomX });
          gsap.to(figure, { autoAlpha: 1, duration: DURATION, ease: "power2.out" });
        });
        item.addEventListener("mouseleave", () => {
          if (mobileMediaQuery.matches) return;
          gsap.to(figure, { autoAlpha: 0, duration: DURATION, ease: "power2.in" });
        });
        item.addEventListener("click", () => {
          if (!mobileMediaQuery.matches) return;
          if (activeMobileItem === figure) {
            gsap.to(figure, { autoAlpha: 0, duration: DURATION, ease: "power2.in" });
            activeMobileItem = null;
            return;
          }
          if (activeMobileItem) {
            gsap.to(activeMobileItem, { autoAlpha: 0, duration: DURATION, ease: "power2.in" });
          }
          gsap.set(figure, { left: "auto", right: 16 });
          gsap.to(figure, { autoAlpha: 1, duration: DURATION, ease: "power2.out" });
          activeMobileItem = figure;
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
