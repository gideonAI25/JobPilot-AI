import React, { useState } from 'react';
import {
  PersonalInformation,
  ProfessionalSummary,
  EducationEntry,
  WorkExperienceEntry,
  TechnicalSkillEntry,
  ProjectEntry,
  CertificationEntry,
  CandidateProfile,
} from '@/types/profile';
import { ExtractedSectionReview, ReviewStatus } from '@/types/cvExtraction';
import {
  CheckCircleIcon,
  XIcon,
  AlertCircleIcon,
  FileTextIcon,
  EditIcon,
  TrashIcon,
} from '@/components/icons/Icons';
import { Button, InputField, TextAreaField } from '@/components/profile/common/FormControls';

// ========================================================
// Reusable Section Wrapper
// ========================================================
interface ReviewSectionWrapperProps {
  title: string;
  status: ReviewStatus;
  isExtracted: boolean;
  confidence: 'high' | 'medium' | 'low';
  missingFields: string[];
  rawSnippet?: string;
  hasExistingProfileData: boolean;
  onApprove: () => void;
  onReject: () => void;
  onReset: () => void;
  children: React.ReactNode;
}

export function ReviewSectionWrapper({
  title,
  status,
  isExtracted,
  confidence,
  missingFields,
  rawSnippet,
  hasExistingProfileData,
  onApprove,
  onReject,
  onReset,
  children,
}: ReviewSectionWrapperProps) {
  const [showRawSnippet, setShowRawSnippet] = useState(false);

  return (
    <div
      className={`rounded-2xl border transition-all overflow-hidden ${
        status === 'approved'
          ? 'border-emerald-300 dark:border-emerald-800/80 bg-white dark:bg-zinc-900 shadow-xs ring-1 ring-emerald-500/20'
          : status === 'rejected'
          ? 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 opacity-70'
          : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs'
      }`}
    >
      {/* Header */}
      <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-50/40 dark:bg-zinc-900/40">
        <div>
          <div className="flex items-center gap-2.5">
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">{title}</h3>

            {/* Status Badge */}
            {status === 'approved' ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                <CheckCircleIcon className="w-3.5 h-3.5" />
                Approved for Profile
              </span>
            ) : status === 'rejected' ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                <XIcon className="w-3.5 h-3.5" />
                Rejected (Will Not Apply)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                Pending Review
              </span>
            )}

            {/* Confidence Badge */}
            {isExtracted && (
              <span
                className={`text-[10px] uppercase font-semibold px-2 py-0.5 rounded border ${
                  confidence === 'high'
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200'
                    : confidence === 'medium'
                    ? 'bg-yellow-50 text-yellow-800 dark:bg-yellow-950/60 dark:text-yellow-300 border-yellow-200'
                    : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 border-zinc-200'
                }`}
              >
                {confidence} Confidence
              </span>
            )}
          </div>

          {!isExtracted && (
            <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">
              Could not detect or extract this section from the uploaded CV.
            </p>
          )}
        </div>

        {/* Section Actions */}
        <div className="flex items-center gap-2 self-end sm:self-center">
          {rawSnippet && (
            <button
              type="button"
              onClick={() => setShowRawSnippet(!showRawSnippet)}
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 mr-1"
            >
              <FileTextIcon className="w-3.5 h-3.5" />
              <span>{showRawSnippet ? 'Hide Source' : 'View Source'}</span>
            </button>
          )}

          {status !== 'approved' && (
            <Button
              type="button"
              variant="primary"
              size="sm"
              icon={<CheckCircleIcon className="w-3.5 h-3.5" />}
              onClick={onApprove}
            >
              Approve
            </Button>
          )}

          {status !== 'rejected' && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              icon={<XIcon className="w-3.5 h-3.5 text-rose-500" />}
              onClick={onReject}
            >
              Reject
            </Button>
          )}

          {status !== 'pending' && (
            <Button type="button" variant="ghost" size="sm" onClick={onReset}>
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* Raw CV snippet preview if toggled */}
      {showRawSnippet && rawSnippet && (
        <div className="bg-zinc-100 dark:bg-zinc-950 p-4 border-b border-zinc-200 dark:border-zinc-800 text-xs font-mono text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap max-h-48 overflow-y-auto">
          <div className="font-sans font-semibold text-[11px] uppercase tracking-wider text-zinc-500 mb-1">
            Original CV Text Fragment:
          </div>
          {rawSnippet}
        </div>
      )}

      {/* Missing Fields Warning */}
      {missingFields.length > 0 && (
        <div className="px-5 py-2 bg-amber-50/70 dark:bg-amber-950/30 border-b border-amber-200/50 dark:border-amber-900/40 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
          <AlertCircleIcon className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span>
            <strong>Could not extract:</strong> {missingFields.join(', ')}
          </span>
        </div>
      )}

      {/* Existing Profile Data Conflict Notice */}
      {hasExistingProfileData && (
        <div className="px-5 py-2 bg-blue-50/70 dark:bg-blue-950/30 border-b border-blue-200/50 dark:border-blue-900/40 text-xs text-blue-800 dark:text-blue-300 flex items-center gap-2">
          <AlertCircleIcon className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          <span>
            You already have verified information in this section. Approving will update it with this reviewed content.
          </span>
        </div>
      )}

      {/* Children content (Editable fields) */}
      <div className="p-5">{children}</div>
    </div>
  );
}

