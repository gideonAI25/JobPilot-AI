import {
  CandidateProfile,
  ProfileSectionId,
  ProfileCompletionSummary,
  CVDocRecord,
} from '@/types/profile';

/**
 * Creates an empty candidate profile.
 * IMPORTANT: No candidate data is invented or assumed.
 * All fields start empty until verified information is supplied by the user.
 */
export function getInitialProfile(): CandidateProfile {
  return {
    personalInfo: {
      fullName: '',
      email: '',
      phone: '',
      country: '',
      city: '',
      linkedInUrl: '',
      portfolioUrl: '',
    },
    summary: {
      headline: '',
      summary: '',
    },
    education: [],
    workExperience: [],
    technicalSkills: [],
    projects: [],
    certifications: [],
    preferences: {
      targetJobTitles: [],
      preferredEmploymentTypes: [],
      preferredSeniority: [],
      remoteWorkPreference: 'remote-only',
      preferredCountries: [],
      excludedLocations: [],
      minSalaryExpectation: {
        currency: 'USD',
        amount: null,
        period: 'yearly',
      },
    },
    standardAnswers: [],
    cvDocuments: [],
  };
}

/**
 * Loads the candidate profile from the SQLite database via API.
 */
export async function fetchProfile(): Promise<{
  success: boolean;
  profile?: CandidateProfile;
  completion?: ProfileCompletionSummary;
  error?: string;
}> {
  try {
    const res = await fetch('/api/profile', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return {
        success: false,
        error: errData.error || `Server responded with HTTP ${res.status}`,
      };
    }

    const data = await res.json();
    return {
      success: true,
      profile: data.profile,
      completion: data.completion,
    };
  } catch (error) {
    console.error('Error fetching profile from database:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error loading profile',
    };
  }
}

/**
 * Updates a specific profile section in the SQLite database.
 */
export async function saveProfileSection(
  section: ProfileSectionId,
  data: any
): Promise<{
  success: boolean;
  profile?: CandidateProfile;
  completion?: ProfileCompletionSummary;
  error?: string;
}> {
  try {
    const res = await fetch('/api/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ section, data }),
    });

    const resData = await res.json().catch(() => ({}));
    if (!res.ok || !resData.success) {
      return {
        success: false,
        error: resData.error || `Server error ${res.status}`,
      };
    }

    return {
      success: true,
      profile: resData.profile,
      completion: resData.completion,
    };
  } catch (error) {
    console.error('Error saving profile section:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error saving section',
    };
  }
}

/**
 * Adds an item to a relational array section (education, experience, skill, project, certification, standardAnswer).
 */
export async function addProfileItem(
  sectionKey:
    | 'education'
    | 'workExperience'
    | 'technicalSkills'
    | 'projects'
    | 'certifications'
    | 'standardAnswers',
  item: any
): Promise<{
  success: boolean;
  profile?: CandidateProfile;
  completion?: ProfileCompletionSummary;
  error?: string;
}> {
  try {
    const res = await fetch('/api/profile/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sectionKey, item }),
    });

    const resData = await res.json().catch(() => ({}));
    if (!res.ok || !resData.success) {
      return {
        success: false,
        error: resData.error || `Failed to add item (${res.status})`,
      };
    }

    return {
      success: true,
      profile: resData.profile,
      completion: resData.completion,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error adding item',
    };
  }
}

/**
 * Updates an item in a relational array section.
 */
export async function updateProfileItem(
  sectionKey:
    | 'education'
    | 'workExperience'
    | 'technicalSkills'
    | 'projects'
    | 'certifications'
    | 'standardAnswers',
  id: string,
  item: any
): Promise<{
  success: boolean;
  profile?: CandidateProfile;
  completion?: ProfileCompletionSummary;
  error?: string;
}> {
  try {
    const res = await fetch('/api/profile/items', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sectionKey, id, item }),
    });

    const resData = await res.json().catch(() => ({}));
    if (!res.ok || !resData.success) {
      return {
        success: false,
        error: resData.error || `Failed to update item (${res.status})`,
      };
    }

    return {
      success: true,
      profile: resData.profile,
      completion: resData.completion,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error updating item',
    };
  }
}

/**
 * Deletes an item from a relational array section.
 */
