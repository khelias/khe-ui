import type { ReactNode } from 'react';
import { type Pairs, type SiteHeaderBaseOptions, prepare } from './core.js';

export type { Attrs, SiteHeaderContext, SiteHeaderLocale, SiteHeaderPartAttrs } from './core.js';

export interface SiteHeaderProps<Code extends string = string> extends SiteHeaderBaseOptions<ReactNode, Code> {
  /** Rendered in front of the language switcher. */
  readonly actions?: ReactNode;
  /** Called with the code of a locale button that is not the active one. */
  readonly onLocaleChange?: (code: Code) => void;
}

const props = (pairs: Pairs) => Object.fromEntries(pairs.map(([name, value]) => [name === 'class' ? 'className' : name, value]));

/**
 * The KHE site header. Controlled: the app owns the locale, its storage and the URL,
 * and passes the active one back in.
 */
export function SiteHeader<Code extends string = string>(options: SiteHeaderProps<Code>) {
  const { headerClass, brand, context, switcher, buttons } = prepare(options);
  const { actions, activeLocale, onLocaleChange } = options;
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
