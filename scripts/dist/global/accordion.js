"use strict";
(() => {
  (function() {
    "use strict";
    document.addEventListener("DOMContentLoaded", () => {
      const accordionTriggers = document.querySelectorAll(".accordion_header");
      if (!accordionTriggers.length) return;
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
        item.addEventListener("click", (e) => {
          e.preventDefault();
          const content = contentWrapper.querySelector(".accordion_content");
          if (!content) return;
          toggleAccordion(item, content.offsetHeight);
        });
      });
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
    });
  })();
})();
