/**
 * Webflow boot-queue global. Populated by Webflow's own runtime — the bundle
 * pushes its init into `window.Webflow` and Webflow invokes it after DOMContentLoaded.
 */
interface WebflowQueue extends Array<() => void> {
  push: (callback: () => void) => number;
}

interface Window {
  Webflow?: WebflowQueue;
}
