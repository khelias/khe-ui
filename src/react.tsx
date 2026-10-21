import { Fragment, type ReactNode, useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import {
  type Icon,
  type Pairs,
  type SiteFooterBaseOptions,
  type SiteHeaderBaseOptions,
  prepareFooter,
  prepareHeader,
} from './core.js';
import { type ThemeOverride, applyThemeOverride, onSystemDarkChange, readThemeOverride, showsDark, systemDark, toggledOverride } from './theme.js';

export type {
  Attrs,
  SiteFooterLine,
  SiteFooterLink,
  SiteFooterPartAttrs,
  SiteHeaderContext,
  SiteHeaderLocale,
  SiteHeaderPartAttrs,
  SiteHeaderRooms,
} from './core.js';

export interface SiteHeaderProps<Code extends string = string> extends SiteHeaderBaseOptions<ReactNode, Code> {
  /** Rendered in front of the theme toggle and the language switcher. */
  readonly actions?: ReactNode;
  /** Controlled like the locale: `dark` is what shows, `onToggle` asks the app to flip it. */
  readonly themeToggle?: { readonly label: string; readonly dark: boolean; readonly onToggle: () => void };
  /** Called with the code of a locale button that is not the active one. */
  readonly onLocaleChange?: (code: Code) => void;
}

export type SiteFooterProps = SiteFooterBaseOptions<ReactNode>;

// HTML names React spells otherwise; React 19 warns on the lower-case popovertarget.
const REACT_NAMES: Readonly<Record<string, string>> = { class: 'className', popovertarget: 'popoverTarget' };

const props = (pairs: Pairs) => Object.fromEntries(pairs.map(([name, value]) => [REACT_NAMES[name] ?? name, value]));

function IconSvg({ icon }: { icon: Icon }) {
  return (
    <svg {...props(icon.attrs)}>
      {icon.paths.map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}

/**
 * The KHE site header. Controlled: the app owns the locale, its storage and the URL,
 * and passes the active one back in; the same for the theme, see `useThemeOverride`.
 */
export function SiteHeader<Code extends string = string>(options: SiteHeaderProps<Code>) {
  const { headerClass, brand, rooms, slash, title, theme, switcher, buttons } = prepareHeader(options, options.themeToggle?.dark === true);
  const { actions, themeToggle, activeLocale, onLocaleChange } = options;
  const Title = title?.tag;

  return (
    <header className={headerClass}>
      <div className="site-header__inner">
        <a {...props(brand)}>
          <span>KHE</span>
          <span className="brand-mark__suffix">.ee</span>
        </a>
        {rooms ? (
          <>
            <button {...props(rooms.button)}>
              <span className="site-header__rooms-name">{rooms.name}</span>
              <span className="site-header__sr">{rooms.label}</span>
              <IconSvg icon={rooms.chevron} />
            </button>
            <nav {...props(rooms.menu)}>
              <ul>
                {rooms.items.map((item) => (
                  <li key={item.id}>
                    <a {...props(item.attrs)}>
                      <span className="site-header__room-dot" aria-hidden="true" />
                      <span className="site-header__room-name">{item.name}</span>
                      <span className="site-header__sr">, </span>
                      <span className="site-header__room-note">{item.note}</span>
                      {item.check ? <IconSvg icon={item.check} /> : null}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </>
        ) : null}
        {slash ? <span {...props(slash)}>/</span> : null}
        {title && Title ? <Title {...props(title.attrs)}>{title.node}</Title> : null}
        <div className="site-header__actions">
          {actions}
          {theme ? (
            <button {...props(theme.attrs)} onClick={() => themeToggle?.onToggle()}>
              {theme.icons.map((icon, index) => (
                <IconSvg key={index} icon={icon} />
              ))}
            </button>
          ) : null}
          <div {...props(switcher)}>
            {buttons.map(({ code, label, attrs }) => (
              <button
                key={code}
                {...props(attrs)}
                onClick={() => {
                  if (code !== activeLocale) onLocaleChange?.(code);
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}

/** The KHE site footer. The app passes its links and lines; placement is the app's. */
export function SiteFooter(options: SiteFooterProps) {
  const { footer, nav, links, divider, lines } = prepareFooter(options);
  return (
    <footer {...props(footer)}>
      <nav {...props(nav)}>
        {links.map((link, index) => (
          <Fragment key={index}>
            {index > 0 ? <span {...props(divider)}>·</span> : null}
            <a {...props(link.attrs)}>
              {link.icon ? <IconSvg icon={link.icon} /> : null}
              {link.label}
            </a>
          </Fragment>
        ))}
      </nav>
      {lines.map((line, index) => (
        <span key={index} {...props(line.attrs)}>
          {line.text}
        </span>
      ))}
    </footer>
  );
}

/**
 * The theme override for `SiteHeader`'s `themeToggle`, stored under `storageKey`:
 * `dark` is what shows, `toggle` flips it, and a choice equal to the system clears it.
 */
export function useThemeOverride(storageKey: string): { dark: boolean; toggle: () => void } {
  const [override, setOverride] = useState<ThemeOverride>(() => readThemeOverride(storageKey));
  const systemIsDark = useSyncExternalStore(onSystemDarkChange, systemDark, () => false);

  useEffect(() => {
    applyThemeOverride(override, storageKey);
  }, [override, storageKey]);

  const toggle = useCallback(() => setOverride((current) => toggledOverride(current, systemIsDark)), [systemIsDark]);
  return { dark: showsDark(override, systemIsDark), toggle };
}
