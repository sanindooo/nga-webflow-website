"use strict";
(() => {
  (function() {
    "use strict";
    const loadedScripts = window.__loadedScripts ?? (window.__loadedScripts = {});
    if (loadedScripts["randomImagesFadeIn"]) return;
    loadedScripts["randomImagesFadeIn"] = true;
    function init() {
      const gridSections = document.querySelectorAll(".process_grid");
      if (!gridSections.length) return;
      gridSections.forEach((gridSection) => {
        const gridItems = Array.from(gridSection.querySelectorAll(".process_grid-item"));
        if (!gridItems.length) return;
        gsap.set(gridItems, { autoAlpha: 0 });
        ScrollTrigger.create({
          trigger: gridSection,
          start: "top 50%",
          once: true,
          onEnter() {
            const shuffledItems = [...gridItems].sort(() => Math.random() - 0.5);
            const fadeInTimeline = gsap.timeline();
            shuffledItems.forEach((gridItem) => {
              fadeInTimeline.to(
                gridItem,
                {
                  autoAlpha: 1,
                  // y: 0,
                  duration: 0.5,
                  ease: "power2.out"
                },
                `<0.1`
              );
            });
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
