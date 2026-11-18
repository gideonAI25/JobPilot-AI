import React from 'react';
import { PersonalInformation, SectionStatus } from '@/types/profile';
import { SectionCard } from '../common/SectionCard';
import { InputField } from '../common/FormControls';
import { UserIcon } from '@/components/icons/Icons';

interface PersonalInfoSectionProps {
  data: PersonalInformation;
  status: SectionStatus;
  isDirty: boolean;
  onChange: (data: PersonalInformation) => void;
  onSave: () => void;
  onCancel: () => void;
}

export function PersonalInfoSection({
  data,
  status,
  isDirty,
  onChange,
  onSave,
  onCancel,
}: PersonalInfoSectionProps) {
  const updateField = (field: keyof PersonalInformation, value: string) => {
    onChange({
      ...data,
      [field]: value,
    });
  };

  return (
    <SectionCard
      title="Personal Information"
      description="Primary identity, contact coordinates, and online professional links"
      icon={<UserIcon className="w-5 h-5" />}
      status={status}
      isDirty={isDirty}
      onSave={onSave}
      onCancel={onCancel}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <InputField
          label="Full Name"
          name="fullName"
          value={data.fullName}
          onChange={(e) => updateField('fullName', e.target.value)}
          placeholder="e.g. Alex Morgan"
          required
        />

        <InputField
          label="Email Address"
          name="email"
          type="email"
          value={data.email}
          onChange={(e) => updateField('email', e.target.value)}
          placeholder="e.g. alex.morgan@example.com"
          required
        />

        <InputField
          label="Phone Number"
          name="phone"
          type="tel"
          value={data.phone}
          onChange={(e) => updateField('phone', e.target.value)}
          placeholder="e.g. +1 (555) 019-2834"
          required
        />

        <InputField
          label="Country"
          name="country"
          value={data.country}
          onChange={(e) => updateField('country', e.target.value)}
          placeholder="e.g. United States"
          required
        />

        <InputField
          label="City / Region"
          name="city"
          value={data.city}
          onChange={(e) => updateField('city', e.target.value)}
          placeholder="e.g. San Francisco, CA"
          required
        />

        <InputField
          label="LinkedIn URL"
          name="linkedInUrl"
          type="url"
          value={data.linkedInUrl}
          onChange={(e) => updateField('linkedInUrl', e.target.value)}
          placeholder="e.g. https://linkedin.com/in/alexmorgan"
          helperText="Public profile link used for recruiter reference"
        />

        <div className="md:col-span-2">
          <InputField
            label="Portfolio / Personal Website"
            name="portfolioUrl"
            type="url"
            value={data.portfolioUrl}
            onChange={(e) => updateField('portfolioUrl', e.target.value)}
            placeholder="e.g. https://alexmorgan.dev"
            helperText="Personal portfolio, blog, or GitHub link"
          />
        </div>
      </div>
    </SectionCard>
  );
}
