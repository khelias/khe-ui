/** An action an app renders in the header: anything in the actions but the toggle and the switcher. */
export const APP_ACTION = '.site-header__actions > :not(.site-header__theme, .language-switcher)';

/** The narrow rule's selector: beside an app's action, the title and the slash give way. */
export const ACTION_HIDES_TITLE = `.site-header:has(${APP_ACTION}) :is(.site-header__title, .site-header__slash)`;
