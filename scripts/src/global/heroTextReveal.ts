(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", () => {
    gsap.registerPlugin(SplitText);
    console.log("test");
    const heroText = document.querySelector(
      ".heading-style-h1.hero_title",
    ) as HTMLElement;

    if (!heroText) return;

    const split = new SplitText(heroText, { types: "words, lines" });
    console.log(split);
  });
})();
