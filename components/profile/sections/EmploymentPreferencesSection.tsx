import React from 'react';
import {
  EmploymentPreferences,
  EmploymentType,
  SeniorityLevel,
  RemotePreference,
  SalaryPeriod,
  SectionStatus,
} from '@/types/profile';
import { SectionCard } from '../common/SectionCard';
import { InputField, SelectField, TagInput } from '../common/FormControls';
import { SlidersIcon } from '@/components/icons/Icons';

interface EmploymentPreferencesSectionProps {
  data: EmploymentPreferences;
  status: SectionStatus;
  isDirty: boolean;
  onChange: (data: EmploymentPreferences) => void;
  onSave: () => void;
  onCancel: () => void;
}

const EMPLOYMENT_TYPES: { value: EmploymentType; label: string }[] = [
  { value: 'full-time', label: 'Full-time' },
  { value: 'contract', label: 'Contract' },
  { value: 'part-time', label: 'Part-time' },
  { value: 'freelance', label: 'Freelance' },
  { value: 'internship', label: 'Internship' },
];

const SENIORITY_LEVELS: { value: SeniorityLevel; label: string }[] = [
  { value: 'Junior', label: 'Junior' },
  { value: 'Mid-Level', label: 'Mid-Level' },
  { value: 'Senior', label: 'Senior' },
  { value: 'Lead', label: 'Lead' },
  { value: 'Staff / Principal', label: 'Staff / Principal' },
  { value: 'Director / Executive', label: 'Director / Executive' },
];

const REMOTE_PREFERENCES: { value: RemotePreference; label: string }[] = [
  { value: 'remote-only', label: 'Remote Only (Strict)' },
  { value: 'hybrid', label: 'Hybrid / Open to Hybrid' },
  { value: 'onsite-or-remote', label: 'Onsite or Remote' },
  { value: 'any', label: 'Any / Flexible' },
];

const SALARY_PERIODS: { value: SalaryPeriod; label: string }[] = [
  { value: 'yearly', label: 'Per Year (Annual)' },
  { value: 'monthly', label: 'Per Month' },
  { value: 'hourly', label: 'Per Hour' },
];

export function EmploymentPreferencesSection({
  data,
  status,
  isDirty,
  onChange,
  onSave,
  onCancel,
}: EmploymentPreferencesSectionProps) {
  const toggleEmploymentType = (type: EmploymentType) => {
    const current = data.preferredEmploymentTypes || [];
    const updated = current.includes(type)
      ? current.filter((t) => t !== type)
      : [...current, type];
    onChange({ ...data, preferredEmploymentTypes: updated });
  };

  const toggleSeniority = (level: SeniorityLevel) => {
    const current = data.preferredSeniority || [];
    const updated = current.includes(level)
      ? current.filter((s) => s !== level)
      : [...current, level];
    onChange({ ...data, preferredSeniority: updated });
  };

  return (
    <SectionCard
      title="Employment Preferences"
      description="Define the specific roles, remote parameters, geographic restrictions, and compensation expectations"
      icon={<SlidersIcon className="w-5 h-5" />}
      status={status}
      isDirty={isDirty}
      onSave={onSave}
      onCancel={onCancel}
    >
      <div className="space-y-6">
        {/* Target Job Titles */}
        <TagInput
          label="Target Job Titles"
          tags={data.targetJobTitles || []}
          onChange={(tags) => onChange({ ...data, targetJobTitles: tags })}
          placeholder="e.g. Senior Frontend Engineer, Full-Stack Developer..."
          helperText="Job discovery engines and scrapers will filter matches against these titles"
          required
        />

        {/* Remote Work Preference */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <SelectField
            label="Remote Work Preference"
            name="remoteWorkPreference"
            value={data.remoteWorkPreference}
            onChange={(e) =>
              onChange({
                ...data,
                remoteWorkPreference: e.target.value as RemotePreference,
              })
            }
            options={REMOTE_PREFERENCES}
            helperText="JobPilot AI focuses primarily on remote discovery"
            required
          />

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
              Minimum Salary Expectation (Optional)
            </label>
            <div className="grid grid-cols-3 gap-2">
              <input
                type="text"
                value={data.minSalaryExpectation?.currency || 'USD'}
                onChange={(e) =>
                  onChange({
                    ...data,
                    minSalaryExpectation: {
                      ...data.minSalaryExpectation,
                      currency: e.target.value.toUpperCase(),
                    },
                  })
                }
                placeholder="USD"
                className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900/80 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100"
              />
              <input
                type="number"
                value={data.minSalaryExpectation?.amount ?? ''}
                onChange={(e) =>
                  onChange({
                    ...data,
                    minSalaryExpectation: {
                      ...data.minSalaryExpectation,
                      amount: e.target.value ? Number(e.target.value) : null,
                    },
                  })
                }
                placeholder="e.g. 130000"
                className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900/80 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100"
              />
              <select
                value={data.minSalaryExpectation?.period || 'yearly'}
                onChange={(e) =>
                  onChange({
                    ...data,
                    minSalaryExpectation: {
                      ...data.minSalaryExpectation,
                      period: e.target.value as SalaryPeriod,
                    },
                  })
                }
                className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900/80 px-2 py-2 text-xs text-zinc-900 dark:text-zinc-100"
              >
                {SALARY_PERIODS.map((sp) => (
                  <option key={sp.value} value={sp.value}>
                    {sp.label}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-xs text-zinc-500">
              Jobs with disclosed salaries below this threshold will be flagged during AI evaluation
            </p>
          </div>
        </div>

        {/* Preferred Employment Types */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
            Preferred Employment Types <span className="text-rose-500">*</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {EMPLOYMENT_TYPES.map((type) => {
              const checked = data.preferredEmploymentTypes?.includes(type.value);
              return (
                <button
                  type="button"
                  key={type.value}
                  onClick={() => toggleEmploymentType(type.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                    checked
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                      : 'bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                  }`}
                >
                  {type.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Preferred Seniority */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
            Target Seniority Level(s) <span className="text-rose-500">*</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {SENIORITY_LEVELS.map((level) => {
              const checked = data.preferredSeniority?.includes(level.value);
              return (
                <button
                  type="button"
                  key={level.value}
                  onClick={() => toggleSeniority(level.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                    checked
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                      : 'bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                  }`}
                >
                  {level.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Geographic Preferences & Exclusions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <TagInput
            label="Preferred Countries / Eligible Jurisdictions"
            tags={data.preferredCountries || []}
            onChange={(tags) => onChange({ ...data, preferredCountries: tags })}
            placeholder="e.g. United States, Canada, European Union, Worldwide..."
            helperText="Countries where you are eligible and willing to work remotely"
          />

          <TagInput
            label="Excluded Locations / Timezones to Avoid"
            tags={data.excludedLocations || []}
            onChange={(tags) => onChange({ ...data, excludedLocations: tags })}
            placeholder="e.g. Onsite only, APAC timezones..."
            helperText="Matches in these locations or timezones will be filtered out"
          />
        </div>
      </div>
    </SectionCard>
  );
}
