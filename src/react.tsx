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

const props = (pairs: Pairs) => Object.fromEntries(pairs.map(([name, value]) => [name === 'class' ? 'className' : name, value]));

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
  const { headerClass, brand, context, theme, switcher, buttons } = prepareHeader(options, options.themeToggle?.dark === true);
  const { actions, themeToggle, activeLocale, onLocaleChange } = options;
  const Context = context?.tag;

  return (
    <header className={headerClass}>
      <div className="site-header__inner">
        <a {...props(brand)}>
          <span>KHE</span>
          <span className="brand-mark__suffix">.ee</span>
        </a>
        {context && Context ? (
          <Context {...props(context.attrs)}>
            {context.kicker ? <span {...props(context.kicker.attrs)}>{context.kicker.node}</span> : null}
            <strong {...props(context.title.attrs)}>{context.title.node}</strong>
          </Context>
        ) : null}
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
