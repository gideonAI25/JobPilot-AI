import React from 'react';
import { ProfessionalSummary, SectionStatus } from '@/types/profile';
import { SectionCard } from '../common/SectionCard';
import { InputField, TextAreaField } from '../common/FormControls';
import { FileTextIcon } from '@/components/icons/Icons';

interface ProfessionalSummarySectionProps {
  data: ProfessionalSummary;
  status: SectionStatus;
  isDirty: boolean;
  onChange: (data: ProfessionalSummary) => void;
  onSave: () => void;
  onCancel: () => void;
}

export function ProfessionalSummarySection({
  data,
  status,
  isDirty,
  onChange,
  onSave,
  onCancel,
}: ProfessionalSummarySectionProps) {
  const updateField = (field: keyof ProfessionalSummary, value: string) => {
    onChange({
      ...data,
      [field]: value,
    });
  };

  return (
    <SectionCard
      title="Professional Summary"
      description="Your high-impact professional headline and executive bio used to calibrate AI job matching"
      icon={<FileTextIcon className="w-5 h-5" />}
      status={status}
      isDirty={isDirty}
      onSave={onSave}
      onCancel={onCancel}
    >
      <div className="space-y-5">
        <InputField
          label="Professional Headline"
          name="headline"
          value={data.headline}
          onChange={(e) => updateField('headline', e.target.value)}
          placeholder="e.g. Senior Full-Stack Engineer | Next.js, Node.js & Distributed Systems"
          helperText="A concise summary of your current professional focus and seniority"
          required
        />

        <TextAreaField
          label="Professional Summary / About"
          name="summary"
          rows={6}
          value={data.summary}
          onChange={(e) => updateField('summary', e.target.value)}
          placeholder="Provide a comprehensive overview of your background, core technical strengths, types of problems you solve, and what sets you apart. Gemini will reference this when tailoring cover letters and answers."
          helperText="Verified text describing your experience, values, and strengths"
          required
        />
      </div>
    </SectionCard>
  );
}
