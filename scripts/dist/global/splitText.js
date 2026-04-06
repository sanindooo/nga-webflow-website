"use strict";
(() => {
  (function() {
    "use strict";
    const __s = window.__loadedScripts ?? (window.__loadedScripts = {});
    if (__s["splitText"]) return;
    __s["splitText"] = true;
    document.addEventListener("DOMContentLoaded", () => {
      gsap.registerPlugin(ScrollTrigger);
      const texts = document.querySelectorAll(".text-mask");
      if (!texts.length) return;
      const mm = gsap.matchMedia();
      mm.add(
        {
          isMobile: "screen and (max-width: 767px)",
          isDesktop: "screen and (min-width: 768px)"
        },
        (context) => {
          const { isMobile } = context.conditions;
          texts.forEach((textEl) => {
            gsap.set(textEl, { display: "inline-block" });
            const split = new SplitType(textEl, { types: "words" });
            const ems = textEl.querySelectorAll("em");
            gsap.set(ems, { display: "unset" });
            gsap.set(split.words, {
              yPercent: 80,
              opacity: 0,
              autoAlpha: 0
            });
            const tl = gsap.timeline();
            tl.to(split.words, {
              ease: (i) => 1 - Math.pow(1 - i, 4),
              duration: isMobile ? 1.5 : 1,
              yPercent: 0,
              opacity: 1,
              autoAlpha: 1,
              stagger: 0.01
            });
            ScrollTrigger.create({
              trigger: textEl,
              markers: false,
              start: isMobile ? "top 85%" : "top 75%",
              animation: tl
            });
          });
        }
      );
    });
  })();
})();
