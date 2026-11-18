import React, { useState } from 'react';
import { EducationEntry, SectionStatus } from '@/types/profile';
import { SectionCard } from '../common/SectionCard';
import { InputField, TextAreaField, Button } from '../common/FormControls';
import { GraduationCapIcon, PlusIcon, EditIcon, TrashIcon, XIcon, SaveIcon } from '@/components/icons/Icons';
import { generateId } from '@/services/profileService';

interface EducationSectionProps {
  entries: EducationEntry[];
  status: SectionStatus;
  onAdd: (entry: EducationEntry) => void;
  onUpdate: (id: string, updated: Partial<EducationEntry>) => void;
  onRemove: (id: string) => void;
}

export function EducationSection({
  entries,
  status,
  onAdd,
  onUpdate,
  onRemove,
}: EducationSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state for adding/editing an entry
  const [formData, setFormData] = useState<Omit<EducationEntry, 'id'>>({
    institution: '',
    degree: '',
    fieldOfStudy: '',
    startDate: '',
    graduationDate: '',
    academicDetails: '',
  });

  const openNewEntryForm = () => {
    setFormData({
      institution: '',
      degree: '',
      fieldOfStudy: '',
      startDate: '',
      graduationDate: '',
      academicDetails: '',
    });
    setEditingId(null);
    setIsEditing(true);
  };

  const openEditForm = (entry: EducationEntry) => {
    setFormData({
      institution: entry.institution,
      degree: entry.degree,
      fieldOfStudy: entry.fieldOfStudy,
      startDate: entry.startDate,
      graduationDate: entry.graduationDate,
      academicDetails: entry.academicDetails,
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
    if (!formData.institution.trim() || !formData.degree.trim()) {
      return;
    }

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
      title="Education"
      description="Formal degrees, universities, academic achievements, and certifications of completion"
      icon={<GraduationCapIcon className="w-5 h-5" />}
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
            Add Education
          </Button>
        )
      }
    >
      {/* Inline Form for Adding or Editing */}
      {isEditing && (
        <form
          onSubmit={handleSubmit}
          className="mb-6 p-5 rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/30 dark:bg-indigo-950/20 space-y-4"
        >
          <div className="flex items-center justify-between pb-2 border-b border-indigo-100 dark:border-indigo-900/40">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {editingId ? 'Edit Education Record' : 'Add New Education Record'}
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
              label="Institution / University"
              name="institution"
              value={formData.institution}
              onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
              placeholder="e.g. Stanford University"
              required
            />

            <InputField
              label="Degree"
              name="degree"
              value={formData.degree}
              onChange={(e) => setFormData({ ...formData, degree: e.target.value })}
              placeholder="e.g. Bachelor of Science"
              required
            />

            <InputField
              label="Field of Study / Major"
              name="fieldOfStudy"
              value={formData.fieldOfStudy}
              onChange={(e) => setFormData({ ...formData, fieldOfStudy: e.target.value })}
              placeholder="e.g. Computer Science"
            />

            <div className="grid grid-cols-2 gap-3">
              <InputField
                label="Start Date"
                name="startDate"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                placeholder="e.g. 2018 or Sep 2018"
              />
              <InputField
                label="Graduation Date"
                name="graduationDate"
                value={formData.graduationDate}
                onChange={(e) => setFormData({ ...formData, graduationDate: e.target.value })}
                placeholder="e.g. 2022 or Jun 2022"
              />
            </div>

            <div className="md:col-span-2">
              <TextAreaField
                label="Academic Details & Honors (Optional)"
                name="academicDetails"
                rows={2}
                value={formData.academicDetails}
                onChange={(e) => setFormData({ ...formData, academicDetails: e.target.value })}
                placeholder="GPA, Dean's list, relevant coursework, thesis topic, or extracurriculars"
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
              disabled={!formData.institution.trim() || !formData.degree.trim()}
            >
              {editingId ? 'Update Record' : 'Save Record'}
            </Button>
          </div>
        </form>
      )}

      {/* List of Education Entries */}
      {entries.length === 0 ? (
        <div className="text-center py-10 px-4 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30">
          <GraduationCapIcon className="w-10 h-10 mx-auto text-zinc-300 dark:text-zinc-600 mb-2" />
          <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">No Education Records Yet</h4>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto mt-1">
            Add your degrees or university coursework to provide verified educational credentials for applications.
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
              Add First Record
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div>
                <div className="flex items-baseline gap-2">
                  <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    {entry.degree}
                    {entry.fieldOfStudy ? ` in ${entry.fieldOfStudy}` : ''}
                  </h4>
                  {(entry.startDate || entry.graduationDate) && (
                    <span className="text-xs text-zinc-400">
                      ({entry.startDate ? `${entry.startDate} - ` : ''}
                      {entry.graduationDate || 'Present'})
                    </span>
                  )}
                </div>
                <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400 mt-0.5">
                  {entry.institution}
                </p>
                {entry.academicDetails && (
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 line-clamp-2">
                    {entry.academicDetails}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
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
          ))}
        </div>
      )}
    </SectionCard>
  );
}
