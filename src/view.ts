// The portfolio frame and the product view (estate ADR-030): a product page shows the
// KHE frame while this tab came from a frame page in the last 30 minutes, else its own
// header. Imports nothing and touches no DOM at load, like theme.ts: a build imports it
// in Node, and the decision runs as an inline script before first paint.

/** The usual length of a web visit: a frame time older than this gives the product view. */
export const FRAME_FOR_MS = 30 * 60 * 1000;

// Validated so viewInitScript can put the root into a script without escaping.
/** A product's path, e.g. `/stories/`: one lower-case segment with both slashes. */
export function checkedProductRoot(root: string): string {
  if (!/^\/[a-z0-9-]+\/$/.test(root)) throw new TypeError(`view: product root ${root} is not one lower-case path segment between slashes`);
  return root;
}

/**
 * The script for an inline `<script>` in `<head>`, before the first stylesheet, on a
 * product page under `root`. It keeps the frame while `sessionStorage['khe-view:' +
 * root]` holds a time under 30 minutes old, or when the referrer is a frame page (on
 * this origin outside `root`, or on khe.ee or games.khe.ee), and then stores the time
 * of this load; otherwise, always when installed, and on blocked storage, it sets
 * `data-khe-view="product"` on `<html>`. Self-contained; it needs nothing else from
 * this module.
 */
export function viewInitScript(root: string): string {
  const path = checkedProductRoot(root);
  // In a function, so no name lands on window, where a page's own top-level let would
  // clash with it. f: the frame shows. A same-origin referrer counts outside the root, a
  // cross-origin one only from the two portfolio origins.
  return (
    `(function(){var f=false;try{var R='${path}',k='khe-view:'+R,s=sessionStorage,n=Date.now(),t=Number(s.getItem(k)),r=document.referrer,u,p;` +
    `f=t>0&&t<=n&&n-t<${FRAME_FOR_MS};` +
    `if(!f&&r){u=new URL(r);p=u.pathname;` +
    `f=u.origin===location.origin?p.indexOf(R)!==0&&p+'/'!==R:u.origin==='https://khe.ee'||u.origin==='https://games.khe.ee'}` +
    `if(f&&(matchMedia('(display-mode: standalone)').matches||navigator.standalone===true))f=false;` +
    `if(f)s.setItem(k,String(n))}catch(e){f=false}` +
    `if(!f)document.documentElement.setAttribute('data-khe-view','product')})()`
  );
}
