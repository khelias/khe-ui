/** An action an app renders in the header: anything in the actions but the toggle and the switcher. */
export const APP_ACTION = '.site-header__actions > :not(.site-header__theme, .language-switcher)';

/** The narrow rule's selector: beside an app's action, in the frame view, the title and the slash give way. */
export const ACTION_HIDES_TITLE = `:where(:root:not([data-khe-view="product"])) .site-header:has(${APP_ACTION}) :is(.site-header__title, .site-header__slash)`;

/** A header with an app's title, in the frame view. */
export const TITLED_HEADER = ':where(:root:not([data-khe-view="product"])) .site-header:has(.site-header__title)';

/** The phone rule's header: a title and no action of its own, so the room's name gives way to the title. */
export const TITLE_WITHOUT_ACTION = `${TITLED_HEADER}:not(:has(${APP_ACTION}))`;
