type HappyWindow = Window & { happyDOM: { settings: { device: { prefersColorScheme: string } } } };

/** Sets the emulated system theme; happy-dom fires the media query's change on resize. */
export function setSystem(scheme: 'light' | 'dark') {
  (window as unknown as HappyWindow).happyDOM.settings.device.prefersColorScheme = scheme;
  window.dispatchEvent(new Event('resize'));
}

/** The string renderers indent; React writes no whitespace between tags. */
export const normalise = (html: string) => html.replace(/>\s+</g, '><').trim();

export const parse = (html: string) => new DOMParser().parseFromString(html, 'text/html');