// ========================================================
// Personal Information Review Card
// ========================================================
interface PersonalInfoReviewCardProps {
  review: ExtractedSectionReview<PersonalInformation>;
  existingProfile: CandidateProfile;
  onUpdate: (updated: PersonalInformation) => void;
  onStatusChange: (status: ReviewStatus) => void;
}

export function PersonalInfoReviewCard({
  review,
  existingProfile,
  onUpdate,
  onStatusChange,
}: PersonalInfoReviewCardProps) {
  const data = review.editedData;
  const hasExisting = Boolean(existingProfile.personalInfo.fullName?.trim());

  return (
    <ReviewSectionWrapper
      title="Personal Information"
      status={review.status}
      isExtracted={review.isExtracted}
      confidence={review.confidence}
      missingFields={review.missingFields}
      rawSnippet={review.rawSnippet}
      hasExistingProfileData={hasExisting}
      onApprove={() => onStatusChange('approved')}
      onReject={() => onStatusChange('rejected')}
      onReset={() => onStatusChange('pending')}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <InputField
          label="Full Name"
          value={data.fullName}
          onChange={(e) => onUpdate({ ...data, fullName: e.target.value })}
          placeholder="Full Name"
        />
        <InputField
          label="Email Address"
          value={data.email}
          onChange={(e) => onUpdate({ ...data, email: e.target.value })}
          placeholder="Email Address"
        />
        <InputField
          label="Phone Number"
          value={data.phone}
          onChange={(e) => onUpdate({ ...data, phone: e.target.value })}
          placeholder="Phone Number"
        />
        <div className="grid grid-cols-2 gap-2">
          <InputField
            label="City"
            value={data.city}
            onChange={(e) => onUpdate({ ...data, city: e.target.value })}
            placeholder="City"
          />
          <InputField
            label="Country"
            value={data.country}
            onChange={(e) => onUpdate({ ...data, country: e.target.value })}
            placeholder="Country"
          />
        </div>
        <InputField
          label="LinkedIn URL"
          value={data.linkedInUrl}
          onChange={(e) => onUpdate({ ...data, linkedInUrl: e.target.value })}
          placeholder="https://linkedin.com/in/..."
        />
        <InputField
          label="Portfolio / GitHub"
          value={data.portfolioUrl}
          onChange={(e) => onUpdate({ ...data, portfolioUrl: e.target.value })}
          placeholder="https://..."
        />
      </div>
    </ReviewSectionWrapper>
  );
}

// ========================================================
// Summary Review Card
// ========================================================
interface SummaryReviewCardProps {
  review: ExtractedSectionReview<ProfessionalSummary>;
  existingProfile: CandidateProfile;
  onUpdate: (updated: ProfessionalSummary) => void;
  onStatusChange: (status: ReviewStatus) => void;
}

export function SummaryReviewCard({
  review,
  existingProfile,
  onUpdate,
  onStatusChange,
}: SummaryReviewCardProps) {
  const data = review.editedData;
  const hasExisting = Boolean(existingProfile.summary.summary?.trim());

  return (
    <ReviewSectionWrapper
      title="Professional Summary"
      status={review.status}
      isExtracted={review.isExtracted}
      confidence={review.confidence}
      missingFields={review.missingFields}
      rawSnippet={review.rawSnippet}
      hasExistingProfileData={hasExisting}
      onApprove={() => onStatusChange('approved')}
      onReject={() => onStatusChange('rejected')}
      onReset={() => onStatusChange('pending')}
    >
      <div className="space-y-4">
        <InputField
          label="Professional Headline"
          value={data.headline}
          onChange={(e) => onUpdate({ ...data, headline: e.target.value })}
          placeholder="e.g. Senior Software Engineer"
        />
        <TextAreaField
          label="Professional Summary"
          rows={4}
          value={data.summary}
          onChange={(e) => onUpdate({ ...data, summary: e.target.value })}
          placeholder="Summary text..."
        />
      </div>
    </ReviewSectionWrapper>
  );
}

