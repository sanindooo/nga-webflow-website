"use strict";
(() => {
  (function() {
    "use strict";
    const loadedScripts = window.__loadedScripts ?? (window.__loadedScripts = {});
    if (loadedScripts["randomImagesFadeIn"]) return;
    loadedScripts["randomImagesFadeIn"] = true;
    function init() {
      const wrapper = document.querySelector(".process_grid-wrapper");
      if (!wrapper) return;
      const sections = Array.from(wrapper.querySelectorAll(".process_compontent"));
      if (!sections.length) return;
      wrapper.style.display = "block";
      sections.forEach((section) => {
        const headerItems = Array.from(section.querySelectorAll(".process_header-item"));
        const gridItems = Array.from(section.querySelectorAll(".process_grid-item"));
        const shuffledGridItems = [...gridItems].sort(() => Math.random() - 0.5);
        gsap.set([...headerItems, ...gridItems], { autoAlpha: 0, y: 20 });
        const scrollDistance = (headerItems.length + gridItems.length) * 120;
        const sectionTimeline = gsap.timeline({
          scrollTrigger: {
            trigger: section,
            start: "top top",
            end: `+=${scrollDistance}`,
            pin: true,
            pinSpacing: true,
            scrub: true,
            markers: false
          }
        });
        headerItems.forEach((headerItem) => {
          sectionTimeline.to(
            headerItem,
            { autoAlpha: 1, y: 0, duration: 1, ease: "power2.out" },
            "<0.3"
          );
        });
        shuffledGridItems.forEach((gridItem) => {
          sectionTimeline.to(
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
