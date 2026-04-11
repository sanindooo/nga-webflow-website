/**
 * Slider Animations
 *
 * Swiper-based sliders. The text-animation variant runs a SplitText mask
 * reveal on hero titles as slides change (matches generalScrollTextReveal).
 * Dependencies: GSAP, SplitText, Swiper (all via CDN)
 */

;(function () {
  'use strict'

  const __s = ((window as any).__loadedScripts ??= {})
  if (__s['swiperSliders']) return
  __s['swiperSliders'] = true

  const heroSplits = new Map<HTMLElement, SplitTypeInstance[]>()

  const getHeroTitles = (slide: HTMLElement) =>
    slide.querySelectorAll<HTMLElement>('.heading-style-h1.hero_title.is-slider')

  const splitHeroTitles = (slide: HTMLElement) => {
    const instances: SplitTypeInstance[] = []
    getHeroTitles(slide).forEach((title) => {
      const split = new SplitText(title, { types: 'words, lines' })
      gsap.set(split.lines, { overflow: 'hidden' })
      gsap.set(split.words, { y: '110%' })
      instances.push(split)
    })
    if (instances.length) heroSplits.set(slide, instances)
  }

  const hideHeroTitles = (slide: HTMLElement) => {
    const instances = heroSplits.get(slide)
    if (!instances) return
    instances.forEach((split) => {
      gsap.set(split.words, { y: '110%' })
    })
  }

  const revealHeroTitles = (slide: HTMLElement) => {
    const instances = heroSplits.get(slide)
    if (!instances) return
    instances.forEach((split) => {
      gsap.to(split.words, {
        y: '0%',
        duration: 1,
        ease: 'power4.out',
        stagger: 0.05,
      })
    })
  }

  function init() {
    const sliderWrappers = document.querySelectorAll<HTMLElement>('.swiper_slider')
    if (!sliderWrappers.length) return

    sliderWrappers.forEach((slider) => {
      const textAnimationSlider = slider.querySelector<HTMLElement>('.swiper.text-animation')
      const defaultSlider = slider.querySelector<HTMLElement>('.swiper.default')
      const nextButton = slider.querySelector<HTMLElement>('.slide-button.swiper-button-next')
      const prevButton = slider.querySelector<HTMLElement>('.slide-button.swiper-button-prev')
      const splitSlider = slider.querySelector<HTMLElement>('.swiper.split')
      const children = slider.querySelectorAll('.image-slider_item')
      const pagination = slider.querySelector<HTMLElement>('.swiper-pagination')

      if (textAnimationSlider) {
        if (children.length === 1) {
          nextButton?.classList.add('hide')
          nextButton?.setAttribute('aria-hidden', 'true')
          prevButton?.classList.add('hide')
          prevButton?.setAttribute('aria-hidden', 'true')
        }

        new Swiper(textAnimationSlider, {
          loop: true,
          speed: 1000,
          slidesPerView: 1,
          centeredSlides: true,
          grabCursor: true,
          navigation: {
            nextEl: nextButton,
            prevEl: prevButton,
          },
          pagination: {
            el: pagination,
            clickable: true,
          },
          on: {
            init: function (swiper: SwiperInstance) {
              swiper.slides.forEach((slide: SwiperSlide) => {
                splitHeroTitles(slide)
              })
              const activeSlide = swiper.slides.find((slide: SwiperSlide) =>
                slide.classList.contains('swiper-slide-active'),
              )
              if (activeSlide) revealHeroTitles(activeSlide)
            },
            slideChangeTransitionStart: function (swiper: SwiperInstance) {
              const previousSlide = swiper.slides[swiper.previousIndex]
              if (previousSlide) hideHeroTitles(previousSlide)
              const activeSlide = swiper.slides[swiper.activeIndex]
              if (activeSlide) revealHeroTitles(activeSlide)
            },
          },
        })
      }

      if (defaultSlider) {
        new Swiper(defaultSlider, {
          loop: true,
          speed: 1000,
          slidesPerView: 1,
          grabCursor: true,
          pagination: {
            el: pagination,
            clickable: true,
          },
        })
      }

      if (splitSlider) {
        new Swiper(splitSlider, {
          loop: false,
          speed: 1000,
          freeMode: true,
          grabCursor: true,
          mousewheel: {
            forceToAxis: true,
          },
          navigation: {
            nextEl: nextButton,
          },
          breakpoints: {
            0: { slidesPerView: 1.05 },
            767: { slidesPerView: 1.25 },
            992: { slidesPerView: 1.25 },
          },
        })
      }
    })
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }
})()
