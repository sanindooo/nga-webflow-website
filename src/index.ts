/**
 * NGA Webflow bundle — single entry point.
 *
 * Loaded once via a `<script src>` in Webflow Site Settings footer, after the
 * GSAP/Lenis/SplitText/Swiper CDN tags. `Webflow.push` fires after
 * DOMContentLoaded and after Webflow.js init, so every CDN global is available
 * inside the callback — no polling, no queues.
 */

import { accordion } from '$utils/accordion'
import { buttonIconHover } from '$utils/buttonIconHover'
import { careersStackingCards } from '$utils/careersStackingCards'
import { cmsFilterLinks } from '$utils/cmsFilterLinks'
import { currentYear } from '$utils/currentYear'
import { filterActiveState } from '$utils/filterActiveState'
import { generalImageHover } from '$utils/generalImageHover'
import { generalScrollTextReveal } from '$utils/generalScrollTextReveal'
import { gsapBasicAnimations } from '$utils/gsapBasicAnimations'
import { gsapSmoothScroll } from '$utils/gsapSmoothScroll'
import { heroTextReveal } from '$utils/heroTextReveal'
import { homeTextSticky } from '$utils/homeTextSticky'
import { modals } from '$utils/modals'
import { navTheme } from '$utils/navTheme'
import { navToggle } from '$utils/navToggle'
import { officeCardTabs } from '$utils/officeCardTabs'
import { proccessSlider } from '$utils/proccessSlider'
import { publicationsGridFade } from '$utils/publicationsGridFade'
import { randomImagesFadeIn } from '$utils/randomImagesFadeIn'
import { stickyFilter } from '$utils/stickyFilter'
import { swiperSliders } from '$utils/swiperSliders'
import { teamCardHover } from '$utils/teamCardHover'
import { teamLeaders } from '$utils/teamLeaders'
import { videoPlayPauseToggle } from '$utils/videoPlayPauseToggle'
import { viewSwitcher } from '$utils/viewSwitcher'
import { worksCardHover } from '$utils/worksCardHover'

window.Webflow ||= [] as unknown as WebflowQueue
window.Webflow.push(() => {
  gsapSmoothScroll()

  gsapBasicAnimations()
  heroTextReveal()
  generalScrollTextReveal()
  homeTextSticky()
  publicationsGridFade()
  randomImagesFadeIn()
  careersStackingCards()
  proccessSlider()
  // stickyFilter()
  swiperSliders()

  navToggle()
  navTheme()

  buttonIconHover()
  teamCardHover()
  teamLeaders()
  worksCardHover()
  generalImageHover()
  officeCardTabs()
  accordion()
  modals()

  currentYear()
  videoPlayPauseToggle()
  viewSwitcher()
  cmsFilterLinks()
  filterActiveState()
})
