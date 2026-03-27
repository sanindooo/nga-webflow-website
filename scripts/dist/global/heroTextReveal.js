"use strict";
(() => {
  (function() {
    "use strict";
    document.addEventListener("DOMContentLoaded", () => {
      gsap.registerPlugin(SplitText);
      console.log("test");
      const heroText = document.querySelector(
        ".heading-style-h1.hero_title"
      );
      if (!heroText) return;
      const split = new SplitText(heroText, { types: "words, lines" });
      gsap.set(split.lines, { overflow: "hidden" });
      gsap.fromTo(
        split.words,
        { y: "110%" },
        {
          y: "0%",
          // opacity: 1,
          duration: 1,
          ease: "power4.out",
          stagger: 0.05
        }
      );
    });
  })();
})();
