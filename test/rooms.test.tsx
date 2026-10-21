// @vitest-environment happy-dom
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { SiteHeader } from '../src/react.js';
import { ROOMS, ROOM_IDS, roomHref, setRoomsLocale } from '../src/rooms.js';
import { renderSiteHeader } from '../src/site-header.js';
import { normalise, parse } from './dom.js';

const header = (currentHref?: string) =>
  parse(
    renderSiteHeader({
      brand: { href: '/', label: 'KHE' },
      rooms: { current: 'trips', locale: 'en', ...(currentHref === undefined ? {} : { currentHref }) },
      locales: [{ code: 'en', label: 'EN' }],
      activeLocale: 'en',
      languageLabel: 'Language',
    }),
  );

describe('ROOMS', () => {
  it('lists the five rooms in order', () => {
    expect(ROOM_IDS).toEqual(['home', 'games', 'house', 'trips', 'server']);
    expect(ROOMS.map((room) => room.id)).toEqual([...ROOM_IDS]);
  });

  it('names and notes every room in both locales, and gives it a public https address', () => {
    for (const room of ROOMS) {
      for (const locale of ['et', 'en'] as const) {
        expect(room.name[locale]).toMatch(/\S/);
        expect(room.note[locale]).toMatch(/\S/);
      }
      expect(room.href).toMatch(/^https:\/\/(?:games\.)?khe\.ee\/(?:[a-z]+\/)?$/);
    }
  });
});

describe('roomHref', () => {
  it('adds the lang parameter', () => {
    expect(roomHref('home', 'et')).toBe('https://khe.ee/?lang=et');
    expect(roomHref('server', 'en')).toBe('https://khe.ee/architecture/?lang=en');
  });

  it('refuses an unknown room or locale', () => {
    expect(() => roomHref('attic' as never, 'et')).toThrow(/unknown room attic/);
    expect(() => roomHref('home', 'fi' as never)).toThrow(/unknown locale fi/);
  });
});

describe('setRoomsLocale', () => {
  it('rewrites the button, both labels, every name, note and href', () => {
    const doc = header();
    setRoomsLocale(doc, 'et');
    expect(doc.querySelector('.site-header__rooms')!.textContent).toBe('Reisipäevik');
    expect(doc.querySelector('.site-header__rooms')!.getAttribute('aria-label')).toBe('Reisipäevik, Toad');
    expect(doc.querySelector('.site-header__rooms-menu')!.getAttribute('aria-label')).toBe('Toad');
    const items = [...doc.querySelectorAll('a.site-header__room')];
    expect(items.map((item) => item.querySelector('.site-header__room-name')!.textContent)).toEqual(ROOMS.map((room) => room.name.et));
    expect(items.map((item) => item.querySelector('.site-header__room-note')!.textContent)).toEqual(ROOMS.map((room) => room.note.et));
    expect(items.map((item) => item.getAttribute('aria-label'))).toEqual(ROOMS.map((room) => `${room.name.et}, ${room.note.et}`));
    expect(items.map((item) => item.getAttribute('href'))).toEqual(ROOM_IDS.map((id) => roomHref(id, 'et')));
    expect(doc.querySelector('[aria-current="true"]')!.getAttribute('data-khe-room')).toBe('trips');
    setRoomsLocale(doc, 'en');
    expect(doc.querySelector('.site-header__rooms')!.getAttribute('aria-label')).toBe('Travel journal, Rooms');
    expect(items[0]!.getAttribute('aria-label')).toBe('Home, The front page');
    expect(items[0]!.getAttribute('href')).toBe('https://khe.ee/?lang=en');
  });

  it('gives the same menu as a fresh render in that locale, from either renderer', () => {
    const options = {
      brand: { href: '/', label: 'KHE' },
      locales: [{ code: 'en', label: 'EN' }],
      activeLocale: 'en',
      languageLabel: 'Language',
    };
    const menu = (doc: ParentNode) => doc.querySelector('.site-header__rooms')!.outerHTML + doc.querySelector('.site-header__rooms-menu')!.outerHTML;
    const fresh = parse(renderSiteHeader({ ...options, rooms: { current: 'games', locale: 'et' } }));
    const switched = parse(renderSiteHeader({ ...options, rooms: { current: 'games', locale: 'en' } }));
    setRoomsLocale(switched, 'et');
    expect(menu(switched)).toBe(menu(fresh));
    const react = parse(renderToStaticMarkup(<SiteHeader {...options} rooms={{ current: 'games', locale: 'en' }} />));
    setRoomsLocale(react, 'et');
    expect(normalise(menu(react)).replace(/ popoverTarget="/, ' popovertarget="')).toBe(normalise(menu(fresh)));
  });

  it('leaves the href of the app\'s own item alone', () => {
    const doc = header('/');
    setRoomsLocale(doc, 'et');
    const trips = doc.querySelector('a[data-khe-room="trips"]')!;
    expect(trips.getAttribute('href')).toBe('/');
    expect(trips.querySelector('.site-header__room-name')!.textContent).toBe('Reisipäevik');
    expect(doc.querySelector('a[data-khe-room="home"]')!.getAttribute('href')).toBe('https://khe.ee/?lang=et');
  });

  it('refuses an unknown locale and leaves the menu as it was', () => {
    const doc = header();
    expect(() => setRoomsLocale(doc, 'fi' as never)).toThrow(/unknown locale fi/);
    expect(doc.querySelector('.site-header__rooms-menu')!.getAttribute('aria-label')).toBe('Rooms');
  });

  it('refuses an unknown room before writing anything', () => {
    const doc = header();
    doc.querySelector('a[data-khe-room="server"]')!.setAttribute('data-khe-room', 'attic');
    expect(() => setRoomsLocale(doc, 'et')).toThrow(/unknown room attic/);
    expect(doc.querySelector('.site-header__rooms')!.getAttribute('aria-label')).toBe('Travel journal, Rooms');
    expect(doc.querySelector('a[data-khe-room="home"]')!.getAttribute('aria-label')).toBe('Home, The front page');
    expect(doc.querySelector('a[data-khe-room="home"]')!.getAttribute('href')).toBe('https://khe.ee/?lang=en');
  });

  it('does nothing on a page without the menu', () => {
    const doc = parse('<header class="site-header"></header>');
    expect(() => setRoomsLocale(doc, 'et')).not.toThrow();
  });
});
