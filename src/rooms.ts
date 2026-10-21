// The KHE rooms the header's rooms menu lists (estate ADR-018), in order. Imports
// nothing and touches no DOM at load, so khe-sites can serve dist/rooms.js as it is.

export type RoomLocale = 'et' | 'en';

export const ROOM_IDS = ['home', 'games', 'house', 'trips', 'server'] as const;

export type RoomId = (typeof ROOM_IDS)[number];

export interface Room {
  readonly id: RoomId;
  readonly name: Readonly<Record<RoomLocale, string>>;
  /** A short line under the name. */
  readonly note: Readonly<Record<RoomLocale, string>>;
  /** The public address, without `lang`. */
  readonly href: string;
}

export const ROOMS: readonly Room[] = [
  { id: 'home', name: { et: 'Kodu', en: 'Home' }, note: { et: 'Avaleht', en: 'The front page' }, href: 'https://khe.ee/' },
  {
    id: 'games',
    name: { et: 'Mängud', en: 'Games' },
    note: { et: 'Õppemängud ja AI Seiklus', en: 'Learning games and AI Adventure' },
    href: 'https://games.khe.ee/',
  },
  {
    id: 'house',
    name: { et: 'Koduautomaatika', en: 'Home automation' },
    note: { et: 'Maja juhtimine, demo', en: 'Running the house, a demo' },
    href: 'https://khe.ee/ha/',
  },
  {
    id: 'trips',
    name: { et: 'Reisipäevik', en: 'Travel journal' },
    note: { et: 'Reisid kaardil, demo', en: 'Trips on a map, a demo' },
    href: 'https://khe.ee/trips/',
  },
  {
    id: 'server',
    name: { et: 'Koduserver', en: 'The home server' },
    note: { et: 'Kuidas see kõik töötab', en: 'How all of this runs' },
    href: 'https://khe.ee/architecture/',
  },
];

/** The list's accessible name, also the end of the button's, after the room name. */
export const ROOMS_LABEL: Readonly<Record<RoomLocale, string>> = { et: 'Toad', en: 'Rooms' };

/** @internal Shared with the renderers; not part of the contract. */
export function checkedRoomLocale(locale: string): RoomLocale {
  if (locale !== 'et' && locale !== 'en') throw new TypeError(`rooms: unknown locale ${locale}`);
  return locale;
}

/** @internal Shared with the renderers; not part of the contract. */
export function roomById(id: string): Room {
  const room = ROOMS.find((candidate) => candidate.id === id);
  if (!room) throw new TypeError(`rooms: unknown room ${id}`);
  return room;
}

// Labels rather than visually hidden text: Chrome puts a space between the flex and grid
// items of the button and the links, so hidden text would read "Games , Rooms".

/** @internal The button's accessible name, e.g. "Games, Rooms". */
export function roomsButtonName(room: Room, locale: RoomLocale): string {
  return `${room.name[locale]}, ${ROOMS_LABEL[locale]}`;
}

/** @internal A room link's accessible name, e.g. "Home, The front page". */
export function roomItemName(room: Room, locale: RoomLocale): string {
  return `${room.name[locale]}, ${room.note[locale]}`;
}

/** @internal `room.href` with `lang`, for a room and locale already checked. */
export function hrefWithLang(room: Room, locale: RoomLocale): string {
  return `${room.href}?lang=${locale}`;
}

/** The room's public address with `?lang=<locale>`, which khe-sites, khe-trips and khe-study read. */
export function roomHref(room: RoomId, locale: RoomLocale): string {
  return hrefWithLang(roomById(room), checkedRoomLocale(locale));
}

/**
 * Rewrites a rendered rooms menu inside `root` to `locale`: the button's room name and
 * label, the list's label, every room's name, note and label, and every href but the one an
 * app set itself (`data-khe-room-own`). For a page that switches language without
 * re-rendering the header.
 */
export function setRoomsLocale(root: ParentNode, locale: RoomLocale): void {
  const lang = checkedRoomLocale(locale);
  // Every room is looked up before anything is written, so an unknown one leaves the menu whole.
  const buttons = [...root.querySelectorAll<HTMLElement>('.site-header__rooms[data-khe-room]')].map((button) => ({
    button,
    room: roomById(button.dataset.kheRoom ?? ''),
  }));
  const items = [...root.querySelectorAll<HTMLAnchorElement>('.site-header__room[data-khe-room]')].map((item) => ({
    item,
    room: roomById(item.dataset.kheRoom ?? ''),
  }));
  for (const { button, room } of buttons) {
    const name = button.querySelector('.site-header__rooms-name');
    if (name) name.textContent = room.name[lang];
    button.setAttribute('aria-label', roomsButtonName(room, lang));
  }
  for (const menu of root.querySelectorAll('.site-header__rooms-menu')) menu.setAttribute('aria-label', ROOMS_LABEL[lang]);
  for (const { item, room } of items) {
    const name = item.querySelector('.site-header__room-name');
    if (name) name.textContent = room.name[lang];
    const note = item.querySelector('.site-header__room-note');
    if (note) note.textContent = room.note[lang];
    item.setAttribute('aria-label', roomItemName(room, lang));
    if (!item.hasAttribute('data-khe-room-own')) item.setAttribute('href', hrefWithLang(room, lang));
  }
}
