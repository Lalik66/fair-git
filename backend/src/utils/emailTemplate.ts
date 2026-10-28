// Branded HTML layout for every FestivKids email.
//
// Email clients ignore <style> blocks and external CSS inconsistently, so the
// layout is a table with inline styles only — the approach that renders the
// same in Gmail, Outlook, Apple Mail and mobile apps. Web fonts aren't loaded
// by most clients, so the serif title falls back to Georgia.
//
// Colours match the site: cream background, burgundy accent (#c4423a).

const BRAND_NAME = 'FestivKids';

const C = {
  page: '#f6f1e9',
  card: '#fffaf1',
  ink: '#1f1a17',
  inkSoft: '#6b6259',
  rule: '#e8dfd2',
  accent: '#c4423a',
  link: '#c4423a',
};

const SERIF = "Fraunces, Georgia, 'Times New Roman', serif";
const SANS = "'Inter Tight', Inter, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif";

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Escape, then turn bare http(s) URLs into links.
function linkify(escaped: string): string {
  return escaped.replace(
    /(https?:\/\/[^\s<]+)/g,
    (url) => `<a href="${url}" style="color:${C.link};text-decoration:underline;word-break:break-all;">${url}</a>`
  );
}

export interface EmailLayoutOptions {
  /** Small uppercase label under the brand name, e.g. "Şifrə bərpası". */
  tag: string;
  /** Short preview text shown next to the subject in the inbox list. */
  preheader?: string;
  /** Main content (already-safe HTML). */
  bodyHtml: string;
  /** Optional call-to-action button. */
  button?: { label: string; url: string };
  /** Line above the copy-able fallback link, shown when there is a button. */
  fallbackLinkLabel?: string;
  /** Small grey text at the very bottom. */
  footerText?: string;
  lang: 'az' | 'en';
}

export function renderEmailLayout(opts: EmailLayoutOptions): string {
  const button = opts.button
    ? `
          <tr>
            <td align="center" style="padding:12px 0 28px;">
              <a href="${escapeHtml(opts.button.url)}"
                 style="display:inline-block;background:${C.accent};color:#ffffff;font-family:${SANS};font-size:16px;font-weight:700;line-height:1;text-decoration:none;padding:16px 32px;border-radius:8px;">
                ${escapeHtml(opts.button.label)}
              </a>
            </td>
          </tr>
          <tr>
            <td style="font-family:${SANS};font-size:13px;line-height:1.6;color:${C.inkSoft};padding-bottom:24px;">
              ${escapeHtml(opts.fallbackLinkLabel || '')}<br />
              <a href="${escapeHtml(opts.button.url)}" style="color:${C.link};word-break:break-all;">${escapeHtml(opts.button.url)}</a>
            </td>
          </tr>`
    : '';

  const footer = opts.footerText
    ? `
          <tr>
            <td style="border-top:1px solid ${C.rule};padding-top:20px;font-family:${SANS};font-size:12px;line-height:1.6;color:${C.inkSoft};">
              ${escapeHtml(opts.footerText)}
            </td>
          </tr>`
    : '';

  return `<!DOCTYPE html>
<html lang="${opts.lang}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="color-scheme" content="light" />
<title>${escapeHtml(BRAND_NAME)}</title>
</head>
<body style="margin:0;padding:0;background:${C.page};">
  <span style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(opts.preheader || '')}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.page};">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
               style="max-width:560px;background:${C.card};border:1px solid ${C.rule};border-radius:16px;">
          <tr>
            <td style="padding:36px 40px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="font-family:${SERIF};font-size:32px;font-weight:700;font-style:italic;line-height:1.2;color:${C.ink};">
                    ${escapeHtml(BRAND_NAME)}
                  </td>
                </tr>
                <tr>
                  <td style="padding:10px 0 24px;border-bottom:1px solid ${C.rule};font-family:${SERIF};font-size:13px;letter-spacing:2px;text-transform:uppercase;color:${C.inkSoft};">
                    ${escapeHtml(opts.tag)}
                  </td>
                </tr>
                <tr>
                  <td style="padding-top:24px;font-family:${SERIF};font-size:17px;line-height:1.65;color:${C.ink};">
                    ${opts.bodyHtml}
                  </td>
                </tr>${button}${footer}
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Wrap a plain-text email body in the branded layout. Blank lines become
 * paragraphs, "  - item" lines become a list, and URLs become links — so the
 * existing text templates get the same look without being rewritten.
 */
export function textToBrandedHtml(text: string, tag: string, lang: 'az' | 'en'): string {
  const blocks = text.trim().split(/\n\s*\n/);

  const bodyHtml = blocks
    .map((block) => {
      const lines = block.split('\n');
      if (lines.every((l) => /^\s*-\s+/.test(l))) {
        const items = lines
          .map((l) => `<li style="margin:0 0 6px;">${linkify(escapeHtml(l.replace(/^\s*-\s+/, '')))}</li>`)
          .join('');
        return `<ul style="margin:0 0 16px;padding-left:20px;">${items}</ul>`;
      }
      return `<p style="margin:0 0 16px;">${lines.map((l) => linkify(escapeHtml(l))).join('<br />')}</p>`;
    })
    .join('');

  return renderEmailLayout({ tag, bodyHtml, lang, preheader: text.split('\n')[0] });
}
