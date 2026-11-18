import React, { useState } from 'react';
import { WorkExperienceEntry, EmploymentType, SectionStatus } from '@/types/profile';
import { SectionCard } from '../common/SectionCard';
import { InputField, SelectField, TagInput, Button } from '../common/FormControls';
import { BriefcaseIcon, PlusIcon, EditIcon, TrashIcon, XIcon, SaveIcon } from '@/components/icons/Icons';
import { generateId } from '@/services/profileService';

interface WorkExperienceSectionProps {
  entries: WorkExperienceEntry[];
  status: SectionStatus;
  onAdd: (entry: WorkExperienceEntry) => void;
  onUpdate: (id: string, updated: Partial<WorkExperienceEntry>) => void;
  onRemove: (id: string) => void;
}

const EMPLOYMENT_TYPES: { value: EmploymentType; label: string }[] = [
  { value: 'full-time', label: 'Full-time' },
  { value: 'part-time', label: 'Part-time' },
  { value: 'contract', label: 'Contract' },
  { value: 'freelance', label: 'Freelance' },
  { value: 'internship', label: 'Internship' },
];

export function WorkExperienceSection({
  entries,
  status,
  onAdd,
  onUpdate,
  onRemove,
}: WorkExperienceSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState<Omit<WorkExperienceEntry, 'id'>>({
    company: '',
    position: '',
    employmentType: 'full-time',
    startDate: '',
    endDate: '',
    isCurrentRole: false,
    responsibilities: [],
    achievements: [],
  });

  const openNewEntryForm = () => {
    setFormData({
      company: '',
      position: '',
      employmentType: 'full-time',
      startDate: '',
      endDate: '',
      isCurrentRole: false,
      responsibilities: [],
      achievements: [],
    });
    setEditingId(null);
    setIsEditing(true);
  };

  const openEditForm = (entry: WorkExperienceEntry) => {
    setFormData({
      company: entry.company,
      position: entry.position,
      employmentType: entry.employmentType,
      startDate: entry.startDate,
      endDate: entry.endDate,
      isCurrentRole: entry.isCurrentRole,
      responsibilities: entry.responsibilities || [],
      achievements: entry.achievements || [],
    });
    setEditingId(entry.id);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditingId(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.company.trim() || !formData.position.trim()) return;

    if (editingId) {
      onUpdate(editingId, formData);
    } else {
      onAdd({
        id: generateId(),
        ...formData,
      });
    }

    setIsEditing(false);
    setEditingId(null);
  };

  return (
    <SectionCard
      title="Work Experience"
      description="Professional career history, employment types, key responsibilities, and quantified achievements"
      icon={<BriefcaseIcon className="w-5 h-5" />}
      status={status}
      headerAction={
        !isEditing && (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            icon={<PlusIcon className="w-3.5 h-3.5" />}
            onClick={openNewEntryForm}
          >
            Add Experience
          </Button>
        )
      }
    >
      {/* Inline Form */}
      {isEditing && (
        <form
          onSubmit={handleSubmit}
          className="mb-6 p-5 rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/30 dark:bg-indigo-950/20 space-y-4"
        >
          <div className="flex items-center justify-between pb-2 border-b border-indigo-100 dark:border-indigo-900/40">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {editingId ? 'Edit Work Experience' : 'Add New Work Experience'}
            </h3>
            <button
              type="button"
              onClick={handleCancel}
              className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
            >
              <XIcon className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputField
              label="Company Name"
              name="company"
              value={formData.company}
              onChange={(e) => setFormData({ ...formData, company: e.target.value })}
              placeholder="e.g. Stripe"
              required
            />

            <InputField
              label="Position / Job Title"
              name="position"
              value={formData.position}
              onChange={(e) => setFormData({ ...formData, position: e.target.value })}
              placeholder="e.g. Senior Software Engineer"
              required
            />

            <SelectField
              label="Employment Type"
              name="employmentType"
              value={formData.employmentType}
              onChange={(e) =>
                setFormData({ ...formData, employmentType: e.target.value as EmploymentType })
              }
              options={EMPLOYMENT_TYPES}
              required
            />

            <div className="space-y-1.5">
              <div className="grid grid-cols-2 gap-2">
                <InputField
                  label="Start Date"
                  name="startDate"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  placeholder="e.g. Jan 2021"
                />
                <InputField
                  label="End Date"
                  name="endDate"
                  value={formData.isCurrentRole ? 'Present' : formData.endDate}
                  disabled={formData.isCurrentRole}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  placeholder="e.g. Dec 2023"
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer mt-1">
                <input
                  type="checkbox"
                  checked={formData.isCurrentRole}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      isCurrentRole: e.target.checked,
                      endDate: e.target.checked ? '' : formData.endDate,
                    })
                  }
                  className="rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-xs text-zinc-600 dark:text-zinc-400">I currently work here</span>
              </label>
            </div>

            <div className="md:col-span-2">
              <TagInput
                label="Key Responsibilities (One by one)"
                tags={formData.responsibilities}
                onChange={(tags) => setFormData({ ...formData, responsibilities: tags })}
                placeholder="Add a core responsibility and press Enter..."
                helperText="Bullet points representing daily technical and leadership responsibilities"
              />
            </div>

            <div className="md:col-span-2">
              <TagInput
                label="Key Achievements & Quantifiable Impact"
                tags={formData.achievements}
                onChange={(tags) => setFormData({ ...formData, achievements: tags })}
                placeholder="e.g. Reduced API latency by 45% via Redis caching..."
                helperText="Concrete metrics and business outcomes that strengthen application answers"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={handleCancel}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              icon={<SaveIcon className="w-3.5 h-3.5" />}
              disabled={!formData.company.trim() || !formData.position.trim()}
            >
              {editingId ? 'Update Experience' : 'Save Experience'}
            </Button>
          </div>
        </form>
      )}

      {/* List of Work Experiences */}
      {entries.length === 0 ? (
        <div className="text-center py-10 px-4 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30">
          <BriefcaseIcon className="w-10 h-10 mx-auto text-zinc-300 dark:text-zinc-600 mb-2" />
          <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">No Work Experience Added Yet</h4>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto mt-1">
            Add your verified previous and current roles. This provides the primary foundation for Gemini when crafting tailored resumes and cover letters.
          </p>
          {!isEditing && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              icon={<PlusIcon className="w-3.5 h-3.5" />}
              onClick={openNewEntryForm}
              className="mt-4"
            >
              Add First Role
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      {entry.position}
                    </h4>
                    <span className="text-xs px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 capitalize">
                      {entry.employmentType}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400 mt-0.5">
                    {entry.company}
                    <span className="text-zinc-400 ml-2 font-normal">
                      • {entry.startDate || 'N/A'} - {entry.isCurrentRole ? 'Present' : entry.endDate || 'N/A'}
                    </span>
                  </p>
                </div>

                <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => openEditForm(entry)}
                    title="Edit entry"
                  >
                    <EditIcon className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemove(entry.id)}
                    title="Delete entry"
                    className="text-rose-600 dark:text-rose-400 hover:text-rose-700"
                  >
                    <TrashIcon className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              {/* Responsibilities */}
              {entry.responsibilities && entry.responsibilities.length > 0 && (
                <div className="mt-3 text-xs text-zinc-600 dark:text-zinc-300">
                  <span className="font-medium text-zinc-700 dark:text-zinc-200">Responsibilities:</span>
                  <ul className="list-disc list-inside mt-1 space-y-0.5 text-zinc-600 dark:text-zinc-400 pl-1">
                    {entry.responsibilities.map((resp, i) => (
                      <li key={i}>{resp}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Achievements */}
              {entry.achievements && entry.achievements.length > 0 && (
                <div className="mt-2 text-xs">
                  <span className="font-medium text-emerald-700 dark:text-emerald-400">Achievements:</span>
                  <ul className="list-disc list-inside mt-1 space-y-0.5 text-emerald-800/80 dark:text-emerald-300/80 pl-1">
                    {entry.achievements.map((ach, i) => (
                      <li key={i}>{ach}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}
