"use strict";
(() => {
  (function() {
    "use strict";
    const __s = window.__loadedScripts ?? (window.__loadedScripts = {});
    if (__s["viewSwitcher"]) return;
    __s["viewSwitcher"] = true;
    const STORAGE_KEY = "nga-works-view";
    const DEFAULT_VIEW = "grid";
    function init() {
      const toggles = document.querySelectorAll("[data-view]");
      const wrappers = document.querySelectorAll(".works-list-wrapper");
      if (!toggles.length || wrappers.length < 2) return;
      let listWrapper = null;
      let gridWrapper = null;
      wrappers.forEach((w) => {
        if (w.classList.contains("u-row-view")) {
          listWrapper = w;
        } else {
          gridWrapper = w;
        }
      });
      if (!listWrapper || !gridWrapper) return;
      const saved = localStorage.getItem(STORAGE_KEY);
      const initialView = saved === "list" || saved === "grid" ? saved : DEFAULT_VIEW;
      function applyView(view) {
        ;
        listWrapper.classList.toggle("is-active", view === "list");
        gridWrapper.classList.toggle("is-active", view === "grid");
        toggles.forEach((t) => {
          t.classList.toggle("is-active", t.getAttribute("data-view") === view);
        });
        localStorage.setItem(STORAGE_KEY, view);
      }
      applyView(initialView);
      toggles.forEach((toggle) => {
        toggle.addEventListener("click", (e) => {
          e.preventDefault();
          const view = toggle.getAttribute("data-view");
          if (view) applyView(view);
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
