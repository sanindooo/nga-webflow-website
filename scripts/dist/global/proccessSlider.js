"use strict";
(() => {
  (function() {
    "use strict";
    const loadedScripts = window.__loadedScripts ?? (window.__loadedScripts = {});
    if (loadedScripts["processSlider"]) return;
    loadedScripts["processSlider"] = true;
    const TRANSITION_DURATION = 0.45;
    const HOLD_DURATION = 1.5;
    const SCROLL_PX_PER_SECTION = 600;
    function getTitle(section) {
      return section.querySelector("h3.benefit-card_title");
    }
    function getNumber(section) {
      return section.querySelector("p.process-slider_number");
    }
    function getParagraph(section) {
      return section.querySelector(".benefit-card_body p");
    }
    function getFigure(section) {
      return section.querySelector(".process-slider_figure");
    }
    function buildTransition(incomingSection, totalSections, incomingIndex) {
      const incomingTitle = getTitle(incomingSection);
      const incomingNumber = getNumber(incomingSection);
      const incomingParagraph = getParagraph(incomingSection);
      const incomingFigure = getFigure(incomingSection);
      const transitionTimeline = gsap.timeline();
      transitionTimeline.set(incomingSection, { autoAlpha: 1, zIndex: totalSections + incomingIndex });
      transitionTimeline.fromTo(
        [incomingTitle, incomingNumber],
        { autoAlpha: 0, y: -24, rotateX: 40, transformOrigin: "50% 0%" },
        {
          autoAlpha: 1,
          y: 0,
          rotateX: 0,
          duration: TRANSITION_DURATION,
          ease: "power2.out",
          transformOrigin: "50% 0%"
        },
        0
      );
      transitionTimeline.fromTo(
        [incomingParagraph, incomingFigure],
        { autoAlpha: 0 },
        {
          autoAlpha: 1,
          duration: TRANSITION_DURATION,
          ease: "power2.out"
        },
        0
      );
      return transitionTimeline;
    }
    function init() {
      const wrapper = document.querySelector(".process-card_wrapper");
      if (!wrapper) return;
      const sections = Array.from(wrapper.querySelectorAll(".process-slider_component"));
      if (sections.length < 2) return;
      const totalSections = sections.length;
      gsap.set(wrapper, { perspective: 800 });
      sections.forEach((section, index) => {
        const title = getTitle(section);
        const number = getNumber(section);
        const paragraph = getParagraph(section);
        const figure = getFigure(section);
        if (index === 0) {
          gsap.set(section, { autoAlpha: 1, zIndex: totalSections });
          gsap.set([title, number], { autoAlpha: 1, y: 0, rotateX: 0 });
          gsap.set([paragraph, figure], { autoAlpha: 1 });
        } else {
          gsap.set(section, { autoAlpha: 0, zIndex: totalSections - index });
          gsap.set([title, number], { autoAlpha: 0, y: -24, rotateX: 40, transformOrigin: "50% 0%" });
          gsap.set([paragraph, figure], { autoAlpha: 0 });
        }
      });
      const masterTimeline = gsap.timeline({ paused: true });
      sections.forEach((section, index) => {
        if (index === sections.length - 1) return;
        const nextSection = sections[index + 1];
        masterTimeline.add(buildTransition(nextSection, totalSections, index + 1));
        if (index < sections.length - 2) {
          masterTimeline.to({}, { duration: HOLD_DURATION });
        }
      });
      ScrollTrigger.create({
        trigger: wrapper,
        pin: true,
        anticipatePin: 1,
        start: "top top",
        end: `+=${(totalSections - 1) * SCROLL_PX_PER_SECTION}`,
        scrub: 1.2,
        animation: masterTimeline
      });
    }
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", init);
    } else {
      init();
    }
  })();
})();
