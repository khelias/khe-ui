// @vitest-environment happy-dom
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { SiteFooter } from '../src/react.js';
import { type SiteFooterOptions, renderSiteFooter } from '../src/site-footer.js';
import { normalise, parse } from './dom.js';

const links = [
  { label: 'GitHub', href: 'https://github.com/khelias', icon: 'github' },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/example/', icon: 'linkedin' },
  { label: 'Privaatsus', href: '/privacy?lang=et' },
] as const;

const base = {
  label: 'Lehe lingid',
  links,
  lines: [{ text: 'Ise majutatud Eestis' }],
} satisfies SiteFooterOptions;

const fixtures: Record<string, SiteFooterOptions> = {
  'icons and a line': base,
  'one link, no lines': { label: 'Links', links: [{ label: 'Privacy', href: '/privacy' }] },
  'no icons, two lines': {
    label: 'Page links',
    links: [
      { label: 'GitHub', href: 'https://github.com/khelias/khe-ai-adventure' },
      { label: 'Privacy', href: '/privacy?lang=en' },
    ],
    lines: [{ text: '18+ · The story is written by AI' }, { text: 'Self-hosted in Estonia' }],
  },
  'escaped text': {
    label: `Links "x" & 'y'`,
    links: [{ label: 'Tom & <Jerry>', href: '/?a=1&b="2"' }],
    lines: [{ text: 'Say "hi" <script>' }],
  },
  'every attrs part': {
    ...base,
    links: [links[0], links[1], { ...links[2], attrs: { 'data-link': 'privacy', 'data-i18n': 'privacyLink' } }],
    lines: [{ text: 'Ise majutatud Eestis', attrs: { 'data-i18n': 'footer' } }],
    attrs: { footer: { id: 'footer' }, nav: { 'data-i18n-aria': 'footerLinksLabel' } },
  },
};


describe('both footer renderers', () => {
  it.each(Object.entries(fixtures))('give the same markup: %s', (_, options) => {
    expect(normalise(renderSiteFooter(options))).toBe(renderToStaticMarkup(<SiteFooter {...options} />));
  });
});

describe('renderSiteFooter', () => {
  it('keeps the attribute order of the contract', () => {
    const html = renderSiteFooter(fixtures['every attrs part']!);
    expect(html).toMatch(/^<footer class="site-footer" id="footer">\n {2}<nav aria-label="Lehe lingid" data-i18n-aria="footerLinksLabel">/);
    expect(html).toContain('<a href="https://github.com/khelias"><svg class="site-footer__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 0C');
    expect(html).toContain('</path></svg>GitHub</a>');
    expect(html).toContain('<span class="site-footer__divider" aria-hidden="true">·</span>');
    expect(html).toContain('<a href="/privacy?lang=et" data-link="privacy" data-i18n="privacyLink">Privaatsus</a>');
    expect(html).toContain('<span class="site-footer__line" data-i18n="footer">Ise majutatud Eestis</span>');
  });

  it('nests the parts as the contract says', () => {
    const doc = parse(renderSiteFooter(base));
    const nav = doc.querySelector('footer.site-footer > nav[aria-label="Lehe lingid"]')!;
    expect([...nav.children].map((child) => child.tagName.toLowerCase())).toEqual(['a', 'span', 'a', 'span', 'a']);
    expect(nav.querySelectorAll('a > svg.site-footer__icon:first-child')).toHaveLength(2);
    expect(nav.querySelector('a[href^="/privacy"] svg')).toBeNull();
    expect(doc.querySelectorAll('footer > span.site-footer__line')).toHaveLength(1);
  });

  it('puts no divider by a single link and no line without lines', () => {
    const doc = parse(renderSiteFooter(fixtures['one link, no lines']!));
    expect(doc.querySelector('.site-footer__divider')).toBeNull();
    expect(doc.querySelector('.site-footer__line')).toBeNull();
  });

  it('escapes & < > " in text and attributes', () => {
    const html = renderSiteFooter(fixtures['escaped text']!);
    expect(html).toContain('aria-label="Links &quot;x&quot; &amp; &#x27;y&#x27;"');
    expect(html).toContain('<a href="/?a=1&amp;b=&quot;2&quot;">Tom &amp; &lt;Jerry&gt;</a>');
    expect(html).toContain('>Say &quot;hi&quot; &lt;script&gt;</span>');
    expect(html).not.toMatch(/<(Jerry|script)>/);
  });

  it('indents every line', () => {
    const lines = renderSiteFooter({ ...base, indent: '  ' }).split('\n');
    expect(lines[0]).toBe('  <footer class="site-footer">');
    expect(lines.every((line) => line.startsWith('  <') || line.startsWith('    '))).toBe(true);
    expect(() => renderSiteFooter({ ...base, indent: '<b>' })).toThrow(/only spaces and tabs/);
  });

  it('refuses empty links, a javascript: link, an unknown icon and bad attrs', () => {
    expect(() => renderSiteFooter({ ...base, links: [] })).toThrow(/links is empty/);
    expect(() => renderSiteFooter({ ...base, links: [{ label: 'x', href: 'javascript:alert(1)' }] })).toThrow(/links\[0\] href is a javascript: URL/);
    expect(() => renderSiteFooter({ ...base, links: [{ label: 'x', href: '/', icon: 'mastodon' as never }] })).toThrow(/unknown icon/);
    expect(() => renderSiteFooter({ ...base, attrs: { nav: { 'aria-label': 'x' } } })).toThrow(/repeats aria-label/);
    expect(() => renderSiteFooter({ ...base, attrs: { footer: { class: 'x' } } })).toThrow(/only data-\*/);
    expect(() => renderSiteFooter({ ...base, links: [{ label: 'x', href: '/', attrs: { onclick: 'x' } }] })).toThrow(/onclick/);
    expect(() => renderSiteFooter({ ...base, lines: [{ text: 'x', attrs: { style: 'x' } }] })).toThrow(/only data-\*/);
    expect(() => renderSiteFooter({ ...base, attrs: { link: {} } as never })).toThrow(/unknown part link/);
  });
});

describe('SiteFooter', () => {
  it('renders nodes as link labels and lines', () => {
    const html = renderToStaticMarkup(
      <SiteFooter label="Links" links={[{ label: <em>GitHub</em>, href: '/gh', icon: 'github' }]} lines={[{ text: <strong>18+</strong> }]} />,
    );
    expect(html).toContain('</svg><em>GitHub</em></a>');
    expect(html).toContain('<span class="site-footer__line"><strong>18+</strong></span>');
  });
});
