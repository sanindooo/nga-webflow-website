"use strict";
(() => {
  (function() {
    "use strict";
    const __s = window.__loadedScripts ?? (window.__loadedScripts = {});
    if (__s["homeTextSticky"]) return;
    __s["homeTextSticky"] = true;
    function init() {
      const sections = Array.from(document.querySelectorAll(".section_sticky-text"));
      if (sections.length === 0) return;
      sections.forEach((section, i) => {
        const titleWrapper = section.querySelector(".sticky-text_component");
        if (!titleWrapper) return;
        gsap.set(section, { position: "relative", zIndex: i + 1 });
        const split = new SplitText(titleWrapper.querySelector("h2"), { types: "words, lines" });
        const arrow = titleWrapper.querySelector(".right-arrow_svg");
        gsap.set([split.lines, arrow?.parentElement], { overflow: "hidden" });
        gsap.set([split.words, arrow], { y: "110%" });
        const tl = gsap.timeline();
        tl.to(split.words, {
          y: "0%"
        }).to(
          arrow,
          {
            y: "0%"
          },
          "-=.25"
        );
        ScrollTrigger.create({
          trigger: section,
          start: "top top",
          end: "bottom top",
          pin: titleWrapper,
          pinSpacing: false
        });
        ScrollTrigger.create({
          trigger: section,
          start: "top 2%",
          end: "bottom top",
          markers: false,
          animation: tl
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
