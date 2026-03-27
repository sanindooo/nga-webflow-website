"use strict";
(() => {
  (function() {
    "use strict";
    const lenis = new Lenis({
      prevent: (node) => node.getAttribute("data-prevent-lenis") === "true"
    });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((time) => {
      lenis.raf(time * 1e3);
    });
    gsap.ticker.lagSmoothing(0);
    window.stopSmoothScroll = () => lenis.stop();
    window.startSmoothScroll = () => lenis.start();
  })();
})();
