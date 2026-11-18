import React, { useState } from 'react';
import { ProjectEntry, SectionStatus } from '@/types/profile';
import { SectionCard } from '../common/SectionCard';
import { InputField, TextAreaField, TagInput, Button } from '../common/FormControls';
import { FolderGitIcon, PlusIcon, EditIcon, TrashIcon, XIcon, SaveIcon, ExternalLinkIcon } from '@/components/icons/Icons';
import { generateId } from '@/services/profileService';

interface ProjectsSectionProps {
  projects: ProjectEntry[];
  status: SectionStatus;
  onAdd: (project: ProjectEntry) => void;
  onUpdate: (id: string, updated: Partial<ProjectEntry>) => void;
  onRemove: (id: string) => void;
}

export function ProjectsSection({
  projects,
  status,
  onAdd,
  onUpdate,
  onRemove,
}: ProjectsSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState<Omit<ProjectEntry, 'id'>>({
    name: '',
    description: '',
    technologies: [],
    projectUrl: '',
    keyResponsibilities: '',
  });

  const openNewProjectForm = () => {
    setFormData({
      name: '',
      description: '',
      technologies: [],
      projectUrl: '',
      keyResponsibilities: '',
    });
    setEditingId(null);
    setIsEditing(true);
  };

  const openEditForm = (project: ProjectEntry) => {
    setFormData({
      name: project.name,
      description: project.description,
      technologies: project.technologies || [],
      projectUrl: project.projectUrl,
      keyResponsibilities: project.keyResponsibilities,
    });
    setEditingId(project.id);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditingId(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.description.trim()) return;

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
      title="Projects"
      description="Notable open-source, commercial, or personal engineering projects showcasing architecture and execution"
      icon={<FolderGitIcon className="w-5 h-5" />}
      status={status}
      headerAction={
        !isEditing && (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            icon={<PlusIcon className="w-3.5 h-3.5" />}
            onClick={openNewProjectForm}
          >
            Add Project
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
              {editingId ? 'Edit Project' : 'Add New Project'}
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
              label="Project Name"
              name="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Distributed Task Orchestrator"
              required
            />

            <InputField
              label="Project URL / GitHub Repo"
              name="projectUrl"
              type="url"
              value={formData.projectUrl}
              onChange={(e) => setFormData({ ...formData, projectUrl: e.target.value })}
              placeholder="e.g. https://github.com/alexmorgan/orchestrator"
            />

            <div className="md:col-span-2">
              <TextAreaField
                label="Project Description"
                name="description"
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="What problem does this project solve? What is its architecture and scope?"
                required
              />
            </div>

            <div className="md:col-span-2">
              <TagInput
                label="Technologies & Tools Used"
                tags={formData.technologies}
                onChange={(tags) => setFormData({ ...formData, technologies: tags })}
                placeholder="e.g. Next.js, Go, PostgreSQL, Redis..."
              />
            </div>

            <div className="md:col-span-2">
              <TextAreaField
                label="Key Responsibilities & Role in Project"
                name="keyResponsibilities"
                rows={2}
                value={formData.keyResponsibilities}
                onChange={(e) => setFormData({ ...formData, keyResponsibilities: e.target.value })}
                placeholder="What did you personally architect, implement, or lead in this project?"
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
              disabled={!formData.name.trim() || !formData.description.trim()}
            >
              {editingId ? 'Update Project' : 'Save Project'}
            </Button>
          </div>
        </form>
      )}

      {/* Projects List */}
      {projects.length === 0 ? (
        <div className="text-center py-10 px-4 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30">
          <FolderGitIcon className="w-10 h-10 mx-auto text-zinc-300 dark:text-zinc-600 mb-2" />
          <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">No Projects Added</h4>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto mt-1">
            Highlight real software systems, repositories, or commercial products to demonstrate applied technical mastery.
          </p>
          {!isEditing && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              icon={<PlusIcon className="w-3.5 h-3.5" />}
              onClick={openNewProjectForm}
              className="mt-4"
            >
              Add First Project
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {projects.map((proj) => (
            <div
              key={proj.id}
              className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      {proj.name}
                    </h4>
                    {proj.projectUrl && (
                      <a
                        href={proj.projectUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 inline-flex items-center gap-1 text-xs font-medium"
                      >
                        <ExternalLinkIcon className="w-3.5 h-3.5" />
                        <span>Link</span>
                      </a>
                    )}
                  </div>
                  <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-1">
                    {proj.description}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => openEditForm(proj)}
                    title="Edit project"
                  >
                    <EditIcon className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemove(proj.id)}
                    title="Delete project"
                    className="text-rose-600 dark:text-rose-400 hover:text-rose-700"
                  >
                    <TrashIcon className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              {proj.keyResponsibilities && (
                <div className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">Key Contributions: </span>
                  {proj.keyResponsibilities}
                </div>
              )}

              {proj.technologies && proj.technologies.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {proj.technologies.map((tech, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded text-[11px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}
