/**
 * HTML-entity encode a user-supplied string so it can be stored and later
 * rendered as text without becoming an XSS vector. This mirrors the encoding
 * applied to chat messages (see messageService.sanitizeMessageContent) so all
 * user-authored free text is handled consistently across the app.
 */
export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}