export async function deleteProfileItem(
  sectionKey:
    | 'education'
    | 'workExperience'
    | 'technicalSkills'
    | 'projects'
    | 'certifications'
    | 'standardAnswers',
  id: string
): Promise<{
  success: boolean;
  profile?: CandidateProfile;
  completion?: ProfileCompletionSummary;
  error?: string;
}> {
  try {
    const res = await fetch(
      `/api/profile/items?sectionKey=${encodeURIComponent(sectionKey)}&id=${encodeURIComponent(id)}`,
      { method: 'DELETE' }
    );

    const resData = await res.json().catch(() => ({}));
    if (!res.ok || !resData.success) {
      return {
        success: false,
        error: resData.error || `Failed to delete item (${res.status})`,
      };
    }

    return {
      success: true,
      profile: resData.profile,
      completion: resData.completion,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error deleting item',
    };
  }
}

/**
 * Applies approved CV sections into the candidate profile in SQLite.
 */
export async function applyApprovedCVSections(
  approved: Partial<CandidateProfile>
): Promise<{
  success: boolean;
  profile?: CandidateProfile;
  completion?: ProfileCompletionSummary;
  error?: string;
}> {
  try {
    const res = await fetch('/api/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approved }),
    });

    const resData = await res.json().catch(() => ({}));
    if (!res.ok || !resData.success) {
      return {
        success: false,
        error: resData.error || 'Failed to apply approved sections',
      };
    }

    return {
      success: true,
      profile: resData.profile,
      completion: resData.completion,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error applying approved sections',
    };
  }
}

/**
 * Fetches all uploaded CV records from the database.
 */
export async function fetchCVDocuments(): Promise<{
  success: boolean;
  documents?: CVDocRecord[];
  error?: string;
}> {
  try {
    const res = await fetch('/api/cv', { method: 'GET', cache: 'no-store' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) {
      return { success: false, error: data.error || 'Failed to fetch CV documents' };
    }
    return { success: true, documents: data.documents };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error fetching CV documents',
    };
  }
}

/**
 * Deletes a CV document record and file.
 */
export async function deleteCVDocument(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/cv?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    const data = await res.json().catch(() => ({}));
    return Boolean(res.ok && data.success);
  } catch {
    return false;
  }
}

/**
 * Resets the candidate profile to empty state in the SQLite database.
 */
export async function resetProfileInDb(): Promise<{
  success: boolean;
  profile?: CandidateProfile;
  completion?: ProfileCompletionSummary;
  error?: string;
}> {
  try {
    const res = await fetch('/api/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reset: true }),
    });

    const resData = await res.json().catch(() => ({}));
    if (!res.ok || !resData.success) {
      return { success: false, error: resData.error || 'Failed to reset profile' };
    }

    return {
      success: true,
      profile: resData.profile,
      completion: resData.completion,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error resetting profile',
    };
  }
}

/**
 * Generates a unique client-side ID for new list item forms.
 */
export function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `id_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Exports profile data as a formatted JSON string for download or review.
 */
export function exportProfileJson(profile: CandidateProfile): string {
  return JSON.stringify(profile, null, 2);
}

/**
 * Validates and imports JSON profile data.
 */
export function importProfileJson(jsonString: string): { profile?: CandidateProfile; error?: string } {
  try {
    const parsed = JSON.parse(jsonString) as Partial<CandidateProfile>;
    if (!parsed || typeof parsed !== 'object') {
      return { error: 'Invalid profile format: root must be a JSON object' };
    }
    const base = getInitialProfile();
    const imported: CandidateProfile = {
      personalInfo: { ...base.personalInfo, ...(parsed.personalInfo || {}) },
      summary: { ...base.summary, ...(parsed.summary || {}) },
      education: Array.isArray(parsed.education) ? parsed.education : [],
      workExperience: Array.isArray(parsed.workExperience) ? parsed.workExperience : [],
      technicalSkills: Array.isArray(parsed.technicalSkills) ? parsed.technicalSkills : [],
      projects: Array.isArray(parsed.projects) ? parsed.projects : [],
      certifications: Array.isArray(parsed.certifications) ? parsed.certifications : [],
      preferences: {
        ...base.preferences,
        ...(parsed.preferences || {}),
        minSalaryExpectation: {
          ...base.preferences.minSalaryExpectation,
          ...(parsed.preferences?.minSalaryExpectation || {}),
        },
      },
      standardAnswers: Array.isArray(parsed.standardAnswers) ? parsed.standardAnswers : [],
      lastUpdated: new Date().toISOString(),
    };
    return { profile: imported };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Invalid JSON file' };
  }
}
