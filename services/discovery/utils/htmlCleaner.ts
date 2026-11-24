/**
 * Strips HTML tags and decodes common HTML entities for plain-text storage
 * while preserving paragraph line breaks and list bullets.
 */
export function cleanHtmlDescription(rawHtml: string): string {
  if (!rawHtml || typeof rawHtml !== 'string') return '';

  return (
    rawHtml
      // Replace breaks and paragraphs with newlines
      .replace(/<br\s*[\/]?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<p[^>]*>/gi, '')
      // Replace list items with clean bullets
      .replace(/<li[^>]*>/gi, '• ')
      .replace(/<\/li>/gi, '\n')
      .replace(/<\/(ul|ol)>/gi, '\n')
      // Strip remaining tags
      .replace(/<[^>]+>/g, '')
      // Decode HTML entities
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/&mdash;/gi, '—')
      .replace(/&ndash;/gi, '–')
      // Collapse excessive blank lines
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  );
}
