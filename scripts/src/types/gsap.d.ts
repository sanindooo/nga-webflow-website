/**
 * Global Type Declarations
 *
 * GSAP, Swiper, SplitType, and Lenis are loaded via CDN (not npm) because
 * CDNs work better in Webflow sites, and GSAP is now owned by Webflow.
 * These declarations provide type safety for the global objects.
 */

// -- GSAP --

interface GsapTimeline {
  to: (
    target: unknown,
    vars: Record<string, unknown>,
    position?: number | string,
  ) => GsapTimeline;
  fromTo: (
    target: unknown,
    fromVars: Record<string, unknown>,
    toVars: Record<string, unknown>,
    position?: number | string,
  ) => GsapTimeline;
  set: (
    target: unknown,
    vars: Record<string, unknown>,
    position?: number | string,
  ) => GsapTimeline;
}

interface GsapMatchMediaContext {
  conditions: Record<string, boolean>;
}

interface GsapMatchMedia {
  add: (
    conditions: Record<string, string>,
    callback: (context: GsapMatchMediaContext) => void,
  ) => void;
}

interface GsapInstance {
  registerPlugin: (plugin: unknown) => void;
  from: (target: Element | string, vars: Record<string, unknown>) => void;
  fromTo: (
    target: unknown,
    fromVars: Record<string, unknown>,
    toVars: Record<string, unknown>,
  ) => void;
  to: (
    target: unknown,
    vars: Record<string, unknown>,
    position?: number | string,
  ) => void;
  set: (target: unknown, vars: Record<string, unknown>) => void;
  timeline: () => GsapTimeline;
  matchMedia: () => GsapMatchMedia;
  ticker: {
    add: (fn: (time: number) => void) => void;
    lagSmoothing: (threshold: number) => void;
  };
}

interface ScrollTriggerStatic {
  update: () => void;
  refresh: () => void;
  batch: (target: string, vars: Record<string, unknown>) => void;
  create: (vars: Record<string, unknown>) => void;
}

declare const gsap: GsapInstance;
declare const ScrollTrigger: ScrollTriggerStatic;

// -- Lenis --

interface LenisInstance {
  on: (event: string, callback: () => void) => void;
  raf: (time: number) => void;
  stop: () => void;
  start: () => void;
}

interface LenisConstructor {
  new (options: Record<string, unknown>): LenisInstance;
}

declare const Lenis: LenisConstructor;

// -- SplitType --

interface SplitTypeInstance {
  words: HTMLElement[] | null;
  lines: HTMLElement[] | null;
}

interface SplitTypeConstructor {
  new (
    target: HTMLElement | Element,
    options: { types: string },
  ): SplitTypeInstance;
}

declare const SplitText: SplitTypeConstructor;

// -- Swiper --

interface SwiperSlide extends HTMLElement {}

interface SwiperInstance {
  slides: SwiperSlide[];
}

interface SwiperConstructor {
  new (el: HTMLElement, options: Record<string, unknown>): SwiperInstance;
}

interface SwiperNavigationModule {}
interface SwiperPaginationModule {}

declare const Swiper: SwiperConstructor;
declare const SwiperNavigation: SwiperNavigationModule;
declare const SwiperPagination: SwiperPaginationModule;

// -- Window extensions --

interface Window {
  stopSmoothScroll?: () => void;
  startSmoothScroll?: () => void;
}
