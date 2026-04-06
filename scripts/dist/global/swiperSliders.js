"use strict";
(() => {
  const setInitialStates = (slide) => {
    const testimonialTexts = slide.querySelectorAll(".text-rich-text.u-testimonial p");
    const clientImages = slide.querySelectorAll(".testimonial_client-image");
    const clientName = slide.querySelector(".text-weight-medium.text-color-green");
    const companyName = slide.querySelector(".font-family-sharetech");
    if (testimonialTexts.length > 0) {
      testimonialTexts.forEach((paragraph) => {
        gsap.set(paragraph, { opacity: 0 });
      });
    }
    if (clientImages.length > 0) {
      clientImages.forEach((image) => {
        gsap.set(image, { y: 10, opacity: 0, scale: 0.95 });
      });
    }
    if (clientName) gsap.set(clientName, { opacity: 0 });
    if (companyName) gsap.set(companyName, { opacity: 0 });
  };
  const animateSlide = (slide) => {
    const testimonialTexts = slide.querySelectorAll(".text-rich-text.u-testimonial p");
    const clientImages = slide.querySelectorAll(".testimonial_client-image");
    const clientName = slide.querySelector(".text-weight-medium.text-color-green");
    const companyName = slide.querySelector(".font-family-sharetech");
    const tl = gsap.timeline();
    let currentTime = 0.2;
    if (testimonialTexts.length > 0) {
      testimonialTexts.forEach((paragraph, index) => {
        const split = new SplitType(paragraph, { types: "words" });
        gsap.set(split.words, { yPercent: 80, opacity: 0 });
        tl.to(
          split.words,
          {
            duration: 0.8,
            yPercent: 0,
            opacity: 1,
            stagger: 0.02,
            ease: "power2.out"
          },
          currentTime + index * 0.2
        );
        tl.set(paragraph, { opacity: 1 }, currentTime + index * 0.2);
      });
      const lastParagraphFinish = currentTime + (testimonialTexts.length - 1) * 0.2 + 0.8;
      currentTime = lastParagraphFinish + 0.3;
    }
    if (clientImages.length > 0) {
      clientImages.forEach((image) => {
        tl.to(
          image,
          {
            duration: 0.8,
            y: 0,
            opacity: 1,
            scale: 1,
            ease: "power2.out"
          },
          currentTime
        );
      });
      currentTime -= 0.05;
    }
    if (clientName) {
      const splitName = new SplitType(clientName, { types: "words" });
      gsap.set(splitName.words, { yPercent: 30, opacity: 0 });
      tl.to(
        splitName.words,
        {
          duration: 0.6,
          yPercent: 0,
          opacity: 1,
          stagger: 0.01,
          ease: "power2.out"
        },
        currentTime
      );
      tl.set(clientName, { opacity: 1 }, currentTime);
      currentTime += 0.1;
    }
    if (companyName) {
      const splitCompany = new SplitType(companyName, { types: "words" });
      gsap.set(splitCompany.words, { yPercent: 25, opacity: 0 });
      tl.to(
        splitCompany.words,
        {
          duration: 0.6,
          yPercent: 0,
          opacity: 1,
          stagger: 0.01,
          ease: "power2.out"
        },
        currentTime
      );
      tl.set(companyName, { opacity: 1 }, currentTime);
    }
  };
  (function() {
    "use strict";
    const __s = window.__loadedScripts ?? (window.__loadedScripts = {});
    if (__s["swiperSliders"]) return;
    __s["swiperSliders"] = true;
    document.addEventListener("DOMContentLoaded", () => {
      const sliderWrappers = document.querySelectorAll(".swiper_slider");
      if (!sliderWrappers.length) return;
      sliderWrappers.forEach((slider) => {
        const defaultSlider = slider.querySelector(".swiper.default");
        const nextButton = slider.querySelector(".slide-button.swiper-button-next");
        const prevButton = slider.querySelector(".slide-button.swiper-button-prev");
        const splitSlider = slider.querySelector(".swiper.split");
        const children = slider.querySelectorAll(".image-slider_item");
        if (defaultSlider) {
          if (children.length === 1) {
            nextButton?.classList.add("hide");
            nextButton?.setAttribute("aria-hidden", "true");
            prevButton?.classList.add("hide");
            prevButton?.setAttribute("aria-hidden", "true");
          }
          new Swiper(defaultSlider, {
            loop: true,
            speed: 1e3,
            slidesPerView: 1,
            centeredSlides: true,
            navigation: {
              nextEl: nextButton,
              prevEl: prevButton
            },
            pagination: {
              el: ".swiper-pagination"
            },
            on: {
              init: function(swiper) {
                swiper.slides.forEach((slide) => {
                  if (!slide.classList.contains("swiper-slide-active")) {
                    setInitialStates(slide);
                  }
                });
              },
              slideChangeTransitionStart: function(swiper) {
                swiper.slides.forEach((slide) => {
                  setInitialStates(slide);
                });
              },
              slideChange: function(swiper) {
                setTimeout(() => {
                  const activeSlide = swiper.slides.find(
                    (slide) => slide.classList.contains("swiper-slide-active")
                  );
                  if (activeSlide) {
                    setInitialStates(activeSlide);
                    animateSlide(activeSlide);
                  }
                }, 200);
              }
            }
          });
        }
        if (splitSlider) {
          new Swiper(splitSlider, {
            loop: false,
            speed: 1e3,
            freeMode: true,
            grabCursor: true,
            mousewheel: {
              forceToAxis: true
            },
            navigation: {
              nextEl: nextButton
            },
            breakpoints: {
              0: { slidesPerView: 1.05 },
              767: { slidesPerView: 1.25 },
              992: { slidesPerView: 1.25 }
            }
          });
        }
      });
    });
  })();
})();
