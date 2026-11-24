import { RawJobPosting, ValidationResult } from './types';

/**
 * Validates raw job listings before normalization and ingestion.
 * Ensures minimum required information is present and avoids accepting malformed or corrupt stubs.
 */
export function validateRawJob(job: RawJobPosting): ValidationResult {
  const errors: string[] = [];

  // 1. Title validation
  if (!job.title || typeof job.title !== 'string' || job.title.trim().length < 2) {
    errors.push('Missing or invalid job title (minimum 2 characters required).');
  }

  // 2. Company validation
  if (!job.company || typeof job.company !== 'string' || job.company.trim().length < 1) {
    errors.push('Missing or invalid company name.');
  }

  // 3. Description validation
  if (
    !job.description ||
    typeof job.description !== 'string' ||
    job.description.trim().length < 20
  ) {
    errors.push('Missing or insufficient job description (minimum 20 characters required).');
  }

  // 4. URL validation
  if (!job.url || typeof job.url !== 'string') {
    errors.push('Missing job URL.');
  } else {
    try {
      const parsed = new URL(job.url.trim());
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        errors.push(`Invalid URL protocol: "${parsed.protocol}". Must be http or https.`);
      }
    } catch {
      errors.push(`Malformed URL string: "${job.url}".`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
