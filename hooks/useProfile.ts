'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  CandidateProfile,
  ProfileSectionId,
  ProfileCompletionSummary,
} from '@/types/profile';
import {
  getInitialProfile,
  fetchProfile,
  saveProfileSection,
  addProfileItem,
  updateProfileItem,
  deleteProfileItem,
  applyApprovedCVSections,
  resetProfileInDb,
  importProfileJson,
} from '@/services/profileService';
import { calculateProfileCompletion } from '@/services/profileCompletion';

export function useProfile() {
  const [profile, setProfile] = useState<CandidateProfile>(getInitialProfile);
  const [draftProfile, setDraftProfile] = useState<CandidateProfile>(getInitialProfile);
  const [activeSection, setActiveSection] = useState<ProfileSectionId>('personal');
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  // Map section ID to profile key
  const sectionKeyMap: Record<ProfileSectionId, keyof CandidateProfile> = {
    personal: 'personalInfo',
    summary: 'summary',
    education: 'education',
    experience: 'workExperience',
    skills: 'technicalSkills',
    projects: 'projects',
    certifications: 'certifications',
    preferences: 'preferences',
    'standard-answers': 'standardAnswers',
    'cv-documents': 'cvDocuments',
  };

  const currentKey = sectionKeyMap[activeSection];

  // Load profile from SQLite database via API on mount
  const reloadProfile = useCallback(async () => {
    const res = await fetchProfile();
    if (res.success && res.profile) {
      setProfile(res.profile);
      setDraftProfile(res.profile);
    } else {
      setStatusMessage({
        type: 'error',
        text: res.error || 'Failed to load profile from database.',
      });
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    reloadProfile();
  }, [reloadProfile]);

  // Clear toast status message after 4 seconds
  useEffect(() => {
    if (!statusMessage) return;
    const timer = setTimeout(() => {
      setStatusMessage(null);
    }, 4000);
    return () => clearTimeout(timer);
  }, [statusMessage]);

  // Detect unsaved changes in current section
  const isDirty = useMemo(() => {
    if (!isLoaded) return false;
    const original = JSON.stringify(profile[currentKey]);
    const draft = JSON.stringify(draftProfile[currentKey]);
    return original !== draft;
  }, [profile, draftProfile, currentKey, isLoaded]);

  // Calculated completion summary from active profile
  const completion: ProfileCompletionSummary = useMemo(() => {
    return calculateProfileCompletion(profile);
  }, [profile]);

  // Update draft for current section
  const updateDraft = useCallback(
    <K extends keyof CandidateProfile>(key: K, value: CandidateProfile[K]) => {
      setDraftProfile((prev) => ({
        ...prev,
        [key]: value,
      }));
    },
    []
  );

  // Commit current section from draft to SQLite database
  const saveCurrentSection = useCallback(async () => {
    setIsSaving(true);
    try {
      const res = await saveProfileSection(activeSection, draftProfile[currentKey]);
      if (res.success && res.profile) {
        setProfile(res.profile);
        setDraftProfile(res.profile);
        setStatusMessage({ type: 'success', text: 'Section saved to database.' });
      } else {
        setStatusMessage({
          type: 'error',
          text: res.error || 'Failed to save section.',
        });
      }
    } finally {
      setIsSaving(false);
    }
  }, [activeSection, draftProfile, currentKey]);

  // Discard draft changes for current section
  const cancelCurrentSection = useCallback(() => {
    setDraftProfile((prev) => ({
      ...prev,
      [currentKey]: profile[currentKey],
    }));
    setStatusMessage({ type: 'info', text: 'Unsaved edits were discarded.' });
  }, [profile, currentKey]);

  // Add item to array-based sections in SQLite database
  const addListItem = useCallback(
    async <
      K extends
        | 'education'
        | 'workExperience'
        | 'technicalSkills'
        | 'projects'
        | 'certifications'
        | 'standardAnswers'
    >(
      key: K,
      item: CandidateProfile[K][number]
    ) => {
      setIsSaving(true);
      try {
        const res = await addProfileItem(key, item);
        if (res.success && res.profile) {
          setProfile(res.profile);
          setDraftProfile(res.profile);
          setStatusMessage({ type: 'success', text: 'Record added to database.' });
        } else {
          setStatusMessage({
            type: 'error',
            text: res.error || 'Failed to add record.',
          });
        }
      } finally {
        setIsSaving(false);
      }
    },
    []
  );

  // Update item in array-based sections in SQLite database
  const updateListItem = useCallback(
    async <
      K extends
        | 'education'
        | 'workExperience'
        | 'technicalSkills'
        | 'projects'
        | 'certifications'
        | 'standardAnswers'
    >(
      key: K,
      id: string,
      updated: Partial<CandidateProfile[K][number]>
    ) => {
      setIsSaving(true);
      try {
        const res = await updateProfileItem(key, id, updated);
        if (res.success && res.profile) {
          setProfile(res.profile);
          setDraftProfile(res.profile);
          setStatusMessage({ type: 'success', text: 'Record updated in database.' });
        } else {
          setStatusMessage({
            type: 'error',
            text: res.error || 'Failed to update record.',
          });
        }
      } finally {
        setIsSaving(false);
      }
    },
    []
  );

  // Remove item from array-based sections in SQLite database
  const removeListItem = useCallback(
    async <
      K extends
        | 'education'
        | 'workExperience'
        | 'technicalSkills'
        | 'projects'
        | 'certifications'
        | 'standardAnswers'
    >(
      key: K,
      id: string
    ) => {
      setIsSaving(true);
      try {
        const res = await deleteProfileItem(key, id);
        if (res.success && res.profile) {
          setProfile(res.profile);
          setDraftProfile(res.profile);
          setStatusMessage({ type: 'info', text: 'Record removed from database.' });
        } else {
          setStatusMessage({
            type: 'error',
            text: res.error || 'Failed to remove record.',
          });
        }
      } finally {
        setIsSaving(false);
      }
    },
    []
  );

  // Merge approved sections from CV extraction into database
  const mergeApprovedSections = useCallback(
    async (approved: Partial<CandidateProfile>) => {
      setIsSaving(true);
      try {
        const res = await applyApprovedCVSections(approved);
        if (res.success && res.profile) {
          setProfile(res.profile);
          setDraftProfile(res.profile);
          const count = Object.keys(approved).length;
          setStatusMessage({
            type: 'success',
            text: `Successfully applied ${count} approved section${count === 1 ? '' : 's'} to your verified database profile.`,
          });
        } else {
          setStatusMessage({
            type: 'error',
            text: res.error || 'Failed to apply approved sections to database.',
          });
        }
      } finally {
        setIsSaving(false);
      }
    },
    []
  );

  // Reset profile to pristine empty state in database
  const resetProfile = useCallback(async () => {
    setIsSaving(true);
    try {
      const res = await resetProfileInDb();
      if (res.success && res.profile) {
        setProfile(res.profile);
        setDraftProfile(res.profile);
        setStatusMessage({ type: 'info', text: 'Profile reset to empty state.' });
      } else {
        setStatusMessage({ type: 'error', text: res.error || 'Failed to reset profile.' });
      }
    } finally {
      setIsSaving(false);
    }
  }, []);

  // Import profile from JSON string and sync to DB
  const importFromJson = useCallback(
    async (jsonStr: string) => {
      const res = importProfileJson(jsonStr);
      if (res.error || !res.profile) {
        setStatusMessage({
          type: 'error',
          text: res.error || 'Failed to parse JSON file.',
        });
        return false;
      }
      setIsSaving(true);
      try {
        const applied = await applyApprovedCVSections(res.profile);
        if (applied.success && applied.profile) {
          setProfile(applied.profile);
          setDraftProfile(applied.profile);
          setStatusMessage({ type: 'success', text: 'Profile imported and saved to database.' });
          return true;
        } else {
          setStatusMessage({ type: 'error', text: applied.error || 'Failed to save imported profile.' });
          return false;
        }
      } finally {
        setIsSaving(false);
      }
    },
    []
  );

  return {
    profile,
    draftProfile,
    activeSection,
    setActiveSection,
    isLoaded,
    isDirty,
    isSaving,
    statusMessage,
    completion,
    currentKey,
    reloadProfile,
    updateDraft,
    saveCurrentSection,
    cancelCurrentSection,
    addListItem,
    updateListItem,
    removeListItem,
    importFromJson,
    resetProfile,
    mergeApprovedSections,
  };
}
