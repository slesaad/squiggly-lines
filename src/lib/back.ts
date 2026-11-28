declare global {
  interface Window {
    /** Set by BaseLayout once Astro has done a client-side (in-site) navigation. */
    __sqSoftNav?: boolean;
  }
}

/** True when the previous page in this tab was part of this site. */
function cameFromThisSite(): boolean {
  if (window.__sqSoftNav) return true;
  try {
    return !!document.referrer && new URL(document.referrer).origin === location.origin;
  } catch {
    return false;
  }
}

/**
 * Click handler for "go back" links. Returns to the previous page only when
 * it was on this site (so a visitor arriving from Instagram or Google isn't
 * sent off the site); otherwise lets the link's own href (/posts/) work.
 */
export function goBack(e: MouseEvent) {
  if (cameFromThisSite() && window.history.length > 1) {
    e.preventDefault();
    window.history.back();
  }
}
