"use strict";
(() => {
  // src/utils/accordion.ts
  var accordion = () => {
    const accordionTriggers = document.querySelectorAll(".accordion_header");
    if (!accordionTriggers.length) return;
    function toggleAccordion(item, height) {
      accordionTriggers.forEach((otherItem) => {
        if (otherItem !== item) {
          otherItem.setAttribute("aria-expanded", "false");
          otherItem.classList.remove("is-active");
          const otherContent = otherItem.nextElementSibling;
          if (otherContent) {
            otherContent.style.maxHeight = "0px";
          }
        }
      });
      const isExpanded = item.getAttribute("aria-expanded") === "true";
      item.setAttribute("aria-expanded", isExpanded ? "false" : "true");
      item.classList.toggle("is-active");
      const text = item.nextElementSibling;
      if (text) {
        text.style.maxHeight = text.style.maxHeight === "0px" ? `${height + 9 * 14}px` : "0px";
      }
    }
    accordionTriggers.forEach((item, index) => {
      const contentWrapper = item.nextElementSibling;
      if (!contentWrapper) return;
      contentWrapper.style.maxHeight = "0px";
      const accordionId = `accordion-${index}`;
      const accordionTargetId = `accordion-target-${index}`;
      item.id = accordionId;
      item.setAttribute("aria-controls", accordionTargetId);
      contentWrapper.id = accordionTargetId;
      contentWrapper.setAttribute("aria-labelledby", accordionId);
      item.addEventListener("click", (event) => {
        event.preventDefault();
        const content = contentWrapper.querySelector(".accordion_content");
        if (!content) return;
        toggleAccordion(item, content.offsetHeight);
      });
    });
  };

  // src/utils/buttonIconHover.ts
  var DURATION = 0.5;
  var EASE = "power2.out";
  var ROTATION = 360;
  var buttonIconHover = () => {
    const buttons = Array.from(document.querySelectorAll(".button.is-link.is-icon"));
    if (!buttons.length) return;
    const isTouchDevice = window.matchMedia("(hover: none)").matches;
    if (isTouchDevice) return;
    buttons.forEach((button) => {
      const square = button.querySelector(".button-square");
      const textEl = Array.from(button.children).find(
        (child) => child instanceof HTMLElement && !child.classList.contains("button-square")
      );
      if (!square || !textEl) return;
      const text = textEl.textContent?.trim() ?? "";
      if (!text) return;
      textEl.textContent = "";
      textEl.style.position = "relative";
      textEl.style.overflow = "hidden";
      textEl.style.display = "inline-block";
      const original = document.createElement("span");
      original.textContent = text;
      original.style.display = "block";
      const clone = document.createElement("span");
      clone.textContent = text;
      clone.setAttribute("aria-hidden", "true");
      clone.style.display = "block";
      clone.style.position = "absolute";
      clone.style.top = "0";
      clone.style.left = "0";
      clone.style.width = "100%";
      clone.style.pointerEvents = "none";
      textEl.append(original, clone);
      gsap.set(clone, { yPercent: 100 });
      button.addEventListener("mouseenter", () => {
        gsap.killTweensOf([original, clone, square]);
        gsap.to(original, { yPercent: -100, duration: DURATION, ease: EASE });
        gsap.to(clone, { yPercent: 0, duration: DURATION, ease: EASE });
        gsap.to(square, { rotation: ROTATION, duration: DURATION, ease: EASE });
      });
      button.addEventListener("mouseleave", () => {
        gsap.killTweensOf([original, clone, square]);
        gsap.to(original, { yPercent: 0, duration: DURATION, ease: EASE });
        gsap.to(clone, { yPercent: 100, duration: DURATION, ease: EASE });
        gsap.to(square, { rotation: 0, duration: DURATION, ease: EASE });
      });
    });
  };

  // src/utils/careersStackingCards.ts
  var careersStackingCards = () => {
    const wrapper = document.querySelector(".benefit-card_wrapper");
    const sections = document.querySelectorAll(".benefit-card_component");
    if (!wrapper || sections.length === 0) return;
    sections.forEach((section, index) => {
      section.style.cssText = `top: 0; z-index: ${index + 1};`;
      const blackOverlay = document.createElement("div");
      blackOverlay.classList.add("black-overlay");
      blackOverlay.style.cssText = "position: absolute; inset: 0; background: black; opacity: 0; pointer-events: none; z-index: 10;";
      section.appendChild(blackOverlay);
      if (index === 0) return;
      gsap.set(section, { yPercent: 100 });
      const figure = section.querySelector(".benefit-card_figure");
      if (figure) {
        gsap.set(figure, { clipPath: "inset(0% 0% 100% 0%)" });
        const image = figure.querySelector("img");
        if (image) gsap.set(image, { scale: 1.2 });
      }
      const textWrapper = section.querySelector(".benefit-card_meta");
      gsap.set(textWrapper, { overflow: "hidden" });
      gsap.set(textWrapper?.querySelectorAll("& > *"), { yPercent: 100 });
    });
    const tl = gsap.timeline();
    const SEGMENT = 5;
    const HOLD = 0.4;
    sections.forEach((section, index) => {
      if (index === 0) return;
      const t = (index - 1) * SEGMENT;
      const prevOverlay = sections[index - 1].querySelector(".black-overlay");
      const figure = section.querySelector(".benefit-card_figure");
      const image = figure?.querySelector("img");
      const textWrapper = section.querySelector(".benefit-card_meta");
      if (prevOverlay) {
        tl.to(prevOverlay, { opacity: 0.6, ease: "none", duration: SEGMENT }, t + HOLD);
      }
      const slideStart = t + HOLD;
      tl.to(section, { yPercent: 0, ease: "power2.inOut", duration: SEGMENT }, slideStart);
      const contentStart = slideStart + 3;
      if (figure) {
        tl.to(figure, { clipPath: "inset(0% 0% 0% 0%)", ease: "none", duration: 1 }, contentStart);
      }
      if (image) {
        tl.to(image, { scale: 1, ease: "power4.out", duration: 1 }, contentStart);
      }
      if (textWrapper && textWrapper.children.length) {
        tl.to(
          textWrapper?.querySelectorAll("& > *"),
          { yPercent: 0, stagger: 0.06, ease: "power2.out", duration: 0.6 },
          contentStart
        );
      }
    });
    ScrollTrigger.create({
      trigger: wrapper,
      start: "top top",
      end: `+=${(sections.length - 1) * SEGMENT * window.innerHeight * 0.4}`,
      pin: true,
      pinSpacing: true,
      animation: tl,
      scrub: true
    });
  };

  // src/utils/cmsFilterLinks.ts
  var cmsFilterLinks = () => {
    const filterLinks = document.querySelectorAll(
      "a[data-filter-path][data-title]"
    );
    filterLinks.forEach((link) => {
      const categoryName = link.getAttribute("data-title");
      const filterPath = link.getAttribute("data-filter-path");
      if (!categoryName || !filterPath) return;
      link.href = "/" + filterPath + "?category=" + encodeURIComponent(categoryName).replace(/%20/g, "+");
    });
  };

  // src/utils/currentYear.ts
  var currentYear = () => {
    const yearElement = document.getElementById("current-year");
    if (!yearElement) return;
    yearElement.textContent = String((/* @__PURE__ */ new Date()).getFullYear());
  };

  // src/utils/filterActiveState.ts
  var ACTIVE_CLASS = "fs-cmsfilter_active";
  function syncActiveStates(filterForm, clearWrapper) {
    const hasChecked = filterForm.querySelector('input[type="checkbox"]:checked') !== null;
    if (clearWrapper) {
      clearWrapper.classList.toggle(ACTIVE_CLASS, !hasChecked);
    }
    filterForm.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
      const checkboxWrapper = checkbox.closest(".news-filter_link");
      if (checkboxWrapper) {
        checkboxWrapper.classList.toggle(ACTIVE_CLASS, checkbox.checked);
      }
    });
  }
  var filterActiveState = () => {
    const filterForms = document.querySelectorAll('[fs-cmsfilter-element="filters"]');
    if (!filterForms.length) return;
    filterForms.forEach((filterForm) => {
      const clearButton = filterForm.querySelector('[fs-cmsfilter-element="clear"]');
      const clearWrapper = clearButton?.parentElement;
      if (clearWrapper) {
        clearWrapper.classList.add(ACTIVE_CLASS);
      }
      filterForm.addEventListener("change", () => {
        syncActiveStates(filterForm, clearWrapper);
      });
      if (clearButton) {
        clearButton.addEventListener("click", () => {
          syncActiveStates(filterForm, clearWrapper);
        });
      }
    });
    const fsAttributes = window.fsAttributes ??= [];
    fsAttributes.push([
      "cmsfilter",
      () => {
        filterForms.forEach((filterForm) => {
          const clearWrapper = filterForm.querySelector(
            '[fs-cmsfilter-element="clear"]'
          )?.parentElement;
          syncActiveStates(filterForm, clearWrapper);
        });
      }
    ]);
  };

  // src/utils/generalImageHover.ts
  var generalImageHover = () => {
    const images = Array.from(document.querySelectorAll('[hover-scale="true"]'));
    if (images.length === 0) return;
    images.forEach((image) => {
      const parentElement = image.parentElement;
      if (!parentElement) return;
      gsap.set(parentElement, { overflow: "hidden" });
      parentElement.addEventListener("mouseenter", () => {
        gsap.to(image, { scale: 1.1, duration: 0.5, ease: "power2.out" });
      });
      parentElement.addEventListener("mouseleave", () => {
        gsap.to(image, { scale: 1, duration: 0.5, ease: "power2.out" });
      });
    });
  };

  // src/utils/generalScrollTextReveal.ts
  var generalScrollTextReveal = () => {
    const textElements = document.querySelectorAll("[scroll-text-reveal]");
    if (textElements.length === 0) return;
    document.fonts.ready.then(() => {
      textElements.forEach((element) => {
        if (element.children.length > 0) {
          Array.from(element.children).forEach((child, index) => {
            new SplitText(child, {
              types: "lines",
              mask: "lines",
              autoSplit: true,
              onSplit: (self) => {
                return gsap.fromTo(
                  self.lines,
                  { y: "110%" },
                  {
                    y: "0%",
                    duration: 0.75,
                    ease: "power4.out",
                    stagger: 0.05,
                    delay: index * 0.75,
                    scrollTrigger: {
                      trigger: element,
                      start: "top 80%",
                      end: "bottom 20%"
                    }
                  }
                );
              }
            });
          });
        } else {
          new SplitText(element, {
            types: "lines",
            mask: "lines",
            autoSplit: true,
            onSplit: (self) => {
              return gsap.fromTo(
                self.lines,
                { y: "110%" },
                {
                  y: "0%",
                  duration: 1,
                  ease: "power4.out",
                  stagger: 0.15,
                  scrollTrigger: {
                    trigger: element,
                    start: "top 80%",
                    end: "bottom 20%"
                  }
                }
              );
            }
          });
        }
      });
      requestAnimationFrame(() => ScrollTrigger.refresh());
    });
  };

  // src/utils/gsapBasicAnimations.ts
  var gsapBasicAnimations = () => {
    gsap.set(".slide-in", { y: 25, opacity: 0 });
    ScrollTrigger.batch(".slide-in", {
      start: "top 80%",
      end: "bottom 20%",
      onEnter: (batch) => gsap.to(batch, { opacity: 1, y: 0, duration: 1 })
    });
    gsap.set(".fade-in", { opacity: 0 });
    ScrollTrigger.batch(".fade-in", {
      start: "top 80%",
      end: "bottom 20%",
      onEnter: (batch) => gsap.to(batch, { opacity: 1, duration: 1 })
    });
  };

  // src/utils/gsapSmoothScroll.ts
  var lenisInstance = null;
  var stopSmoothScroll = () => lenisInstance?.stop();
  var startSmoothScroll = () => lenisInstance?.start();
  var gsapSmoothScroll = () => {
    ScrollTrigger.config({ ignoreMobileResize: true });
    const isTouch = ScrollTrigger.isTouch;
    if (isTouch) {
      let pending = false;
      let lastHeight = document.body.offsetHeight;
      const refreshOnBodyResize = new ResizeObserver(() => {
        const height = document.body.offsetHeight;
        if (height === lastHeight || pending) return;
        lastHeight = height;
        pending = true;
        requestAnimationFrame(() => {
          ScrollTrigger.refresh(true);
          pending = false;
        });
      });
      refreshOnBodyResize.observe(document.body);
      window.addEventListener("load", () => ScrollTrigger.refresh(true), { once: true });
      document.querySelectorAll("img").forEach((img) => {
        if (img.complete && img.naturalWidth > 0) return;
        img.addEventListener("load", () => ScrollTrigger.refresh(true), { once: true });
      });
    } else {
      const lenis = new Lenis({
        prevent: (node) => node.getAttribute("data-prevent-lenis") === "true"
      });
      lenisInstance = lenis;
      lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.add((time) => {
        lenis.raf(time * 1e3);
      });
      gsap.ticker.lagSmoothing(0);
      let pending = false;
      let lastHeight = document.body.offsetHeight;
      const refreshOnBodyResize = new ResizeObserver(() => {
        const height = document.body.offsetHeight;
        if (height === lastHeight || pending) return;
        lastHeight = height;
        pending = true;
        requestAnimationFrame(() => {
          ScrollTrigger.refresh(true);
          pending = false;
        });
      });
      refreshOnBodyResize.observe(document.body);
      window.addEventListener("load", () => ScrollTrigger.refresh(), { once: true });
      document.querySelectorAll("img").forEach((img) => {
        if (img.complete && img.naturalWidth > 0) return;
        img.addEventListener("load", () => ScrollTrigger.refresh(), { once: true });
      });
    }
  };

  // src/utils/heroTextReveal.ts
  var heroTextReveal = () => {
    const heroText = document.querySelector(
      ".heading-style-h1.hero_title:not(.is-slider)"
    );
    if (!heroText) return;
    new SplitText(heroText, {
      types: "words, lines",
      mask: "lines",
      autoSplit: true,
      onSplit: (self) => {
        return gsap.fromTo(
          self.words,
          { y: "110%" },
          {
            y: "0%",
            duration: 1,
            ease: "power4.out",
            stagger: 0.05
          }
        );
      }
    });
  };

  // src/utils/homeTextSticky.ts
  var homeTextSticky = () => {
    const sections = Array.from(document.querySelectorAll(".section_sticky-text"));
    if (sections.length === 0) return;
    sections.forEach((section, sectionIndex) => {
      const titleWrapper = section.querySelector(".sticky-text_component");
      if (!titleWrapper) return;
      gsap.set(section, { position: "relative", zIndex: sectionIndex + 1 });
      const split = new SplitText(titleWrapper.querySelector("h2"), {
        types: "words, lines",
        wordsClass: "sticky-word"
      });
      const arrow = titleWrapper.querySelector(".right-arrow_svg");
      gsap.set([split.lines, arrow?.parentElement], { overflow: "hidden" });
      gsap.set([split.words, arrow], { y: "110%" });
      let arrowVisible = false;
      titleWrapper.addEventListener("mouseenter", () => {
        if (!arrowVisible) return;
        gsap.to(arrow, { y: "0%", duration: 0.4, ease: "power2.out" });
      });
      titleWrapper.addEventListener("mouseleave", () => {
        if (!arrowVisible) return;
        gsap.to(arrow, { y: "110%", duration: 0.4, ease: "power2.in" });
      });
      const tl = gsap.timeline();
      tl.to(split.words, {
        y: "0%",
        stagger: 0.1,
        onComplete: () => {
          arrowVisible = true;
        }
      });
      ScrollTrigger.create({
        trigger: section,
        start: "top 10%",
        end: "bottom top",
        pin: titleWrapper,
        pinSpacing: false
      });
      ScrollTrigger.create({
        trigger: section,
        start: "top 2%",
        end: "bottom top",
        markers: false,
        animation: tl
      });
    });
    const lastSection = sections[sections.length - 1];
    const lastTitleWrapper = lastSection.querySelector(".sticky-text_header");
    ScrollTrigger.create({
      trigger: lastSection,
      start: "50% top",
      animation: gsap.to(lastTitleWrapper, {
        opacity: 0,
        duration: 1
      }),
      // scrub: true,
      markers: true,
      toggleActions: "play none none reverse"
    });
  };

  // src/utils/modals.ts
  var FOCUSABLE_SELECTOR = [
    "a[href]",
    "button:not([disabled])",
    'input:not([disabled]):not([type="hidden"])',
    "select:not([disabled])",
    "textarea:not([disabled])",
    '[tabindex]:not([tabindex="-1"])'
  ].join(",");
  var modals = () => {
    const modalElements = document.querySelectorAll('[role="dialog"]');
    if (!modalElements.length) return;
    const overlayElement = document.querySelector("[data-modal-overlay]");
    let activeModal = null;
    let activeTrigger = null;
    let savedScrollY = 0;
    modalElements.forEach((modal) => {
      if (!modal.id) return;
      const titleElement = modal.querySelector("h1, h2, h3, h4, h5, h6");
      if (titleElement) {
        if (!titleElement.id) titleElement.id = `${modal.id}-title`;
        modal.setAttribute("aria-labelledby", titleElement.id);
      }
      const descriptionElement = modal.querySelector(
        '.w-richtext, [role="document"], p'
      );
      if (descriptionElement) {
        if (!descriptionElement.id) descriptionElement.id = `${modal.id}-desc`;
        modal.setAttribute("aria-describedby", descriptionElement.id);
      }
    });
    function getFocusableElements(root) {
      return Array.from(root.querySelectorAll(FOCUSABLE_SELECTOR)).filter(
        (element) => !element.hasAttribute("disabled") && element.offsetParent !== null
      );
    }
    function openModal(modal, trigger) {
      if (activeModal) closeModal();
      activeModal = modal;
      activeTrigger = trigger;
      modal.classList.add("is-open");
      modal.setAttribute("aria-hidden", "false");
      trigger.setAttribute("aria-expanded", "true");
      const overlayEnabled = overlayElement && !modal.hasAttribute("data-modal-no-overlay");
      if (overlayEnabled) {
        overlayElement.classList.add("is-open");
        overlayElement.setAttribute("aria-hidden", "false");
      }
      savedScrollY = window.scrollY;
      document.body.style.top = `-${savedScrollY}px`;
      document.body.classList.add("no-scroll");
      stopSmoothScroll();
      requestAnimationFrame(() => {
        const focusable = getFocusableElements(modal);
        const firstFocusable = focusable[0] ?? modal;
        firstFocusable.focus({ preventScroll: true });
      });
    }
    function closeModal() {
      if (!activeModal) return;
      const modal = activeModal;
      const trigger = activeTrigger;
      modal.classList.remove("is-open");
      modal.setAttribute("aria-hidden", "true");
      trigger?.setAttribute("aria-expanded", "false");
      if (overlayElement) {
        overlayElement.classList.remove("is-open");
        overlayElement.setAttribute("aria-hidden", "true");
      }
      document.body.classList.remove("no-scroll");
      document.body.style.top = "";
      window.scrollTo(0, savedScrollY);
      startSmoothScroll();
      trigger?.focus({ preventScroll: true });
      activeModal = null;
      activeTrigger = null;
    }
    document.addEventListener("click", (event) => {
      const target = event.target;
      const trigger = target?.closest("[data-modal-open]");
      if (trigger) {
        event.preventDefault();
        const modalId = trigger.getAttribute("data-modal-open");
        if (!modalId) return;
        const modal = document.getElementById(modalId);
        if (modal && modal.getAttribute("role") === "dialog") {
          openModal(modal, trigger);
        }
        return;
      }
      const closeButton = target?.closest("[data-modal-close]");
      if (closeButton && activeModal) {
        event.preventDefault();
        closeModal();
      }
    });
    document.addEventListener("keydown", (event) => {
      if (!activeModal) return;
      if (event.key === "Escape") {
        event.preventDefault();
        closeModal();
        return;
      }
      if (event.key === "Tab") {
        const focusable = getFocusableElements(activeModal);
        if (!focusable.length) {
          event.preventDefault();
          return;
        }
        const firstFocusable = focusable[0];
        const lastFocusable = focusable[focusable.length - 1];
        const currentFocus = document.activeElement;
        if (event.shiftKey && currentFocus === firstFocusable) {
          event.preventDefault();
          lastFocusable.focus({ preventScroll: true });
        } else if (!event.shiftKey && currentFocus === lastFocusable) {
          event.preventDefault();
          firstFocusable.focus({ preventScroll: true });
        }
      }
    });
  };

  // src/utils/navTheme.ts
  var DARK_COLOR = "#012C72";
  var navTheme = () => {
    const headerElement = document.querySelector(".header");
    if (headerElement?.getAttribute("data-wf--main-nav--variant") === "white-bg") return;
    const logoWrapper = document.querySelector(".nav-custom_logo");
    const hamburgerToggle = document.querySelector(".nav-custom_toggle");
    const darkThemeSections = Array.from(
      document.querySelectorAll("[data-header-theme='dark']")
    );
    const whiteThemeSections = Array.from(
      document.querySelectorAll("[data-header-theme='white']")
    );
    if (!headerElement || !logoWrapper || !hamburgerToggle) return;
    if (darkThemeSections.length === 0) return;
    const darkOverlay = document.createElement("div");
    darkOverlay.setAttribute("aria-hidden", "true");
    headerElement.classList.forEach((cls) => darkOverlay.classList.add(cls));
    Object.assign(darkOverlay.style, {
      position: "fixed",
      top: "0",
      left: "0",
      right: "0",
      height: `${headerElement.offsetHeight}px`,
      pointerEvents: "none",
      zIndex: "9999"
    });
    const logoClone = logoWrapper.cloneNode(true);
    Object.assign(logoClone.style, {
      position: "absolute",
      margin: "0",
      padding: "0",
      color: DARK_COLOR
    });
    darkOverlay.appendChild(logoClone);
    const toggleClone = hamburgerToggle.cloneNode(true);
    Object.assign(toggleClone.style, {
      position: "absolute",
      margin: "0"
    });
    toggleClone.querySelectorAll(".nav-custom_line").forEach((line) => {
      line.style.backgroundColor = DARK_COLOR;
    });
    darkOverlay.appendChild(toggleClone);
    document.body.appendChild(darkOverlay);
    let navHeight = headerElement.offsetHeight;
    const syncClonePositions = () => {
      navHeight = headerElement.offsetHeight;
      darkOverlay.style.height = `${navHeight}px`;
      const logoRect = logoWrapper.getBoundingClientRect();
      Object.assign(logoClone.style, {
        top: `${logoRect.top}px`,
        left: `${logoRect.left}px`,
        width: `${logoRect.width}px`,
        height: `${logoRect.height}px`
      });
      const toggleRect = hamburgerToggle.getBoundingClientRect();
      Object.assign(toggleClone.style, {
        top: `${toggleRect.top}px`,
        left: `${toggleRect.left}px`,
        width: `${toggleRect.width}px`,
        height: `${toggleRect.height}px`
      });
    };
    const subtractIntervals = (darks, whites) => {
      if (whites.length === 0) return darks;
      const result = [];
      for (const dark of darks) {
        let segments = [{ start: dark.start, end: dark.end }];
        for (const white of whites) {
          const next = [];
          for (const seg of segments) {
            if (white.end <= seg.start || white.start >= seg.end) {
              next.push(seg);
            } else {
              if (white.start > seg.start) next.push({ start: seg.start, end: white.start });
              if (white.end < seg.end) next.push({ start: white.end, end: seg.end });
            }
          }
          segments = next;
        }
        result.push(...segments);
      }
      return result;
    };
    const buildMaskGradient = (intervals) => {
      if (intervals.length === 0) {
        return "linear-gradient(transparent, transparent)";
      }
      const sorted = [...intervals].sort((intervalA, intervalB) => intervalA.start - intervalB.start);
      const stops = [];
      let cursor = 0;
      for (const { start, end } of sorted) {
        if (start > cursor) {
          stops.push(`transparent ${cursor}px`, `transparent ${start}px`);
        }
        stops.push(`black ${start}px`, `black ${end}px`);
        cursor = end;
      }
      if (cursor < navHeight) {
        stops.push(`transparent ${cursor}px`, `transparent ${navHeight}px`);
      }
      return `linear-gradient(to bottom, ${stops.join(", ")})`;
    };
    let lastScrollY = -1;
    let lastGradient = "";
    const updateMask = () => {
      if (headerElement.classList.contains("is-nav-open")) return;
      const currentScrollY = window.scrollY;
      if (currentScrollY === lastScrollY) return;
      lastScrollY = currentScrollY;
      const darkIntervals = [];
      for (const section of darkThemeSections) {
        const rect = section.getBoundingClientRect();
        const intervalStart = Math.max(0, Math.min(rect.top, navHeight));
        const intervalEnd = Math.max(0, Math.min(rect.bottom, navHeight));
        if (intervalEnd > intervalStart) {
          darkIntervals.push({ start: intervalStart, end: intervalEnd });
        }
      }
      const whiteIntervals = [];
      for (const section of whiteThemeSections) {
        const rect = section.getBoundingClientRect();
        const intervalStart = Math.max(0, Math.min(rect.top, navHeight));
        const intervalEnd = Math.max(0, Math.min(rect.bottom, navHeight));
        if (intervalEnd > intervalStart) {
          whiteIntervals.push({ start: intervalStart, end: intervalEnd });
        }
      }
      const coverageIntervals = subtractIntervals(darkIntervals, whiteIntervals);
      const gradient = buildMaskGradient(coverageIntervals);
      if (gradient === lastGradient) return;
      lastGradient = gradient;
      darkOverlay.style.maskImage = gradient;
      darkOverlay.style.webkitMaskImage = gradient;
    };
    const isMobile = () => window.matchMedia("(max-width: 767px)").matches;
    const navOpenObserver = new MutationObserver(() => {
      const isOpen = headerElement.classList.contains("is-nav-open");
      if (isOpen) {
        toggleClone.style.transition = "none";
        toggleClone.style.opacity = "0";
        toggleClone.style.display = "none";
        if (isMobile()) {
          logoClone.style.transition = "none";
          logoClone.style.opacity = "0";
          logoClone.style.display = "none";
        }
      } else {
        toggleClone.style.display = "";
        void toggleClone.offsetHeight;
        toggleClone.style.transition = "opacity 0.4s ease";
        toggleClone.style.opacity = "1";
        if (isMobile()) {
          logoClone.style.display = "";
          void logoClone.offsetHeight;
          logoClone.style.transition = "opacity 0.4s ease";
          logoClone.style.opacity = "1";
        }
      }
    });
    navOpenObserver.observe(headerElement, {
      attributes: true,
      attributeFilter: ["class"]
    });
    syncClonePositions();
    updateMask();
    const tick = () => {
      updateMask();
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    window.addEventListener(
      "resize",
      () => {
        syncClonePositions();
        updateMask();
      },
      { passive: true }
    );
  };

  // src/utils/navToggle.ts
  var navToggle = () => {
    const toggle = document.querySelector('[data-nav="open"]');
    const header = document.querySelector(".header");
    const menu = document.querySelector('[data-nav="menu"]');
    const navLinks = document.querySelectorAll(".nav-custom_menu-link");
    const navList = document.querySelector(".nav-custom_list:not(.u-social-links)");
    const socialList = document.querySelector(".nav-custom_list.u-social-links");
    if (!toggle || !header) return;
    toggle.setAttribute("role", "button");
    toggle.setAttribute("aria-label", "Open navigation menu");
    toggle.setAttribute("aria-expanded", "false");
    if (menu) toggle.setAttribute("aria-controls", menu.id || "nav-menu");
    let isAnimating = false;
    const open = () => {
      header.classList.add("is-nav-open");
      gsap.to(header, {
        backgroundColor: header.getAttribute("data-wf--main-nav--variant") === "white-bg" ? "rgb(255,255,255)" : "rgba(250, 250, 250, 0.55)",
        backdropFilter: header.getAttribute("data-wf--main-nav--variant") === "white-bg" ? "blur(0px)" : "blur(20px)",
        duration: 0.35,
        ease: "power2.out"
      });
      toggle.setAttribute("aria-expanded", "true");
      toggle.setAttribute("aria-label", "Close navigation menu");
      const items = [
        ...navList ? Array.from(navList.children) : [],
        ...socialList ? Array.from(socialList.children) : []
      ];
      if (items.length) {
        gsap.fromTo(
          items,
          { opacity: 0, y: 8 },
          { opacity: 1, y: 0, duration: 0.35, ease: "power2.out" }
        );
      }
    };
    const close = () => {
      if (isAnimating) return;
      isAnimating = true;
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", "Open navigation menu");
      const timeline = gsap.timeline({
        onComplete: () => {
          header.classList.remove("is-nav-open");
          isAnimating = false;
        }
      });
      const items = [
        ...navList ? Array.from(navList.children) : [],
        ...socialList ? Array.from(socialList.children) : []
      ];
      if (items.length) {
        timeline.to(items, { opacity: 0, y: 8, duration: 0.35, ease: "power2.in" }, 0);
      }
      timeline.to(
        header,
        {
          backgroundColor: header.getAttribute("data-wf--main-nav--variant") === "white-bg" ? "rgb(255,255,255)" : "rgba(250, 250, 250, 0)",
          backdropFilter: "blur(0px)",
          duration: 0.35,
          ease: "power2.in"
        },
        0
      );
    };
    const isOpen = () => header.classList.contains("is-nav-open");
    toggle.addEventListener("click", () => {
      if (isAnimating) return;
      if (isOpen()) close();
      else open();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && isOpen()) close();
    });
    navLinks.forEach(
      (link) => link.addEventListener("click", () => {
        if (!isAnimating) close();
      })
    );
  };

  // src/utils/officeCardTabs.ts
  var officeCardTabs = () => {
    const officeCards = document.querySelectorAll(".office-card_component");
    if (officeCards.length === 0) return;
    officeCards.forEach((card, cardIndex) => {
      const placePanel = card.querySelector(".office-card_image");
      const mapPanel = card.querySelector(".office-card_map");
      const tabContainer = card.querySelector(".office-card_tabs");
      const tabs = card.querySelectorAll(".office-card_tab");
      if (!placePanel || !mapPanel || !tabContainer || tabs.length === 0) return;
      const panels = {
        place: placePanel,
        map: mapPanel
      };
      tabContainer.setAttribute("role", "tablist");
      Object.entries(panels).forEach(([key, panel]) => {
        const panelId = `office-${cardIndex}-${key}-panel`;
        panel.id = panelId;
        panel.setAttribute("role", "tabpanel");
      });
      placePanel.classList.add("is-active");
      mapPanel.classList.remove("is-active");
      tabs.forEach((tab) => {
        const target = tab.getAttribute("data-office-tab");
        if (!target) return;
        const panelId = `office-${cardIndex}-${target}-panel`;
        const tabId = `office-${cardIndex}-${target}-tab`;
        tab.id = tabId;
        tab.setAttribute("role", "tab");
        tab.setAttribute("aria-controls", panelId);
        panels[target]?.setAttribute("aria-labelledby", tabId);
        if (target === "place") {
          tab.classList.add("is-active");
          tab.setAttribute("aria-selected", "true");
        } else {
          tab.setAttribute("aria-selected", "false");
        }
        tab.addEventListener("click", () => {
          tabs.forEach((sibling) => {
            sibling.classList.remove("is-active");
            sibling.setAttribute("aria-selected", "false");
          });
          tab.classList.add("is-active");
          tab.setAttribute("aria-selected", "true");
          Object.entries(panels).forEach(([key, panel]) => {
            panel.classList.toggle("is-active", key === target);
          });
        });
      });
    });
  };

  // src/utils/proccessSlider.ts
  var TRANSITION_DURATION = 0.45;
  var HOLD_DURATION = 1.5;
  var SCROLL_PX_PER_SECTION = 600;
  var getTitle = (section) => section.querySelector("h3.benefit-card_title");
  var getNumber = (section) => section.querySelector("p.process-slider_number");
  var getParagraph = (section) => section.querySelector(".benefit-card_body p");
  var getFigure = (section) => section.querySelector(".process-slider_figure");
  var proccessSlider = () => {
    const wrapper = document.querySelector(".process-card_wrapper");
    if (!wrapper) return;
    const sections = Array.from(wrapper.querySelectorAll(".process-slider_component"));
    if (sections.length < 2) return;
    gsap.set(wrapper, { position: "relative" });
    sections.forEach((section, sectionIndex) => {
      gsap.set(section, {
        backgroundColor: "transparent",
        zIndex: sections.length - sectionIndex
      });
      const figure = getFigure(section);
      const title = getTitle(section);
      const number = getNumber(section);
      const paragraph = getParagraph(section);
      if (title?.parentElement) gsap.set(title.parentElement, { overflow: "hidden" });
      if (number?.parentElement) gsap.set(number.parentElement, { overflow: "hidden" });
      if (paragraph?.parentElement) gsap.set(paragraph.parentElement, { overflow: "hidden" });
      if (sectionIndex === 0) return;
      if (title) gsap.set(title, { yPercent: 100 });
      if (number) gsap.set(number, { yPercent: 120 });
      if (paragraph) gsap.set(paragraph, { yPercent: 100 });
      void figure;
    });
    const timeline = gsap.timeline();
    const stepDuration = TRANSITION_DURATION + HOLD_DURATION;
    sections.slice(1).forEach((incomingSection, relativeIndex) => {
      const outgoingSection = sections[relativeIndex];
      const timeOffset = relativeIndex * stepDuration;
      const outFigure = getFigure(outgoingSection);
      const outTitle = getTitle(outgoingSection);
      const outNumber = getNumber(outgoingSection);
      const outParagraph = getParagraph(outgoingSection);
      const inTitle = getTitle(incomingSection);
      const inNumber = getNumber(incomingSection);
      const inParagraph = getParagraph(incomingSection);
      if (outFigure)
        timeline.to(
          outFigure,
          { clipPath: "inset(0 0 100% 0)", duration: TRANSITION_DURATION, ease: "power2.inOut" },
          timeOffset
        );
      if (outTitle)
        timeline.to(
          outTitle,
          { yPercent: -100, duration: TRANSITION_DURATION, ease: "power2.inOut" },
          timeOffset
        );
      if (outNumber)
        timeline.to(
          outNumber,
          { yPercent: -120, duration: TRANSITION_DURATION, ease: "power2.inOut" },
          timeOffset
        );
      if (outParagraph)
        timeline.to(
          outParagraph,
          { yPercent: -100, duration: TRANSITION_DURATION, ease: "power2.inOut" },
          timeOffset
        );
      if (inTitle)
        timeline.to(
          inTitle,
          { yPercent: 0, duration: TRANSITION_DURATION, ease: "power2.inOut" },
          timeOffset
        );
      if (inNumber)
        timeline.to(
          inNumber,
          { yPercent: 0, duration: TRANSITION_DURATION, ease: "power2.inOut" },
          timeOffset
        );
      if (inParagraph)
        timeline.to(
          inParagraph,
          { yPercent: 0, duration: TRANSITION_DURATION, ease: "power2.inOut" },
          timeOffset
        );
    });
    ScrollTrigger.create({
      trigger: wrapper,
      pin: true,
      markers: false,
      animation: timeline,
      scrub: true,
      end: `+=${sections.length * SCROLL_PX_PER_SECTION}`
    });
  };

  // src/utils/publicationsGridFade.ts
  function buildRowGroups(gridItems) {
    const rowMap = /* @__PURE__ */ new Map();
    gridItems.forEach((gridItem) => {
      const topOffset = gridItem.offsetTop;
      if (!rowMap.has(topOffset)) rowMap.set(topOffset, []);
      rowMap.get(topOffset).push(gridItem);
    });
    return Array.from(rowMap.entries()).sort(([topOffsetA], [topOffsetB]) => topOffsetA - topOffsetB).map(([, rowItems]) => [...rowItems].sort(() => Math.random() - 0.5));
  }
  var publicationsGridFade = () => {
    const grids = document.querySelectorAll(".card-grid_grid");
    if (!grids.length) return;
    grids.forEach((grid) => {
      const gridItems = Array.from(grid.querySelectorAll(".card-grid_grid-item"));
      if (!gridItems.length) return;
      const shuffledRows = buildRowGroups(gridItems);
      gsap.set(gridItems, { autoAlpha: 0, y: 20 });
      const scrollDistance = shuffledRows.length * 300;
      const timeline = gsap.timeline({
        scrollTrigger: {
          trigger: grid,
          start: "top 50%",
          end: `+=${scrollDistance}`,
          scrub: true,
          markers: false
        }
      });
      shuffledRows.forEach((rowItems, rowIndex) => {
        const rowStartPosition = rowIndex === 0 ? 0 : `>-0.2`;
        rowItems.forEach((gridItem, itemIndex) => {
          const itemPosition = itemIndex === 0 ? rowStartPosition : "<0.15";
          timeline.to(
            gridItem,
            { autoAlpha: 1, y: 0, duration: 1, ease: "power2.out" },
            itemPosition
          );
        });
      });
    });
  };

  // src/utils/randomImagesFadeIn.ts
  var randomImagesFadeIn = () => {
    const wrapper = document.querySelector(".process_grid-wrapper");
    if (!wrapper) return;
    const sections = Array.from(wrapper.querySelectorAll(".process_compontent"));
    if (!sections.length) return;
    const isMobile = window.matchMedia("(max-width: 991px)").matches;
    if (!isMobile) {
      wrapper.style.display = "block";
    }
    sections.forEach((section) => {
      const headerItems = Array.from(section.querySelectorAll(".process_header-item"));
      const gridItems = Array.from(section.querySelectorAll(".process_grid-item"));
      if (isMobile) {
        gsap.set([...headerItems, ...gridItems], { autoAlpha: 0, y: 20 });
        [...headerItems, ...gridItems].forEach((item) => {
          gsap.to(item, {
            autoAlpha: 1,
            y: 0,
            duration: 0.6,
            ease: "power2.out",
            scrollTrigger: {
              trigger: item,
              start: "top 50%",
              toggleActions: "play none none none"
            }
          });
        });
      } else {
        const shuffledGridItems = [...gridItems].sort(() => Math.random() - 0.5);
        gsap.set([...headerItems, ...gridItems], { autoAlpha: 0, y: 20 });
        const scrollDistance = (headerItems.length + gridItems.length) * 120;
        const sectionTimeline = gsap.timeline({
          scrollTrigger: {
            trigger: section,
            start: "top top",
            end: `+=${scrollDistance}`,
            pin: true,
            pinSpacing: true,
            scrub: true,
            markers: false
          }
        });
        headerItems.forEach((headerItem) => {
          sectionTimeline.to(
            headerItem,
            { autoAlpha: 1, y: 0, duration: 1, ease: "power2.out" },
            "<0.3"
          );
        });
        shuffledGridItems.forEach((gridItem) => {
          sectionTimeline.to(
            gridItem,
            { autoAlpha: 1, y: 0, duration: 1, ease: "power2.out" },
            "<0.3"
          );
        });
      }
    });
  };

  // src/utils/swiperSliders.ts
  var swiperSliders = () => {
    const sliderWrappers = document.querySelectorAll(".swiper_slider");
    if (!sliderWrappers.length) return;
    const heroSplits = /* @__PURE__ */ new Map();
    const getHeroTitles = (slide) => slide.querySelectorAll(".heading-style-h1.hero_title.is-slider");
    const splitHeroTitles = (slide) => {
      const instances = [];
      getHeroTitles(slide).forEach((title) => {
        const split = new SplitText(title, { types: "words, lines" });
        gsap.set(split.lines, { overflow: "hidden" });
        gsap.set(split.words, { y: "110%" });
        instances.push(split);
      });
      if (instances.length) heroSplits.set(slide, instances);
    };
    const hideHeroTitles = (slide) => {
      const instances = heroSplits.get(slide);
      if (!instances) return;
      instances.forEach((split) => {
        gsap.set(split.words, { y: "110%" });
      });
    };
    const revealHeroTitles = (slide) => {
      const instances = heroSplits.get(slide);
      if (!instances) return;
      instances.forEach((split) => {
        gsap.to(split.words, {
          y: "0%",
          duration: 1,
          ease: "power4.out",
          stagger: 0.05
        });
      });
    };
    sliderWrappers.forEach((slider) => {
      const textAnimationSlider = slider.querySelector(".swiper.text-animation");
      const defaultSlider = slider.querySelector(".swiper.default");
      const nextButton = slider.querySelector(".slide-button.swiper-button-next");
      const prevButton = slider.querySelector(".slide-button.swiper-button-prev");
      const splitSlider = slider.querySelector(".swiper.split");
      const children = slider.querySelectorAll(".image-slider_item");
      const pagination = slider.querySelector(".swiper-pagination");
      if (textAnimationSlider) {
        if (children.length === 1) {
          nextButton?.classList.add("hide");
          nextButton?.setAttribute("aria-hidden", "true");
          prevButton?.classList.add("hide");
          prevButton?.setAttribute("aria-hidden", "true");
        }
        new Swiper(textAnimationSlider, {
          loop: true,
          speed: 1e3,
          slidesPerView: 1,
          centeredSlides: true,
          grabCursor: true,
          navigation: {
            nextEl: nextButton,
            prevEl: prevButton
          },
          pagination: {
            el: pagination,
            clickable: true
          },
          on: {
            init: function(swiper) {
              swiper.slides.forEach((slide) => {
                splitHeroTitles(slide);
              });
              const activeSlide = swiper.slides.find(
                (slide) => slide.classList.contains("swiper-slide-active")
              );
              if (activeSlide) revealHeroTitles(activeSlide);
            },
            slideChangeTransitionStart: function(swiper) {
              const previousSlide = swiper.slides[swiper.previousIndex];
              if (previousSlide) hideHeroTitles(previousSlide);
              const activeSlide = swiper.slides[swiper.activeIndex];
              if (activeSlide) revealHeroTitles(activeSlide);
            }
          }
        });
      }
      if (defaultSlider) {
        new Swiper(defaultSlider, {
          loop: true,
          speed: 1e3,
          slidesPerView: 1,
          grabCursor: true,
          pagination: {
            el: pagination,
            clickable: true
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
  };

  // src/utils/teamCardHover.ts
  var DURATION2 = 0.45;
  var EASE2 = "power2.inOut";
  var teamCardHover = () => {
    const cards = Array.from(document.querySelectorAll(".studio-team_card"));
    if (!cards.length) return;
    const isTouchDevice = window.matchMedia("(hover: none)").matches;
    cards.forEach((card) => {
      const description = card.querySelector(".studio-team_card-info p");
      const image = card.querySelector(".studio-team_card img");
      if (!description) return;
      if (isTouchDevice) return;
      gsap.set(description, { autoAlpha: 0, yPercent: 20 });
      card.addEventListener("mouseenter", () => {
        gsap.killTweensOf(description);
        gsap.to(description, { autoAlpha: 1, yPercent: 0, duration: DURATION2, ease: EASE2 });
        gsap.to(image, { scale: 1.1, duration: DURATION2, ease: EASE2 });
      });
      card.addEventListener("mouseleave", () => {
        gsap.killTweensOf(description);
        gsap.to(description, { autoAlpha: 0, yPercent: 20, duration: DURATION2, ease: EASE2 });
        gsap.to(image, { scale: 1, duration: DURATION2, ease: EASE2 });
      });
    });
  };

  // src/utils/teamLeaders.ts
  var DURATION3 = 0.1;
  function getRandomX() {
    const minX = window.innerWidth * 0.2;
    const maxX = window.innerWidth * 0.6;
    return Math.floor(minX + Math.random() * (maxX - minX));
  }
  var teamLeaders = () => {
    const mobileMediaQuery = window.matchMedia("(max-width: 991px)");
    const listItems = Array.from(document.querySelectorAll(".studio-team-list_item"));
    if (!listItems.length) return;
    let activeMobileItem = null;
    listItems.forEach((item) => {
      const figure = item.querySelector(".studio-team_floating-figure");
      if (!figure) return;
      gsap.set(figure, { autoAlpha: 0, border: "1px solid #717171", zIndex: 1e3 });
      item.addEventListener("mouseenter", () => {
        if (mobileMediaQuery.matches) return;
        const randomX = getRandomX();
        gsap.set(figure, { left: randomX });
        gsap.to(figure, { autoAlpha: 1, duration: DURATION3, ease: "power2.out" });
      });
      console.log("test");
      item.addEventListener("mouseleave", () => {
        if (mobileMediaQuery.matches) return;
        gsap.to(figure, { autoAlpha: 0, duration: DURATION3, ease: "none" });
      });
      item.addEventListener("click", () => {
        if (!mobileMediaQuery.matches) return;
        if (activeMobileItem === figure) {
          gsap.to(figure, { autoAlpha: 0, duration: DURATION3, ease: "power2.in" });
          activeMobileItem = null;
          return;
        }
        if (activeMobileItem) {
          gsap.to(activeMobileItem, { autoAlpha: 0, duration: DURATION3, ease: "power2.in" });
        }
        gsap.set(figure, { left: "auto", right: 16 });
        gsap.to(figure, { autoAlpha: 1, duration: DURATION3, ease: "power2.out" });
        activeMobileItem = figure;
      });
    });
  };

  // src/utils/videoPlayPauseToggle.ts
  var VISIBLE_CLASS = "is-visible";
  function applyPreference(prefersReducedMotion) {
    const buttons = document.querySelectorAll(".video-play-pause");
    buttons.forEach((button) => {
      button.classList.toggle(VISIBLE_CLASS, prefersReducedMotion);
    });
  }
  var videoPlayPauseToggle = () => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    applyPreference(mediaQuery.matches);
    mediaQuery.addEventListener("change", (event) => {
      applyPreference(event.matches);
    });
  };

  // src/utils/viewSwitcher.ts
  var STORAGE_KEY = "nga-works-view";
  var DEFAULT_VIEW = "grid";
  var viewSwitcher = () => {
    const toggles = document.querySelectorAll("[data-view]");
    const wrappers = document.querySelectorAll(".works-list-wrapper");
    if (!toggles.length || wrappers.length < 2) return;
    let listWrapper = null;
    let gridWrapper = null;
    wrappers.forEach((wrapper) => {
      if (wrapper.classList.contains("u-row-view")) {
        listWrapper = wrapper;
      } else {
        gridWrapper = wrapper;
      }
    });
    if (!listWrapper || !gridWrapper) return;
    const resolvedListWrapper = listWrapper;
    const resolvedGridWrapper = gridWrapper;
    const saved = localStorage.getItem(STORAGE_KEY);
    const initialView = saved === "list" || saved === "grid" ? saved : DEFAULT_VIEW;
    function applyView(view) {
      resolvedListWrapper.classList.toggle("is-active", view === "list");
      resolvedGridWrapper.classList.toggle("is-active", view === "grid");
      toggles.forEach((toggle) => {
        toggle.classList.toggle("is-active", toggle.getAttribute("data-view") === view);
      });
      localStorage.setItem(STORAGE_KEY, view);
    }
    applyView(initialView);
    toggles.forEach((toggle) => {
      toggle.addEventListener("click", (event) => {
        event.preventDefault();
        const view = toggle.getAttribute("data-view");
        if (view) applyView(view);
      });
    });
  };

  // src/utils/worksCardHover.ts
  var worksCardHover = () => {
    const desktopMediaQuery = window.matchMedia("(min-width: 992px)");
    const cardItems = document.querySelectorAll(".works_list-item");
    const isMobile = window.matchMedia("(max-width: 767px)").matches;
    cardItems.forEach((card) => {
      const overlay = card.querySelector(".works_content-wrapper .overlay");
      const contentWrapper = card.querySelector(".works_content");
      const image = card.querySelector("img");
      if (isMobile) {
        gsap.set(contentWrapper, { autoAlpha: 1, y: 0 });
        gsap.set(overlay, { autoAlpha: 1 });
        return;
      }
      if (!overlay || !contentWrapper) return;
      gsap.set(overlay, { autoAlpha: 0 });
      gsap.set(contentWrapper, { autoAlpha: 0, y: -12 });
      gsap.set(image?.parentElement, { overflow: "hidden" });
      card.addEventListener("mouseenter", () => {
        if (!desktopMediaQuery.matches) return;
        gsap.to(overlay, { autoAlpha: 1, duration: 0.4, ease: "power2.out" });
        gsap.to(contentWrapper, { autoAlpha: 1, y: 0, duration: 0.4, ease: "power2.out" });
        if (image) gsap.to(image, { scale: 1.1, duration: 0.4, ease: "power2.out" });
      });
      card.addEventListener("mouseleave", () => {
        if (!desktopMediaQuery.matches) return;
        gsap.to(overlay, { autoAlpha: 0, duration: 0.4, ease: "power2.in" });
        gsap.to(contentWrapper, { autoAlpha: 0, y: -12, duration: 0.4, ease: "power2.in" });
        if (image) gsap.to(image, { scale: 1, duration: 0.4, ease: "power2.in" });
      });
      desktopMediaQuery.addEventListener("change", (event) => {
        if (!event.matches) {
          gsap.set(overlay, { autoAlpha: 1, clearProps: "opacity,visibility" });
          gsap.set(contentWrapper, {
            autoAlpha: 1,
            y: 0,
            clearProps: "opacity,visibility,transform"
          });
          if (image) gsap.set(image, { scale: 1, clearProps: "transform" });
        } else {
          gsap.set(overlay, { autoAlpha: 0 });
          gsap.set(contentWrapper, { autoAlpha: 0, y: -12 });
        }
      });
    });
  };

  // src/index.ts
  window.Webflow ||= [];
  window.Webflow.push(() => {
    gsapSmoothScroll();
    heroTextReveal();
    swiperSliders();
    navToggle();
    navTheme();
    buttonIconHover();
    teamCardHover();
    teamLeaders();
    worksCardHover();
    generalImageHover();
    officeCardTabs();
    accordion();
    modals();
    currentYear();
    videoPlayPauseToggle();
    viewSwitcher();
    cmsFilterLinks();
    filterActiveState();
    document.querySelectorAll('img[loading="lazy"]').forEach((img) => {
      img.loading = "eager";
    });
    waitForAllImages(() => {
      gsapBasicAnimations();
      generalScrollTextReveal();
      homeTextSticky();
      publicationsGridFade();
      randomImagesFadeIn();
      careersStackingCards();
      proccessSlider();
    });
  });
  var waitForAllImages = (onReady) => {
    const pending = Array.from(document.images).filter(
      (img) => !(img.complete && img.naturalWidth > 0)
    );
    if (pending.length === 0) {
      onReady();
      return;
    }
    let remaining = pending.length;
    const done = () => {
      if (--remaining === 0) onReady();
    };
    pending.forEach((img) => {
      img.addEventListener("load", done, { once: true });
      img.addEventListener("error", done, { once: true });
    });
  };
})();
//# sourceMappingURL=index.js.map
