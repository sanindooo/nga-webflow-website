(function () {
  const textElements = document.querySelectorAll(".scroll-text-reveal");
  if (textElements.length === 0) return;
  textElements.forEach((element) => {
    const split = new SplitText(element, { types: "words, lines" });
    gsap.set(split.lines, { overflow: "hidden" });
    ScrollTrigger.create({
      trigger: element,
      start: "top 80%",
      end: "bottom 20%",
      markers: true,
      animation: gsap.fromTo(
        split.words,
        { y: "110%" },
        {
          y: "0%",
          duration: 1,
          ease: "power4.out",
          stagger: 0.05,
        },
      ),
    });
  });
})();
