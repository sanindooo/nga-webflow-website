"use strict";
(() => {
  (function() {
    "use strict";
    document.addEventListener("DOMContentLoaded", () => {
      if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
        console.warn("[animations] GSAP or ScrollTrigger not loaded \u2014 ensure Webflow GSAP toggle is enabled");
        return;
      }
      gsap.registerPlugin(ScrollTrigger);
      const elements = document.querySelectorAll("[data-animation-general]");
      elements.forEach((el) => {
        gsap.from(el, {
          opacity: 0,
          y: 30,
          duration: 0.8,
          ease: "power2.out",
          scrollTrigger: {
            trigger: el,
            start: "top 85%",
            toggleActions: "play none none none"
          }
        });
      });
    });
  })();
})();
