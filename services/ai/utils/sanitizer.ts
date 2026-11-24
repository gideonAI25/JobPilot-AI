/**
 * Sanitizes errors and log messages to guarantee that API keys, tokens,
 * and sensitive candidate private information are NEVER logged or exposed.
 */

const API_KEY_PATTERNS = [
  // Google API keys (AIzaSy...)
  /AIza[0-9A-Za-z-_]{35}/g,
  // Generic key parameter in URLs (key=...)
  /([?&]key=)[^& \n]+/gi,
  // Bearer tokens
  /(Bearer\s+)[A-Za-z0-9._~+/-]+=*/gi,
  // Generic token or secret patterns
  /([?&](?:api_key|token|secret)=)[^& \n]+/gi,
];

const PII_PATTERNS = [
  // Emails
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  // Phone numbers (basic international / national)
  /\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
];

/**
 * Strips API keys, authorization tokens, and PII from error messages or logs.
 */
export function sanitizeLog(text: string | null | undefined): string {
  if (!text) return '';

  let sanitized = String(text);

  // Redact API keys
  for (const pattern of API_KEY_PATTERNS) {
    sanitized = sanitized.replace(pattern, '[REDACTED_API_KEY]');
  }

  // Redact Candidate PII
  for (const pattern of PII_PATTERNS) {
    sanitized = sanitized.replace(pattern, '[REDACTED_PII]');
  }

  return sanitized;
}

/**
 * Formats an unknown error into a sanitized, safe string suitable for logging.
 */
export function sanitizeError(error: any): string {
  if (!error) return 'Unknown error occurred.';

  let message = error.message || error.statusText || String(error);

  // If error has a response object with sensitive headers or url, sanitize it
  if (error.response) {
    const status = error.response.status || error.status;
    const statusText = error.response.statusText || '';
    message = `HTTP ${status} ${statusText}: ${message}`;
  }

  return sanitizeLog(message);
}
