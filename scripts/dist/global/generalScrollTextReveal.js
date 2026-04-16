"use strict";
(() => {
  (function() {
    "use strict";
    const __s = window.__loadedScripts ?? (window.__loadedScripts = {});
    if (__s["generalScrollTextReveal"]) return;
    __s["generalScrollTextReveal"] = true;
    function init() {
      const textElements = document.querySelectorAll("[scroll-text-reveal]");
      if (textElements.length === 0) return;
      textElements.forEach((element) => {
        if (element.children.length > 0) {
          const timeline = gsap.timeline();
          Array.from(element.children).forEach((child, index) => {
            const split = new SplitText(child, { types: "lines", mask: "lines" });
            timeline.fromTo(
              split.lines,
              { y: "110%" },
              {
                y: "0%",
                duration: 0.75,
                ease: "power4.out",
                stagger: 0.05
              },
              index * 0.75
            );
          });
          ScrollTrigger.create({
            trigger: element,
            start: "top 80%",
            end: "bottom 20%",
            animation: timeline
          });
        } else {
          const split = new SplitText(element, { types: "lines", mask: "lines" });
          ScrollTrigger.create({
            trigger: element,
            start: "top 80%",
            end: "bottom 20%",
            animation: gsap.fromTo(
              split.lines,
              { y: "110%" },
              {
                y: "0%",
                duration: 1,
                ease: "power4.out",
                stagger: 0.15
              }
            )
          });
        }
      });
    }
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", init);
    } else {
      init();
    }
  })();
})();
