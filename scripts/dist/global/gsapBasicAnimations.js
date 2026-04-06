"use strict";
(() => {
  (function() {
    "use strict";
    const __s = window.__loadedScripts ?? (window.__loadedScripts = {});
    if (__s["gsapBasicAnimations"]) return;
    __s["gsapBasicAnimations"] = true;
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
