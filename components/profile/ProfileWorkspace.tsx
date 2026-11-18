'use client';

import React, { useState } from 'react';
import { useProfile } from '@/hooks/useProfile';
import { ProfileHeader } from './ProfileHeader';
import { ProfileSidebar } from './ProfileSidebar';
import { PersonalInfoSection } from './sections/PersonalInfoSection';
import { ProfessionalSummarySection } from './sections/ProfessionalSummarySection';
import { EducationSection } from './sections/EducationSection';
import { WorkExperienceSection } from './sections/WorkExperienceSection';
import { TechnicalSkillsSection } from './sections/TechnicalSkillsSection';
import { ProjectsSection } from './sections/ProjectsSection';
import { CertificationsSection } from './sections/CertificationsSection';
import { EmploymentPreferencesSection } from './sections/EmploymentPreferencesSection';
import { StandardAnswersSection } from './sections/StandardAnswersSection';
import { CVDocumentsSection } from './sections/CVDocumentsSection';
import { CVUploadDropzone } from '@/components/cvExtraction/CVUploadDropzone';
import { CVReviewWorkspace } from '@/components/cvExtraction/CVReviewWorkspace';
import { CVExtractionResult } from '@/types/cvExtraction';
import { CandidateProfile } from '@/types/profile';

export function ProfileWorkspace() {
  const {
    profile,
    draftProfile,
    activeSection,
    setActiveSection,
    isLoaded,
    isDirty,
    statusMessage,
    completion,
    updateDraft,
    saveCurrentSection,
    cancelCurrentSection,
    addListItem,
    updateListItem,
    removeListItem,
    importFromJson,
    resetProfile,
    reloadProfile,
    mergeApprovedSections,
  } = useProfile();

  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [activeExtraction, setActiveExtraction] = useState<CVExtractionResult | null>(null);

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-zinc-500 font-medium">Loading Candidate Profile...</p>
        </div>
      </div>
    );
  }

  const handleExtractionSuccess = (result: CVExtractionResult) => {
    setActiveExtraction(result);
    setIsUploadOpen(false);
    reloadProfile();
  };

  const handleApplyApproved = (approvedPayload: Partial<CandidateProfile>) => {
    mergeApprovedSections(approvedPayload);
    setActiveExtraction(null);
  };

  const handleDiscardExtraction = () => {
    setActiveExtraction(null);
  };

  const renderActiveSection = () => {
    switch (activeSection) {
      case 'personal':
        return (
          <PersonalInfoSection
            data={draftProfile.personalInfo}
            status={completion.sections.personal}
            isDirty={isDirty}
            onChange={(val) => updateDraft('personalInfo', val)}
            onSave={saveCurrentSection}
            onCancel={cancelCurrentSection}
          />
        );

      case 'summary':
        return (
          <ProfessionalSummarySection
            data={draftProfile.summary}
            status={completion.sections.summary}
            isDirty={isDirty}
            onChange={(val) => updateDraft('summary', val)}
            onSave={saveCurrentSection}
            onCancel={cancelCurrentSection}
          />
        );

      case 'education':
        return (
          <EducationSection
            entries={profile.education}
            status={completion.sections.education}
            onAdd={(entry) => addListItem('education', entry)}
            onUpdate={(id, updated) => updateListItem('education', id, updated)}
            onRemove={(id) => removeListItem('education', id)}
          />
        );

      case 'experience':
        return (
          <WorkExperienceSection
            entries={profile.workExperience}
            status={completion.sections.experience}
            onAdd={(entry) => addListItem('workExperience', entry)}
            onUpdate={(id, updated) => updateListItem('workExperience', id, updated)}
            onRemove={(id) => removeListItem('workExperience', id)}
          />
        );

      case 'skills':
        return (
          <TechnicalSkillsSection
            skills={profile.technicalSkills}
            status={completion.sections.skills}
            onAdd={(skill) => addListItem('technicalSkills', skill)}
            onRemove={(id) => removeListItem('technicalSkills', id)}
          />
        );

      case 'projects':
        return (
          <ProjectsSection
            projects={profile.projects}
            status={completion.sections.projects}
            onAdd={(proj) => addListItem('projects', proj)}
            onUpdate={(id, updated) => updateListItem('projects', id, updated)}
            onRemove={(id) => removeListItem('projects', id)}
          />
        );

      case 'certifications':
        return (
          <CertificationsSection
            certifications={profile.certifications}
            status={completion.sections.certifications}
            onAdd={(cert) => addListItem('certifications', cert)}
            onUpdate={(id, updated) => updateListItem('certifications', id, updated)}
            onRemove={(id) => removeListItem('certifications', id)}
          />
        );

      case 'preferences':
        return (
          <EmploymentPreferencesSection
            data={draftProfile.preferences}
            status={completion.sections.preferences}
            isDirty={isDirty}
            onChange={(val) => updateDraft('preferences', val)}
            onSave={saveCurrentSection}
            onCancel={cancelCurrentSection}
          />
        );

      case 'standard-answers':
        return (
          <StandardAnswersSection
            entries={profile.standardAnswers}
            status={completion.sections['standard-answers']}
            onAdd={(entry) => addListItem('standardAnswers', entry)}
            onUpdate={(id, updated) => updateListItem('standardAnswers', id, updated)}
            onRemove={(id) => removeListItem('standardAnswers', id)}
          />
        );

      case 'cv-documents':
        return (
          <CVDocumentsSection
            documents={profile.cvDocuments || []}
            status={completion.sections['cv-documents']}
            onOpenUpload={() => setIsUploadOpen(true)}
            onRefresh={reloadProfile}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 flex flex-col font-sans">
      {/* Top Application Header */}
      <ProfileHeader
        profile={profile}
        statusMessage={statusMessage}
        onImport={importFromJson}
        onReset={resetProfile}
        onOpenUploadCV={() => setIsUploadOpen(true)}
      />

      {/* Main Workspace Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* State A: CV Review Mode is active */}
        {activeExtraction ? (
          <div className="space-y-6">
            <CVReviewWorkspace
              extraction={activeExtraction}
              existingProfile={profile}
              onApplyApproved={handleApplyApproved}
              onDiscard={handleDiscardExtraction}
            />
          </div>
        ) : isUploadOpen ? (
          /* State B: Upload Dropzone is active */
          <div className="py-6">
            <CVUploadDropzone
              onExtractionSuccess={handleExtractionSuccess}
              onCancel={() => setIsUploadOpen(false)}
            />
          </div>
        ) : (
          /* State C: Standard Profile Management Dashboard */
          <div className="flex flex-col lg:flex-row gap-8 items-start">
            {/* Navigation Sidebar with Completion Metrics */}
            <ProfileSidebar
              activeSection={activeSection}
              onSelectSection={setActiveSection}
              completion={completion}
              isDirty={isDirty}
            />

            {/* Active Section Form / Content */}
            <section className="flex-1 w-full min-w-0">
              {renderActiveSection()}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
