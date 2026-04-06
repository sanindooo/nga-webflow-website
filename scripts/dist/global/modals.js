"use strict";
(() => {
  (function() {
    "use strict";
    const __s = window.__loadedScripts ?? (window.__loadedScripts = {});
    if (__s["modals"]) return;
    __s["modals"] = true;
    document.addEventListener("DOMContentLoaded", () => {
      const modalButtons = document.querySelectorAll('[button-function="modal-open"]');
      modalButtons.forEach((button) => {
        button.addEventListener("click", (e) => {
          e.preventDefault();
          const type = button.getAttribute("button-function-arg1");
          const name = button.getAttribute("button-function-arg2");
          const modal = document.querySelector(`[modal][modal-type="${type}"][modal-name="${name}"]`);
          modal?.setAttribute("is-open", "");
          document.body.style.top = `-${window.scrollY}px`;
          document.body.classList.add("no-scroll");
          window.stopSmoothScroll?.();
        });
      });
      const modalCloseButtons = document.querySelectorAll("[modal-close]");
      modalCloseButtons.forEach((button) => {
        button.addEventListener("click", (e) => {
          e.preventDefault();
          const scrollY = Math.abs(parseInt(document.body.style.top || "0"));
          button.closest("[modal]")?.removeAttribute("is-open");
          document.body.classList.remove("no-scroll");
          document.body.style.top = "";
          window.scrollTo(0, scrollY);
          window.startSmoothScroll?.();
        });
      });
    });
  })();
})();
