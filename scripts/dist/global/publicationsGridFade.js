"use strict";
(() => {
  (function() {
    "use strict";
    const loadedScripts = window.__loadedScripts ?? (window.__loadedScripts = {});
    if (loadedScripts["publicationsGridFade"]) return;
    loadedScripts["publicationsGridFade"] = true;
    function init() {
      const grids = document.querySelectorAll(".card-grid_grid");
      if (!grids.length) return;
      grids.forEach((grid) => {
        const gridItems = Array.from(grid.querySelectorAll(".card-grid_grid-item"));
        if (!gridItems.length) return;
        const shuffledGridItems = [...gridItems].sort(() => Math.random() - 0.5);
        gsap.set(gridItems, { autoAlpha: 0, y: 20 });
        const scrollDistance = gridItems.length * 120;
        const gridTimeline = gsap.timeline({
          scrollTrigger: {
            trigger: grid,
            start: "top 80%",
            end: `+=${scrollDistance}`,
            scrub: true
          }
        });
        shuffledGridItems.forEach((gridItem) => {
          gridTimeline.to(
            gridItem,
            { autoAlpha: 1, y: 0, duration: 1, ease: "power2.out" },
            "<0.3"
          );
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
