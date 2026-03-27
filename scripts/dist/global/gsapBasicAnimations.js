"use strict";
(() => {
  (function() {
    "use strict";
    document.addEventListener("DOMContentLoaded", () => {
      gsap.set(".slide-in", { y: 25, opacity: 0 });
      ScrollTrigger.batch(".slide-in", {
        start: "top bottom-=100px",
        onEnter: (batch) => gsap.to(batch, { opacity: 1, y: 0, duration: 1 })
      });
      gsap.set(".fade-in", { opacity: 0 });
      ScrollTrigger.batch(".fade-in", {
        start: "top bottom-=100px",
        onEnter: (batch) => gsap.to(batch, { opacity: 1, duration: 1 })
      });
    });
  })();
})();
