import { RawJobPosting, NormalizedJobPosting } from './types';

const TRACKING_PARAMS = new Set([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'ref',
  'source',
  'gh_src',
  'lever-origin',
  'mode',
  'src',
  'fbclid',
  'gclid',
  'mc_cid',
  'mc_eid',
  'trk',
]);

/**
 * Strips tracking parameters, query artifacts, and trailing slashes from URLs.
 */
export function normalizeJobUrl(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl.trim());
    parsed.protocol = parsed.protocol.toLowerCase();
    parsed.hostname = parsed.hostname.toLowerCase();
    parsed.hash = '';

    // Strip known marketing / tracking params
    const keysToDelete: string[] = [];
    parsed.searchParams.forEach((_, key) => {
      if (TRACKING_PARAMS.has(key.toLowerCase()) || key.toLowerCase().startsWith('utm_')) {
        keysToDelete.push(key);
      }
    });
    for (const key of keysToDelete) {
      parsed.searchParams.delete(key);
    }

    // Remove trailing slash on path if length > 1
    let pathname = parsed.pathname;
    if (pathname.length > 1 && pathname.endsWith('/')) {
      pathname = pathname.slice(0, -1);
    }
    parsed.pathname = pathname;

    return parsed.toString();
  } catch {
    return rawUrl.trim();
  }
}

/**
 * Normalizes work arrangement to 'remote' | 'hybrid' | 'on-site'.
 */
export function normalizeWorkArrangement(
  arrangement?: string | null,
  location?: string | null,
  title?: string | null
): 'remote' | 'hybrid' | 'on-site' {
  const combined = `${arrangement || ''} ${location || ''} ${title || ''}`.toLowerCase();

  if (combined.includes('hybrid')) {
    return 'hybrid';
  }
  if (
    combined.includes('on-site') ||
    combined.includes('onsite') ||
    combined.includes('in-office') ||
    combined.includes('office only')
  ) {
    return 'on-site';
  }
  // Default to remote for remote-first platform
  return 'remote';
}

/**
 * Normalizes employment type while strictly preserving null if unavailable.
 */
export function normalizeEmploymentType(
  rawType?: string | null
): 'full-time' | 'part-time' | 'contract' | 'freelance' | 'internship' | null {
  if (!rawType || typeof rawType !== 'string') return null;

  const t = rawType.trim().toLowerCase();
  if (t.includes('full') || t === 'ft' || t.includes('permanent')) {
    return 'full-time';
  }
  if (t.includes('part') || t === 'pt') {
    return 'part-time';
  }
  if (t.includes('contract') || t.includes('1099') || t.includes('c2c')) {
    return 'contract';
  }
  if (t.includes('freelance')) {
    return 'freelance';
  }
  if (t.includes('intern')) {
    return 'internship';
  }

  return null;
}

/**
 * Normalizes seniority/experience level. Preserves null if unspecified.
 */
export function normalizeExperienceLevel(
  rawLevel?: string | null,
  title?: string | null
): 'Junior' | 'Mid-Level' | 'Senior' | 'Lead' | 'Staff' | null {
  const combined = `${rawLevel || ''} ${title || ''}`.toLowerCase();

  if (combined.includes('staff') || combined.includes('principal') || combined.includes('director')) {
    return 'Staff';
  }
  if (combined.includes('lead') || combined.includes('head of')) {
    return 'Lead';
  }
  if (combined.includes('senior') || combined.includes('sr.') || combined.includes('sr ')) {
    return 'Senior';
  }
  if (combined.includes('junior') || combined.includes('jr.') || combined.includes('entry') || combined.includes('graduate')) {
    return 'Junior';
  }
  if (combined.includes('mid') || combined.includes('intermediate')) {
    return 'Mid-Level';
  }

  return null;
}

/**
 * Normalizes an array of skills, filtering duplicates case-insensitively.
 */
export function normalizeSkills(rawSkills?: string[] | string | null): string[] {
  if (!rawSkills) return [];

  const list = Array.isArray(rawSkills)
    ? rawSkills
    : String(rawSkills)
        .split(/[,\n;|]/)
        .map((s) => s.trim());

  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const item of list) {
    const trimmed = item.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      normalized.push(trimmed);
    }
  }

  return normalized;
}

/**
 * Generates a canonical fingerprint string used for detecting the same opportunity
 * across different sources (e.g. company + title + arrangement).
 */
export function generateJobFingerprint(company: string, title: string, arrangement: string): string {
  const cleanCompany = company
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim();

  // Strip brackets, parenthesis, and common filler words from title
  const cleanTitle = title
    .toLowerCase()
    .replace(/\[.*?\]|\(.*?\)/g, '')
    .replace(/\b(remote|full-time|fulltime|urgent|hiring|immediate)\b/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();

  return `${cleanCompany}::${cleanTitle}::${arrangement}`;
}

/**
 * Normalizes raw job listing from any source into a uniform, validated format.
 */
export function normalizeJob(raw: RawJobPosting, sourceName: string): NormalizedJobPosting {
  const normalizedUrl = normalizeJobUrl(raw.url);
  const normalizedAppUrl = raw.applicationUrl ? normalizeJobUrl(raw.applicationUrl) : null;
  const workArrangement = normalizeWorkArrangement(raw.workArrangement, raw.location, raw.title);
  const employmentType = normalizeEmploymentType(raw.employmentType);
  const experienceLevel = normalizeExperienceLevel(raw.experienceLevel, raw.title);
  const skills = normalizeSkills(raw.skills);

  let deadline: Date | null = null;
  if (raw.deadline) {
    const d = new Date(raw.deadline);
    if (!isNaN(d.getTime())) deadline = d;
  }

  let postedAt: Date | null = null;
  if (raw.postedAt) {
    const p = new Date(raw.postedAt);
    if (!isNaN(p.getTime())) postedAt = p;
  }

  const location = raw.location?.trim() || (workArrangement === 'remote' ? 'Remote' : 'Unspecified');
  const salary = raw.salary?.trim() || null;
  const company = raw.company.trim();
  const title = raw.title.trim();

  const fingerprint = generateJobFingerprint(company, title, workArrangement);

  return {
    sourceName,
    externalId: raw.externalId ? String(raw.externalId).trim() : null,
    title,
    company,
    description: raw.description.trim(),
    url: normalizedUrl,
    applicationUrl: normalizedAppUrl,
    location,
    workArrangement,
    employmentType,
    experienceLevel,
    skills,
    salary,
    deadline,
    postedAt,
    fingerprint,
  };
}
