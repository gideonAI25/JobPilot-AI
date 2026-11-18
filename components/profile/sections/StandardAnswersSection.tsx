import React, { useState } from 'react';
import { StandardAnswerEntry, SectionStatus } from '@/types/profile';
import { SectionCard } from '../common/SectionCard';
import { InputField, TextAreaField, SelectField, Button } from '../common/FormControls';
import { MessageSquareIcon, PlusIcon, EditIcon, TrashIcon, XIcon, SaveIcon } from '@/components/icons/Icons';
import { generateId } from '@/services/profileService';

interface StandardAnswersSectionProps {
  entries: StandardAnswerEntry[];
  status: SectionStatus;
  onAdd: (entry: StandardAnswerEntry) => void;
  onUpdate: (id: string, updated: Partial<StandardAnswerEntry>) => void;
  onRemove: (id: string) => void;
}

const CATEGORIES = [
  'Work Authorization',
  'Visa & Sponsorship',
  'Availability & Notice',
  'Salary & Compensation',
  'Experience & Technical',
  'Cultural & Motivation',
  'General',
];

const COMMON_QUESTION_PROMPTS = [
  {
    category: 'Work Authorization',
    question: 'Are you legally authorized to work in your target countries?',
  },
  {
    category: 'Visa & Sponsorship',
    question: 'Will you now or in the future require employment visa sponsorship?',
  },
  {
    category: 'Availability & Notice',
    question: 'What is your current notice period or earliest possible start date?',
  },
  {
    category: 'Cultural & Motivation',
    question: 'What type of engineering culture and team dynamic do you thrive in?',
  },
];

export function StandardAnswersSection({
  entries,
  status,
  onAdd,
  onUpdate,
  onRemove,
}: StandardAnswersSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState<Omit<StandardAnswerEntry, 'id'>>({
    question: '',
    answer: '',
    category: 'Work Authorization',
  });

  const openNewForm = (presetQuestion?: string, presetCat?: string) => {
    setFormData({
      question: presetQuestion || '',
      answer: '',
      category: presetCat || 'Work Authorization',
    });
    setEditingId(null);
    setIsEditing(true);
  };

  const openEditForm = (entry: StandardAnswerEntry) => {
    setFormData({
      question: entry.question,
      answer: entry.answer,
      category: entry.category || 'General',
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
    if (!formData.question.trim() || !formData.answer.trim()) return;

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
      title="Standard Application Answers"
      description="Pre-verified answers for recurring application questions (work authorization, sponsorship, availability, compensation expectations)"
      icon={<MessageSquareIcon className="w-5 h-5" />}
      status={status}
      headerAction={
        !isEditing && (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            icon={<PlusIcon className="w-3.5 h-3.5" />}
            onClick={() => openNewForm()}
          >
            Add Q&A
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
              {editingId ? 'Edit Standard Answer' : 'Add Standard Answer'}
            </h3>
            <button
              type="button"
              onClick={handleCancel}
              className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
            >
              <XIcon className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <InputField
                label="Application Question"
                name="question"
                value={formData.question}
                onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                placeholder="e.g. Are you legally authorized to work in the United States?"
                required
              />
            </div>

            <SelectField
              label="Question Category"
              name="category"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              options={CATEGORIES.map((c) => ({ value: c, label: c }))}
              required
            />

            <div className="md:col-span-3">
              <TextAreaField
                label="Your Verified Answer"
                name="answer"
                rows={4}
                value={formData.answer}
                onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
                placeholder="Write your definitive, verified answer. Playwright and Gemini will use this exact response when assisting with job forms."
                required
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
              disabled={!formData.question.trim() || !formData.answer.trim()}
            >
              {editingId ? 'Update Answer' : 'Save Answer'}
            </Button>
          </div>
        </form>
      )}

      {/* Suggested Quick Add Question Prompts */}
      {!isEditing && (
        <div className="mb-6 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/40">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2.5">
            Quick-Add Common Questions
          </h4>
          <div className="flex flex-wrap gap-2">
            {COMMON_QUESTION_PROMPTS.map((prompt, i) => {
              const alreadyExists = entries.some(
                (e) => e.question.toLowerCase() === prompt.question.toLowerCase()
              );
              if (alreadyExists) return null;
              return (
                <button
                  type="button"
                  key={i}
                  onClick={() => openNewForm(prompt.question, prompt.category)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:border-indigo-400 text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
                >
                  <PlusIcon className="w-3 h-3 text-indigo-500" />
                  <span>{prompt.question}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* List of Standard Answers */}
      {entries.length === 0 ? (
        <div className="text-center py-10 px-4 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30">
          <MessageSquareIcon className="w-10 h-10 mx-auto text-zinc-300 dark:text-zinc-600 mb-2" />
          <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            No Standard Application Answers
          </h4>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto mt-1">
            Standard answers ensure consistent, accurate responses across job applications for questions regarding work authorization, visa status, or notice periods.
          </p>
          {!isEditing && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              icon={<PlusIcon className="w-3.5 h-3.5" />}
              onClick={() => openNewForm()}
              className="mt-4"
            >
              Add First Answer
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                      {entry.category || 'General'}
                    </span>
                  </div>
                  <h4 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 pt-0.5">
                    {entry.question}
                  </h4>
                  <p className="text-xs text-zinc-600 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-950/60 p-3 rounded-lg border border-zinc-100 dark:border-zinc-800/80 mt-2 font-mono whitespace-pre-wrap">
                    {entry.answer}
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
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}
