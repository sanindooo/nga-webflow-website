/**
 * Slider Animations
 *
 * Swiper-based sliders with split text animations for hero titles.
 * Dependencies: GSAP, Swiper, SplitType (all via CDN)
 */

;(function () {
  'use strict'

  const __s = ((window as any).__loadedScripts ??= {})
  if (__s['swiperSliders']) return
  __s['swiperSliders'] = true

  const splitInstances = new Map<HTMLElement, SplitTypeInstance[]>()

  const revertSplits = (slide: HTMLElement) => {
    const instances = splitInstances.get(slide)
    if (instances) {
      instances.forEach((instance) => {
        if ((instance as any).revert) (instance as any).revert()
      })
      splitInstances.delete(slide)
    }
  }

  const setInitialStates = (slide: HTMLElement) => {
    const heroTitles = slide.querySelectorAll<HTMLElement>('.heading-style-h1.hero_title.is-slider')
    heroTitles.forEach((title) => {
      gsap.set(title, { opacity: 0 })
    })
  }

  const animateSlide = (slide: HTMLElement) => {
    revertSplits(slide)

    const heroTitles = slide.querySelectorAll<HTMLElement>('.heading-style-h1.hero_title.is-slider')
    const instances: SplitTypeInstance[] = []
    const timeline = gsap.timeline()

    heroTitles.forEach((title, index) => {
      const split = new SplitType(title, { types: 'words' })
      instances.push(split)

      gsap.set(split.words, { yPercent: 80, opacity: 0 })

      timeline.to(
        split.words,
        {
          duration: 0.8,
          yPercent: 0,
          opacity: 1,
          stagger: 0.03,
          ease: 'power2.out',
        },
        0.2 + index * 0.15,
      )

      timeline.set(title, { opacity: 1 }, 0.2 + index * 0.15)
    })

    splitInstances.set(slide, instances)
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
          },
          on: {
            init: function (swiper: SwiperInstance) {
              swiper.slides.forEach((slide: SwiperSlide) => {
                if (!slide.classList.contains('swiper-slide-active')) {
                  setInitialStates(slide)
                }
              })
              const activeSlide = swiper.slides.find((slide: SwiperSlide) =>
                slide.classList.contains('swiper-slide-active'),
              )
              if (activeSlide) animateSlide(activeSlide)
            },
            slideChangeTransitionStart: function (swiper: SwiperInstance) {
              const previousSlide = swiper.slides[swiper.previousIndex]
              if (previousSlide) setInitialStates(previousSlide)
            },
            slideChange: function (swiper: SwiperInstance) {
              setTimeout(() => {
                const activeSlide = swiper.slides.find((slide: SwiperSlide) =>
                  slide.classList.contains('swiper-slide-active'),
                )

                if (activeSlide) {
                  setInitialStates(activeSlide)
                  animateSlide(activeSlide)
                }
              }, 200)
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
