"use strict";
(() => {
  (function() {
    "use strict";
    const __s = window.__loadedScripts ?? (window.__loadedScripts = {});
    if (__s["generalImageHover"]) return;
    __s["generalImageHover"] = true;
    function init() {
      const images = Array.from(document.querySelectorAll('[hover-scale="true"]'));
      console.log(images);
      if (images.length === 0) return;
      images.forEach((image) => {
        const parentElement = image.parentElement;
        if (parentElement) {
          gsap.set(parentElement, { overflow: "hidden" });
        }
        image.parentElement.addEventListener("mouseenter", () => {
          console.log("hovering image");
          gsap.to(image, { scale: 1.1, duration: 0.5, ease: "power2.out" });
        });
        image.parentElement.addEventListener("mouseleave", () => {
          console.log("left image");
          gsap.to(image, { scale: 1, duration: 0.5, ease: "power2.out" });
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
