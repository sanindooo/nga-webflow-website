/**
 * Global CDN type declarations.
 *
 * GSAP, ScrollTrigger, Lenis, SplitText, and Swiper are loaded via CDN in
 * Webflow's Site Settings footer and are therefore ambient globals by the
 * time this bundle's `Webflow.push` callback runs. These declarations keep
 * the modules typed without requiring npm installs.
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

interface GsapDelayedCall {
  pause: () => GsapDelayedCall;
  restart: (includeDelay?: boolean) => GsapDelayedCall;
  kill: () => void;
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
  killTweensOf: (target: unknown) => void;
  timeline: (vars?: Record<string, unknown>) => GsapTimeline;
  matchMedia: () => GsapMatchMedia;
  delayedCall: (delay: number, callback: () => void) => GsapDelayedCall;
  ticker: {
    add: (fn: (time: number) => void) => void;
    lagSmoothing: (threshold: number) => void;
  };
}

interface ScrollTriggerConfig {
  ignoreMobileResize?: boolean;
  autoRefreshEvents?: string;
  limitCallbacks?: boolean;
  syncInterval?: number;
}

interface ScrollTriggerInstance {
  vars: Record<string, unknown>;
  trigger?: HTMLElement | string | null;
  pin?: HTMLElement | null;
  start: number;
  end: number;
  progress: number;
  isActive: boolean;
  scroll: () => number;
  getVelocity: () => number;
  kill: (reset?: boolean) => void;
}

interface ScrollTriggerStatic {
  update: () => void;
  refresh: (safe?: boolean) => void;
  sort: (
    func?: (a: ScrollTriggerInstance, b: ScrollTriggerInstance) => number,
  ) => ScrollTriggerInstance[];
  config: (options: ScrollTriggerConfig) => void;
  defaults: (vars: Record<string, unknown>) => void;
  normalizeScroll: (enabled: boolean) => void;
  batch: (target: string, vars: Record<string, unknown>) => void;
  create: (vars: Record<string, unknown>) => ScrollTriggerInstance;
  getAll: () => ScrollTriggerInstance[];
  isInViewport: (trigger: unknown) => boolean;
  isTouch: number;
  isScrolling: () => boolean;
  addEventListener: (
    type: 'refresh' | 'refreshInit' | 'scrollStart' | 'scrollEnd' | 'matchMedia' | 'revert',
    callback: () => void,
  ) => void;
  removeEventListener: (type: string, callback: () => void) => void;
}

declare const gsap: GsapInstance;
declare const ScrollTrigger: ScrollTriggerStatic;

// -- Lenis (deprecated; kept for backward compat with archived code paths) --

interface LenisInstance {
  on: (event: string, callback: () => void) => void;
  raf: (time: number) => void;
  resize: () => void;
  stop: () => void;
  start: () => void;
  scroll: number;
  targetScroll: number;
  velocity: number;
  isScrolling: boolean;
}

interface LenisConstructor {
  new (options: Record<string, unknown>): LenisInstance;
}

declare const Lenis: LenisConstructor;

// -- ScrollSmoother (GSAP) --

interface ScrollSmootherInstance {
  paused: (paused?: boolean) => boolean;
  scrollTop: (value?: number) => number;
  scrollTo: (target: unknown, smooth?: boolean) => void;
  refresh: (safe?: boolean) => void;
  kill: () => void;
  getVelocity: () => number;
  offset: (target?: HTMLElement | string) => number;
  progress: number;
  smooth: (value?: number) => number;
}

interface ScrollSmootherStatic {
  create: (vars?: Record<string, unknown>) => ScrollSmootherInstance;
  get: () => ScrollSmootherInstance | undefined;
  refresh: () => void;
}

declare const ScrollSmoother: ScrollSmootherStatic;

// -- SplitText (GSAP 3.13+) --

interface SplitTypeInstance {
  words: HTMLElement[] | null;
  lines: HTMLElement[] | null;
  chars: HTMLElement[] | null;
}

interface SplitTextOptions {
  types?: string;
  type?: string;
  mask?: string;
  autoSplit?: boolean;
  wordsClass?: string;
  linesClass?: string;
  charsClass?: string;
  onSplit?: (self: SplitTypeInstance) => unknown;
}

interface SplitTypeConstructor {
  new (
    target: HTMLElement | Element,
    options: SplitTextOptions,
  ): SplitTypeInstance;
}

declare const SplitText: SplitTypeConstructor;
declare const SplitType: SplitTypeConstructor;

// -- Swiper --

interface SwiperSlide extends HTMLElement {}

interface SwiperInstance {
  slides: SwiperSlide[];
  activeIndex: number;
  previousIndex: number;
}

interface SwiperConstructor {
  new (el: HTMLElement, options: Record<string, unknown>): SwiperInstance;
}

declare const Swiper: SwiperConstructor;
