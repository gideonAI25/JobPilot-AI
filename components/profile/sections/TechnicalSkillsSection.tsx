import React, { useState } from 'react';
import {
  TechnicalSkillEntry,
  SkillCategory,
  ProficiencyLevel,
  SectionStatus,
} from '@/types/profile';
import { SectionCard } from '../common/SectionCard';
import { InputField, SelectField, Button } from '../common/FormControls';
import { CodeIcon, PlusIcon, TrashIcon, XIcon, SaveIcon } from '@/components/icons/Icons';
import { generateId } from '@/services/profileService';

interface TechnicalSkillsSectionProps {
  skills: TechnicalSkillEntry[];
  status: SectionStatus;
  onAdd: (skill: TechnicalSkillEntry) => void;
  onRemove: (id: string) => void;
}

const SKILL_CATEGORIES: { value: SkillCategory; label: string }[] = [
  { value: 'Programming Languages', label: 'Programming Languages' },
  { value: 'Frontend', label: 'Frontend' },
  { value: 'Backend', label: 'Backend' },
  { value: 'Full Stack', label: 'Full Stack' },
  { value: 'Database', label: 'Database' },
  { value: 'DevOps / Cloud', label: 'DevOps & Cloud' },
  { value: 'AI / Machine Learning', label: 'AI & Machine Learning' },
  { value: 'Testing & QA', label: 'Testing & QA' },
  { value: 'Tools & Platforms', label: 'Tools & Platforms' },
  { value: 'Other', label: 'Other' },
];

const PROFICIENCY_LEVELS: { value: ProficiencyLevel; label: string }[] = [
  { value: 'Beginner', label: 'Beginner' },
  { value: 'Intermediate', label: 'Intermediate' },
  { value: 'Advanced', label: 'Advanced' },
  { value: 'Expert', label: 'Expert' },
];

export function TechnicalSkillsSection({
  skills,
  status,
  onAdd,
  onRemove,
}: TechnicalSkillsSectionProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState<{
    name: string;
    category: SkillCategory;
    proficiency: ProficiencyLevel;
  }>({
    name: '',
    category: 'Programming Languages',
    proficiency: 'Advanced',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    onAdd({
      id: generateId(),
      name: formData.name.trim(),
      category: formData.category,
      proficiency: formData.proficiency,
    });

    setFormData({
      name: '',
      category: formData.category,
      proficiency: formData.proficiency,
    });
  };

  // Group skills by category for clear presentation
  const groupedSkills = skills.reduce<Record<string, TechnicalSkillEntry[]>>((acc, skill) => {
    const cat = skill.category || 'Other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(skill);
    return acc;
  }, {});

  const getProficiencyBadgeColor = (level: ProficiencyLevel) => {
    switch (level) {
      case 'Expert':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800';
      case 'Advanced':
        return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800';
      case 'Intermediate':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      case 'Beginner':
        return 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700';
    }
  };

  return (
    <SectionCard
      title="Technical Skills"
      description="Categorized inventory of programming languages, frameworks, cloud services, and proficiencies"
      icon={<CodeIcon className="w-5 h-5" />}
      status={status}
      headerAction={
        !isAdding && (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            icon={<PlusIcon className="w-3.5 h-3.5" />}
            onClick={() => setIsAdding(true)}
          >
            Add Skill
          </Button>
        )
      }
    >
      {/* Add Skill Form */}
      {isAdding && (
        <form
          onSubmit={handleSubmit}
          className="mb-6 p-4 rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/30 dark:bg-indigo-950/20"
        >
          <div className="flex items-center justify-between pb-3 border-b border-indigo-100 dark:border-indigo-900/40 mb-3">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Add Technical Skill</h3>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
            >
              <XIcon className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <InputField
              label="Skill / Technology"
              name="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. TypeScript, Docker, PostgreSQL"
              required
            />

            <SelectField
              label="Category"
              name="category"
              value={formData.category}
              onChange={(e) =>
                setFormData({ ...formData, category: e.target.value as SkillCategory })
              }
              options={SKILL_CATEGORIES}
              required
            />

            <SelectField
              label="Proficiency Level"
              name="proficiency"
              value={formData.proficiency}
              onChange={(e) =>
                setFormData({ ...formData, proficiency: e.target.value as ProficiencyLevel })
              }
              options={PROFICIENCY_LEVELS}
              required
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsAdding(false)}
            >
              Done
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              icon={<SaveIcon className="w-3.5 h-3.5" />}
              disabled={!formData.name.trim()}
            >
              Add Skill
            </Button>
          </div>
        </form>
      )}

      {/* Skills Display */}
      {skills.length === 0 ? (
        <div className="text-center py-10 px-4 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30">
          <CodeIcon className="w-10 h-10 mx-auto text-zinc-300 dark:text-zinc-600 mb-2" />
          <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">No Technical Skills Listed</h4>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto mt-1">
            List your verified technical skills and proficiencies. At least 3 skills are required to calibrate job matching filters.
          </p>
          {!isAdding && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              icon={<PlusIcon className="w-3.5 h-3.5" />}
              onClick={() => setIsAdding(true)}
              className="mt-4"
            >
              Add First Skill
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          {Object.entries(groupedSkills).map(([category, items]) => (
            <div key={category} className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                {category} ({items.length})
              </h4>
              <div className="flex flex-wrap gap-2">
                {items.map((skill) => (
                  <span
                    key={skill.id}
                    className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/80 pl-2.5 pr-1.5 py-1 text-xs shadow-2xs"
                  >
                    <span className="font-medium text-zinc-800 dark:text-zinc-200">{skill.name}</span>
                    <span
                      className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${getProficiencyBadgeColor(
                        skill.proficiency
                      )}`}
                    >
                      {skill.proficiency}
                    </span>
                    <button
                      type="button"
                      onClick={() => onRemove(skill.id)}
                      className="text-zinc-400 hover:text-rose-500 p-0.5 transition-colors"
                      title="Remove skill"
                    >
                      <TrashIcon className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}
