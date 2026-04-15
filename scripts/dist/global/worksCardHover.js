"use strict";
(() => {
  (function() {
    "use strict";
    const __s = window.__loadedScripts ?? (window.__loadedScripts = {});
    if (__s["worksCardHover"]) return;
    __s["worksCardHover"] = true;
    const desktopMediaQuery = window.matchMedia("(min-width: 992px)");
    function applyDesktopStyles(card, overlay, contentWrapper) {
      overlay.style.opacity = "0";
      overlay.style.transition = "opacity 0.4s ease";
      contentWrapper.style.transform = "translateY(-12px)";
      contentWrapper.style.opacity = "0";
      contentWrapper.style.transition = "transform 0.4s ease, opacity 0.4s ease";
    }
    function removeDesktopStyles(overlay, contentWrapper) {
      overlay.style.opacity = "";
      overlay.style.transition = "";
      contentWrapper.style.transform = "";
      contentWrapper.style.opacity = "";
      contentWrapper.style.transition = "";
    }
    function init() {
      const cardItems = document.querySelectorAll(".works_list-item");
      cardItems.forEach((card) => {
        const overlay = card.querySelector(".works_content-wrapper .overlay");
        const contentWrapper = card.querySelector(".works_content");
        if (!overlay || !contentWrapper) return;
        if (desktopMediaQuery.matches) {
          applyDesktopStyles(card, overlay, contentWrapper);
        }
        card.addEventListener("mouseenter", () => {
          if (!desktopMediaQuery.matches) return;
          overlay.style.opacity = "1";
          contentWrapper.style.transform = "translateY(0)";
          contentWrapper.style.opacity = "1";
        });
        card.addEventListener("mouseleave", () => {
          if (!desktopMediaQuery.matches) return;
          overlay.style.opacity = "0";
          contentWrapper.style.transform = "translateY(-12px)";
          contentWrapper.style.opacity = "0";
        });
        desktopMediaQuery.addEventListener("change", (event) => {
          if (event.matches) {
            applyDesktopStyles(card, overlay, contentWrapper);
          } else {
            removeDesktopStyles(overlay, contentWrapper);
          }
        });
      });
    }
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", init);
    } else {
      init();
    }
  })();
})();
