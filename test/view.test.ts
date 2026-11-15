// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest';
import { ROOMS } from '../src/rooms.js';
import { FRAME_FOR_MS, checkedProductRoot, viewInitScript } from '../src/view.js';

const ROOT = '/stories/';
const KEY = `khe-view:${ROOT}`;
const NOW = 1_800_000_000_000;
const html = document.documentElement;

interface Visit {
  readonly referrer?: string;
  readonly origin?: string;
  readonly installed?: 'media' | 'ios';
  readonly storage?: Storage;
  readonly now?: number;
}

// The script reads only globals, so each visit hands it its own as parameters.
function load({ referrer = '', origin = 'https://khe.ee', installed, storage = window.sessionStorage, now = NOW }: Visit = {}) {
  html.removeAttribute('data-khe-view');
  const globals = {
    sessionStorage: storage,
    Date: { now: () => now },
    document: { referrer, documentElement: html },
    location: { origin },
    matchMedia: (query: string) => ({ matches: installed === 'media' && query === '(display-mode: standalone)' }),
    navigator: installed === 'ios' ? { standalone: true } : {},
  };
  new Function(...Object.keys(globals), viewInitScript(ROOT))(...Object.values(globals));
  return html.getAttribute('data-khe-view') === 'product' ? 'product' : 'frame';
}

const blocked = {
  getItem() {
    throw new DOMException('blocked', 'SecurityError');
  },
  setItem() {
    throw new DOMException('blocked', 'SecurityError');
  },
} as unknown as Storage;

afterEach(() => {
  window.sessionStorage.clear();
  html.removeAttribute('data-khe-view');
});

describe('viewInitScript', () => {
  it('shows the frame when the tab came from khe.ee or the games hub', () => {
    expect(load({ referrer: 'https://khe.ee/' })).toBe('frame');
    window.sessionStorage.clear();
    expect(load({ referrer: 'https://games.khe.ee/', origin: 'https://games.khe.ee' })).toBe('frame');
    window.sessionStorage.clear();
    expect(load({ referrer: 'https://games.khe.ee/' })).toBe('frame');
  });

  it('shows the frame from a page on its own origin outside its root', () => {
    expect(load({ referrer: 'https://khe.ee/ha/' })).toBe('frame');
    window.sessionStorage.clear();
    expect(load({ referrer: 'http://localhost:8080/', origin: 'http://localhost:8080' })).toBe('frame');
  });

  it('shows the product view from its own path, another site or no referrer', () => {
    expect(load({ referrer: 'https://khe.ee/stories/' })).toBe('product');
    expect(load({ referrer: 'https://khe.ee/stories/?lang=en' })).toBe('product');
    expect(load({ referrer: 'https://khe.ee/stories' })).toBe('product');
    expect(load({ referrer: 'https://example.com/' })).toBe('product');
    expect(load({ referrer: 'https://khe.ee/', origin: 'http://localhost:8080' })).toBe('frame');
    window.sessionStorage.clear();
    expect(load()).toBe('product');
    expect(window.sessionStorage.getItem(KEY)).toBeNull();
  });

  it('keeps the frame for the tab across a reload without referrer', () => {
    load({ referrer: 'https://khe.ee/' });
    expect(window.sessionStorage.getItem(KEY)).toBe(String(NOW));
    expect(load({ now: NOW + 60_000 })).toBe('frame');
    expect(load({ referrer: 'https://khe.ee/stories/', now: NOW + 120_000 })).toBe('frame');
  });

  it('gives the product view once the frame time is 30 minutes old', () => {
    window.sessionStorage.setItem(KEY, String(NOW - FRAME_FOR_MS));
    expect(load()).toBe('product');
    window.sessionStorage.setItem(KEY, String(NOW - FRAME_FOR_MS + 1));
    expect(load()).toBe('frame');
  });

  it('renews the frame time on every frame load', () => {
    load({ referrer: 'https://khe.ee/' });
    load({ now: NOW + FRAME_FOR_MS - 1 });
    expect(window.sessionStorage.getItem(KEY)).toBe(String(NOW + FRAME_FOR_MS - 1));
    expect(load({ now: NOW + FRAME_FOR_MS + 1000 })).toBe('frame');
  });

  it('reads a stored value that is not a past time as none', () => {
    for (const junk of ['frame', '', '-5', String(NOW + 1000)]) {
      window.sessionStorage.setItem(KEY, junk);
      expect(load()).toBe('product');
    }
  });

  it('shows the product view when installed, whatever is stored', () => {
    window.sessionStorage.setItem(KEY, String(NOW));
    expect(load({ installed: 'media', referrer: 'https://khe.ee/' })).toBe('product');
    expect(load({ installed: 'ios', referrer: 'https://khe.ee/' })).toBe('product');
  });

  it('shows the product view when storage throws', () => {
    expect(load({ storage: blocked, referrer: 'https://khe.ee/' })).toBe('product');
  });

  it('counts every origin of the rooms list as a frame page', () => {
    for (const origin of new Set(ROOMS.map((room) => new URL(room.href).origin))) {
      window.sessionStorage.clear();
      expect(load({ referrer: `${origin}/`, origin: 'https://example.com' }), origin).toBe('frame');
    }
  });

  // Run as an inline script runs, in the global scope, where a var would become a global.
  it('declares no global name', () => {
    const before = new Set(Object.getOwnPropertyNames(globalThis));
    (0, eval)(viewInitScript(ROOT));
    expect(Object.getOwnPropertyNames(globalThis).filter((name) => !before.has(name))).toEqual([]);
    (0, eval)(viewInitScript(ROOT).replace(/^\(function\(\)\{|\}\)\(\)$/g, ''));
    expect(Object.getOwnPropertyNames(globalThis).filter((name) => !before.has(name))).toContain('f');
  });

  it('refuses a root it could not put into the script as it is', () => {
    for (const root of ['stories', '/stories', 'stories/', '/', '/Stories/', '/a/b/', "/x'/", '/st ories/']) {
      expect(() => viewInitScript(root)).toThrow(TypeError);
      expect(() => checkedProductRoot(root)).toThrow(TypeError);
    }
    expect(checkedProductRoot('/house-3d/')).toBe('/house-3d/');
  });
});