// ========================================================
// Education Review Card
// ========================================================
interface EducationReviewCardProps {
  review: ExtractedSectionReview<EducationEntry[]>;
  existingProfile: CandidateProfile;
  onUpdate: (updated: EducationEntry[]) => void;
  onStatusChange: (status: ReviewStatus) => void;
}

export function EducationReviewCard({
  review,
  existingProfile,
  onUpdate,
  onStatusChange,
}: EducationReviewCardProps) {
  const entries = review.editedData;
  const hasExisting = existingProfile.education.length > 0;

  const removeEntry = (index: number) => {
    onUpdate(entries.filter((_, i) => i !== index));
  };

  const updateField = (index: number, field: keyof EducationEntry, val: string) => {
    const next = [...entries];
    next[index] = { ...next[index], [field]: val };
    onUpdate(next);
  };

  return (
    <ReviewSectionWrapper
      title={`Education (${entries.length} extracted)`}
      status={review.status}
      isExtracted={review.isExtracted}
      confidence={review.confidence}
      missingFields={review.missingFields}
      rawSnippet={review.rawSnippet}
      hasExistingProfileData={hasExisting}
      onApprove={() => onStatusChange('approved')}
      onReject={() => onStatusChange('rejected')}
      onReset={() => onStatusChange('pending')}
    >
      {entries.length === 0 ? (
        <p className="text-xs text-zinc-500 italic">No education entries found.</p>
      ) : (
        <div className="space-y-4">
          {entries.map((entry, idx) => (
            <div
              key={entry.id || idx}
              className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/40 relative space-y-3"
            >
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Record #{idx + 1}
                </span>
                <button
                  type="button"
                  onClick={() => removeEntry(idx)}
                  className="text-rose-500 hover:text-rose-700 p-1 text-xs"
                >
                  <TrashIcon className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <InputField
                  label="Institution"
                  value={entry.institution}
                  onChange={(e) => updateField(idx, 'institution', e.target.value)}
                />
                <InputField
                  label="Degree"
                  value={entry.degree}
                  onChange={(e) => updateField(idx, 'degree', e.target.value)}
                />
                <InputField
                  label="Field of Study"
                  value={entry.fieldOfStudy}
                  onChange={(e) => updateField(idx, 'fieldOfStudy', e.target.value)}
                />
                <div className="grid grid-cols-2 gap-2">
                  <InputField
                    label="Start Date"
                    value={entry.startDate}
                    onChange={(e) => updateField(idx, 'startDate', e.target.value)}
                  />
                  <InputField
                    label="Graduation Date"
                    value={entry.graduationDate}
                    onChange={(e) => updateField(idx, 'graduationDate', e.target.value)}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </ReviewSectionWrapper>
  );
}

// ========================================================
// Work Experience Review Card
// ========================================================
interface ExperienceReviewCardProps {
  review: ExtractedSectionReview<WorkExperienceEntry[]>;
  existingProfile: CandidateProfile;
  onUpdate: (updated: WorkExperienceEntry[]) => void;
  onStatusChange: (status: ReviewStatus) => void;
}

export function ExperienceReviewCard({
  review,
  existingProfile,
  onUpdate,
  onStatusChange,
}: ExperienceReviewCardProps) {
  const entries = review.editedData;
  const hasExisting = existingProfile.workExperience.length > 0;

  const removeEntry = (index: number) => {
    onUpdate(entries.filter((_, i) => i !== index));
  };

  const updateField = (index: number, field: keyof WorkExperienceEntry, val: any) => {
    const next = [...entries];
    next[index] = { ...next[index], [field]: val };
    onUpdate(next);
  };

  return (
    <ReviewSectionWrapper
      title={`Work Experience (${entries.length} extracted)`}
      status={review.status}
      isExtracted={review.isExtracted}
      confidence={review.confidence}
      missingFields={review.missingFields}
      rawSnippet={review.rawSnippet}
      hasExistingProfileData={hasExisting}
      onApprove={() => onStatusChange('approved')}
      onReject={() => onStatusChange('rejected')}
      onReset={() => onStatusChange('pending')}
    >
      {entries.length === 0 ? (
        <p className="text-xs text-zinc-500 italic">No work experience records found.</p>
      ) : (
        <div className="space-y-4">
          {entries.map((entry, idx) => (
            <div
              key={entry.id || idx}
              className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/40 space-y-3"
            >
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Role #{idx + 1}
                </span>
                <button
                  type="button"
                  onClick={() => removeEntry(idx)}
                  className="text-rose-500 hover:text-rose-700 p-1 text-xs"
                >
                  <TrashIcon className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <InputField
                  label="Position / Title"
                  value={entry.position}
                  onChange={(e) => updateField(idx, 'position', e.target.value)}
                />
                <InputField
                  label="Company"
                  value={entry.company}
                  onChange={(e) => updateField(idx, 'company', e.target.value)}
                />
                <InputField
                  label="Start Date"
                  value={entry.startDate}
                  onChange={(e) => updateField(idx, 'startDate', e.target.value)}
                />
                <InputField
                  label="End Date"
                  value={entry.isCurrentRole ? 'Present' : entry.endDate}
                  onChange={(e) => updateField(idx, 'endDate', e.target.value)}
                />
              </div>

              {entry.responsibilities && entry.responsibilities.length > 0 && (
                <div className="text-xs">
                  <span className="font-semibold text-zinc-700 dark:text-zinc-300">Responsibilities:</span>
                  <ul className="list-disc list-inside mt-1 space-y-0.5 text-zinc-600 dark:text-zinc-400">
                    {entry.responsibilities.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}

              {entry.achievements && entry.achievements.length > 0 && (
                <div className="text-xs">
                  <span className="font-semibold text-emerald-700 dark:text-emerald-400">Achievements:</span>
                  <ul className="list-disc list-inside mt-1 space-y-0.5 text-emerald-800/80 dark:text-emerald-300/80">
                    {entry.achievements.map((a, i) => (
                      <li key={i}>{a}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </ReviewSectionWrapper>
  );
}

// ========================================================
// Technical Skills Review Card
// ========================================================
interface SkillsReviewCardProps {
  review: ExtractedSectionReview<TechnicalSkillEntry[]>;
  existingProfile: CandidateProfile;
  onUpdate: (updated: TechnicalSkillEntry[]) => void;
  onStatusChange: (status: ReviewStatus) => void;
}

export function SkillsReviewCard({
  review,
  existingProfile,
  onUpdate,
  onStatusChange,
}: SkillsReviewCardProps) {
  const skills = review.editedData;
  const hasExisting = existingProfile.technicalSkills.length > 0;

  const removeSkill = (index: number) => {
    onUpdate(skills.filter((_, i) => i !== index));
  };

  return (
    <ReviewSectionWrapper
      title={`Technical Skills (${skills.length} extracted)`}
      status={review.status}
      isExtracted={review.isExtracted}
      confidence={review.confidence}
      missingFields={review.missingFields}
      rawSnippet={review.rawSnippet}
      hasExistingProfileData={hasExisting}
      onApprove={() => onStatusChange('approved')}
      onReject={() => onStatusChange('rejected')}
      onReset={() => onStatusChange('pending')}
    >
      <div className="flex flex-wrap gap-2">
        {skills.map((skill, idx) => (
          <span
            key={skill.id || idx}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200"
          >
            <span className="font-medium">{skill.name}</span>
            <span className="text-[10px] text-zinc-400">({skill.category})</span>
            <button
              type="button"
              onClick={() => removeSkill(idx)}
              className="text-zinc-400 hover:text-rose-500"
            >
              <XIcon className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>
    </ReviewSectionWrapper>
  );
}

// ========================================================
// Projects Review Card
// ========================================================
interface ProjectsReviewCardProps {
  review: ExtractedSectionReview<ProjectEntry[]>;
  existingProfile: CandidateProfile;
  onUpdate: (updated: ProjectEntry[]) => void;
  onStatusChange: (status: ReviewStatus) => void;
}

export function ProjectsReviewCard({
  review,
  existingProfile,
  onUpdate,
  onStatusChange,
}: ProjectsReviewCardProps) {
  const projects = review.editedData;
  const hasExisting = existingProfile.projects.length > 0;

  const removeProj = (index: number) => {
    onUpdate(projects.filter((_, i) => i !== index));
  };

  const updateField = (index: number, field: keyof ProjectEntry, val: any) => {
    const next = [...projects];
    next[index] = { ...next[index], [field]: val };
    onUpdate(next);
  };

  return (
    <ReviewSectionWrapper
      title={`Projects (${projects.length} extracted)`}
      status={review.status}
      isExtracted={review.isExtracted}
      confidence={review.confidence}
      missingFields={review.missingFields}
      rawSnippet={review.rawSnippet}
      hasExistingProfileData={hasExisting}
      onApprove={() => onStatusChange('approved')}
      onReject={() => onStatusChange('rejected')}
      onReset={() => onStatusChange('pending')}
    >
      {projects.length === 0 ? (
        <p className="text-xs text-zinc-500 italic">No project records extracted.</p>
      ) : (
        <div className="space-y-3">
          {projects.map((proj, idx) => (
            <div
              key={proj.id || idx}
              className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/40 space-y-2"
            >
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Project #{idx + 1}
                </span>
                <button
                  type="button"
                  onClick={() => removeProj(idx)}
                  className="text-rose-500 hover:text-rose-700 p-1 text-xs"
                >
                  <TrashIcon className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <InputField
                  label="Project Name"
                  value={proj.name}
                  onChange={(e) => updateField(idx, 'name', e.target.value)}
                />
                <InputField
                  label="Project URL"
                  value={proj.projectUrl}
                  onChange={(e) => updateField(idx, 'projectUrl', e.target.value)}
                />
                <div className="sm:col-span-2">
                  <TextAreaField
                    label="Description"
                    rows={2}
                    value={proj.description}
                    onChange={(e) => updateField(idx, 'description', e.target.value)}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </ReviewSectionWrapper>
  );
}

// ========================================================
// Certifications Review Card
// ========================================================
interface CertificationsReviewCardProps {
  review: ExtractedSectionReview<CertificationEntry[]>;
  existingProfile: CandidateProfile;
  onUpdate: (updated: CertificationEntry[]) => void;
  onStatusChange: (status: ReviewStatus) => void;
}

export function CertificationsReviewCard({
  review,
  existingProfile,
  onUpdate,
  onStatusChange,
}: CertificationsReviewCardProps) {
  const certs = review.editedData;
  const hasExisting = existingProfile.certifications.length > 0;

  const removeCert = (index: number) => {
    onUpdate(certs.filter((_, i) => i !== index));
  };

  const updateField = (index: number, field: keyof CertificationEntry, val: any) => {
    const next = [...certs];
    next[index] = { ...next[index], [field]: val };
    onUpdate(next);
  };

  return (
    <ReviewSectionWrapper
      title={`Certifications (${certs.length} extracted)`}
      status={review.status}
      isExtracted={review.isExtracted}
      confidence={review.confidence}
      missingFields={review.missingFields}
      rawSnippet={review.rawSnippet}
      hasExistingProfileData={hasExisting}
      onApprove={() => onStatusChange('approved')}
      onReject={() => onStatusChange('rejected')}
      onReset={() => onStatusChange('pending')}
    >
      {certs.length === 0 ? (
        <p className="text-xs text-zinc-500 italic">No certifications extracted.</p>
      ) : (
        <div className="space-y-3">
          {certs.map((cert, idx) => (
            <div
              key={cert.id || idx}
              className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/40 space-y-2"
            >
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Certification #{idx + 1}
                </span>
                <button
                  type="button"
                  onClick={() => removeCert(idx)}
                  className="text-rose-500 hover:text-rose-700 p-1 text-xs"
                >
                  <TrashIcon className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <InputField
                  label="Certification Name"
                  value={cert.name}
                  onChange={(e) => updateField(idx, 'name', e.target.value)}
                />
                <InputField
                  label="Issuing Organization"
                  value={cert.issuingOrganization}
                  onChange={(e) => updateField(idx, 'issuingOrganization', e.target.value)}
                />
                <InputField
                  label="Date Obtained"
                  value={cert.dateObtained}
                  onChange={(e) => updateField(idx, 'dateObtained', e.target.value)}
                />
                <InputField
                  label="Credential URL"
                  value={cert.credentialUrl}
                  onChange={(e) => updateField(idx, 'credentialUrl', e.target.value)}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </ReviewSectionWrapper>
  );
}
