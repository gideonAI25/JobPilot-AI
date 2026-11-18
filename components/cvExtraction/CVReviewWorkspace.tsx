import React, { useState } from 'react';
import {
  CVExtractionResult,
  ExtractedSectionReview,
  ReviewStatus,
} from '@/types/cvExtraction';
import { CandidateProfile } from '@/types/profile';
import {
  PersonalInfoReviewCard,
  SummaryReviewCard,
  EducationReviewCard,
  ExperienceReviewCard,
  SkillsReviewCard,
  ProjectsReviewCard,
  CertificationsReviewCard,
} from './ReviewSectionCards';
import { Button } from '@/components/profile/common/FormControls';
import {
  FileTextIcon,
  CheckCircleIcon,
  XIcon,
  AlertCircleIcon,
} from '@/components/icons/Icons';

interface CVReviewWorkspaceProps {
  extraction: CVExtractionResult;
  existingProfile: CandidateProfile;
  onApplyApproved: (approvedSections: Partial<CandidateProfile>) => void;
  onDiscard: () => void;
}

export function CVReviewWorkspace({
  extraction,
  existingProfile,
  onApplyApproved,
  onDiscard,
}: CVReviewWorkspaceProps) {
  const [sections, setSections] = useState(extraction.sections);

  // Status changers
  const updateStatus = (sectionKey: keyof typeof sections, status: ReviewStatus) => {
    setSections((prev) => ({
      ...prev,
      [sectionKey]: {
        ...prev[sectionKey],
        status,
      },
    }));
  };

  // Content updaters (for user live-editing)
  const updateEditedData = <K extends keyof typeof sections>(
    sectionKey: K,
    editedData: (typeof sections)[K]['editedData']
  ) => {
    setSections((prev) => ({
      ...prev,
      [sectionKey]: {
        ...prev[sectionKey],
        editedData,
      },
    }));
  };

  // Bulk actions
  const approveAllExtracted = () => {
    setSections((prev) => ({
      personal: prev.personal.isExtracted ? { ...prev.personal, status: 'approved' } : prev.personal,
      summary: prev.summary.isExtracted ? { ...prev.summary, status: 'approved' } : prev.summary,
      education: prev.education.isExtracted ? { ...prev.education, status: 'approved' } : prev.education,
      experience: prev.experience.isExtracted ? { ...prev.experience, status: 'approved' } : prev.experience,
      skills: prev.skills.isExtracted ? { ...prev.skills, status: 'approved' } : prev.skills,
      projects: prev.projects.isExtracted ? { ...prev.projects, status: 'approved' } : prev.projects,
      certifications: prev.certifications.isExtracted ? { ...prev.certifications, status: 'approved' } : prev.certifications,
    }));
  };

  const rejectAll = () => {
    setSections((prev) => ({
      personal: { ...prev.personal, status: 'rejected' },
      summary: { ...prev.summary, status: 'rejected' },
      education: { ...prev.education, status: 'rejected' },
      experience: { ...prev.experience, status: 'rejected' },
      skills: { ...prev.skills, status: 'rejected' },
      projects: { ...prev.projects, status: 'rejected' },
      certifications: { ...prev.certifications, status: 'rejected' },
    }));
  };

  // Count approved / pending / rejected
  const sectionKeys = Object.keys(sections) as (keyof typeof sections)[];
  const approvedCount = sectionKeys.filter((k) => sections[k].status === 'approved').length;
  const pendingCount = sectionKeys.filter((k) => sections[k].status === 'pending').length;
  const rejectedCount = sectionKeys.filter((k) => sections[k].status === 'rejected').length;

  const handleApply = () => {
    const payload: Partial<CandidateProfile> = {};

    if (sections.personal.status === 'approved') {
      payload.personalInfo = sections.personal.editedData;
    }
    if (sections.summary.status === 'approved') {
      payload.summary = sections.summary.editedData;
    }
    if (sections.education.status === 'approved') {
      payload.education = sections.education.editedData;
    }
    if (sections.experience.status === 'approved') {
      payload.workExperience = sections.experience.editedData;
    }
    if (sections.skills.status === 'approved') {
      payload.technicalSkills = sections.skills.editedData;
    }
    if (sections.projects.status === 'approved') {
      payload.projects = sections.projects.editedData;
    }
    if (sections.certifications.status === 'approved') {
      payload.certifications = sections.certifications.editedData;
    }

    onApplyApproved(payload);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Document Metadata Header */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-center shrink-0">
              <FileTextIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                  CV Extraction Review
                </h2>
                <span className="text-xs px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-mono">
                  {extraction.originalFilename}
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                {(extraction.fileSize / 1024).toFixed(0)} KB • {extraction.charCount} characters
                parsed • Staged locally
              </p>
            </div>
          </div>

          {/* Review Progress Summary Pills */}
          <div className="flex items-center gap-2 self-start md:self-center">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300">
              <CheckCircleIcon className="w-3.5 h-3.5" />
              {approvedCount} Approved
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300">
              {pendingCount} Pending
            </span>
            {rejectedCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300">
                <XIcon className="w-3.5 h-3.5" />
                {rejectedCount} Rejected
              </span>
            )}
          </div>
        </div>

        {/* Global Review Control & Unextracted Notice */}
        <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-zinc-600 dark:text-zinc-400">
          <div>
            {extraction.unextractedSections.length > 0 ? (
              <div className="flex items-center gap-2 text-amber-800 dark:text-amber-400">
                <AlertCircleIcon className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  <strong>Unextracted sections:</strong>{' '}
                  {extraction.unextractedSections.join(', ')}. (These will remain unchanged in your
                  profile).
                </span>
              </div>
            ) : (
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                Information was detected across all major resume sections.
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={approveAllExtracted}
              className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              Approve all extracted
            </button>
            <span className="text-zinc-300 dark:text-zinc-700">|</span>
            <button
              type="button"
              onClick={rejectAll}
              className="text-xs font-medium text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            >
              Reject all
            </button>
          </div>
        </div>
      </div>

      {/* Review Section Cards List */}
      <div className="space-y-6">
        <PersonalInfoReviewCard
          review={sections.personal}
          existingProfile={existingProfile}
          onUpdate={(val) => updateEditedData('personal', val)}
          onStatusChange={(st) => updateStatus('personal', st)}
        />

        <SummaryReviewCard
          review={sections.summary}
          existingProfile={existingProfile}
          onUpdate={(val) => updateEditedData('summary', val)}
          onStatusChange={(st) => updateStatus('summary', st)}
        />

        <EducationReviewCard
          review={sections.education}
          existingProfile={existingProfile}
          onUpdate={(val) => updateEditedData('education', val)}
          onStatusChange={(st) => updateStatus('education', st)}
        />

        <ExperienceReviewCard
          review={sections.experience}
          existingProfile={existingProfile}
          onUpdate={(val) => updateEditedData('experience', val)}
          onStatusChange={(st) => updateStatus('experience', st)}
        />

        <SkillsReviewCard
          review={sections.skills}
          existingProfile={existingProfile}
          onUpdate={(val) => updateEditedData('skills', val)}
          onStatusChange={(st) => updateStatus('skills', st)}
        />

        <ProjectsReviewCard
          review={sections.projects}
          existingProfile={existingProfile}
          onUpdate={(val) => updateEditedData('projects', val)}
          onStatusChange={(st) => updateStatus('projects', st)}
        />

        <CertificationsReviewCard
          review={sections.certifications}
          existingProfile={existingProfile}
          onUpdate={(val) => updateEditedData('certifications', val)}
          onStatusChange={(st) => updateStatus('certifications', st)}
        />
      </div>

      {/* Sticky Bottom Actions Bar */}
      <div className="sticky bottom-4 z-20 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="text-xs text-zinc-600 dark:text-zinc-400">
          <strong className="font-semibold text-zinc-900 dark:text-zinc-100">
            {approvedCount} of 7 sections
          </strong>{' '}
          approved. Only approved sections will be merged into your candidate profile.
        </div>

        <div className="flex items-center gap-2.5 self-end sm:self-auto">
          <Button type="button" variant="outline" size="sm" onClick={onDiscard}>
            Discard & Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            icon={<CheckCircleIcon className="w-3.5 h-3.5" />}
            onClick={handleApply}
            disabled={approvedCount === 0}
          >
            Apply Approved Sections ({approvedCount})
          </Button>
        </div>
      </div>
    </div>
  );
}
