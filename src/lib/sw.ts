/**
 * Registers the offline service worker (public/sw.js). Production only: a worker
 * in dev would cache Vite's module graph and fight HMR. The build id in the query
 * string makes every deploy a new script URL, so updates install without waiting
 * for the browser's 24-hour script check.
 */
export function registerServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  if (!import.meta.env.PROD) return;
  const register = () => {
    navigator.serviceWorker.register(`/sw.js?v=${__BUILD_ID__}`).catch(() => {
      // offline support is a nicety; the game works without it
    });
  };
  if (document.readyState === "complete") register();
  else window.addEventListener("load", register, { once: true });
}
