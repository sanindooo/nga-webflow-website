"use strict";
(() => {
  (() => {
    (function() {
      const textElements = document.querySelectorAll("[scroll-text-reveal]");
      if (textElements.length === 0) return;
      textElements.forEach((element) => {
        if (element.children.length > 0) {
          const tl = gsap.timeline();
          Array.from(element.children).forEach((child, i) => {
            const split = new SplitText(child, { types: "words, lines" });
            gsap.set(split.lines, { overflow: "hidden" });
            tl.fromTo(
              split.words,
              { y: "110%" },
              {
                y: "0%",
                duration: 0.75,
                ease: "power4.out",
                stagger: 0.025
              },
              i * 0.75
            );
            ScrollTrigger.create({
              trigger: element,
              start: "top 80%",
              end: "bottom 20%",
              markers: false,
              animation: tl
            });
          });
        } else {
          const split = new SplitText(element, { types: "words, lines" });
          gsap.set(split.lines, { overflow: "hidden" });
          ScrollTrigger.create({
            trigger: element,
            start: "top 80%",
            end: "bottom 20%",
            markers: false,
            animation: gsap.fromTo(
              split.words,
              { y: "110%" },
              {
                y: "0%",
                duration: 1,
                ease: "power4.out",
                stagger: 0.05
              }
            )
          });
        }
      });
    })();
  })();
})();
