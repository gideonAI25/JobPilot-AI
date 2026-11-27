'use client';

import React, { useState } from 'react';
import {
  ScreeningQuestionAnswer,
  ApplicationScreeningAnswersContent,
  ScreeningQuestionCategory,
} from '@/services/screeningAnswers/types';
import { GeneratedDocumentItem } from '@/types/application';
import {
  SparklesIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  EditIcon,
  SaveIcon,
  XIcon,
  CopyIcon,
  CheckIcon,
  FileTextIcon,
  DownloadIcon,
} from '@/components/icons/Icons';

interface ScreeningAnswersViewProps {
  applicationId: string;
  document: GeneratedDocumentItem | null;
  onRefreshApplication: () => Promise<void>;
  isGenerating: boolean;
  onGenerate: () => Promise<void>;
}

export function ScreeningAnswersView({
  applicationId,
  document,
  onRefreshApplication,
  isGenerating,
  onGenerate,
}: ScreeningAnswersViewProps) {
  // Parse document content
  let parsedContent: ApplicationScreeningAnswersContent | null = null;
  if (document?.content) {
    try {
      parsedContent = JSON.parse(document.content);
    } catch {
      parsedContent = null;
    }
  }

  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editedAnswer, setEditedAnswer] = useState<string>('');
  const [saveToProfile, setSaveToProfile] = useState<boolean>(false);
  const [isSavingItem, setIsSavingItem] = useState<boolean>(false);
  const [regeneratingItemId, setRegeneratingItemId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const items = parsedContent?.items || [];

  // Copy individual answer
  const handleCopy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      setFeedback('Failed to copy text to clipboard.');
    }
  };

  // Copy all questions & answers
  const handleCopyAll = async () => {
    if (items.length === 0) return;
    const formatted = items
      .map(
        (i, idx) =>
          `Q${idx + 1}: ${i.question}\nA: ${i.answer || '[Unanswered - Requires confirmation]'}\n`
      )
      .join('\n');
    try {
      await navigator.clipboard.writeText(formatted);
      setCopiedId('ALL');
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      setFeedback('Failed to copy all answers.');
    }
  };

  // Download answers as formatted text file
  const handleDownloadAnswers = () => {
    if (items.length === 0) return;
    const formatted = items
      .map(
        (i, idx) =>
          `Q${idx + 1} (${i.category}): ${i.question}\nAnswer: ${i.answer}\nSource: ${i.source}\nStatus: ${
            i.isVerified
              ? 'Verified Standard'
              : i.requiresConfirmation
              ? 'Personal Confirmation Required'
              : 'AI Drafted'
          }\n`
      )
      .join('\n----------------------------------------\n\n');
    const blob = new Blob([formatted], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = window.document.createElement('a');
    link.href = url;
    link.download = `Screening_Answers_v${parsedContent?.version || 1}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Start editing single answer
  const handleStartEdit = (item: ScreeningQuestionAnswer) => {
    setEditingItemId(item.id);
    setEditedAnswer(item.answer.startsWith('[') ? '' : item.answer);
    setSaveToProfile(false);
    setError(null);
  };

  // Save edited answer
  const handleSaveEdit = async (questionId: string) => {
    setIsSavingItem(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/applications/${applicationId}/documents/answers/item`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            questionId,
            answer: editedAnswer,
            saveToProfileStandardAnswers: saveToProfile,
          }),
        }
      );

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save answer.');
      }

      setEditingItemId(null);
      await onRefreshApplication();
      setFeedback(
        saveToProfile
          ? 'Answer saved to this application and added to your verified profile standard answers!'
          : 'Answer updated successfully.'
      );
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      setError(err.message || 'Error saving answer.');
    } finally {
      setIsSavingItem(false);
    }
  };

  // Toggle verified state
  const handleToggleVerified = async (
    questionId: string,
    currentVerified: boolean
  ) => {
    try {
      const res = await fetch(
        `/api/applications/${applicationId}/documents/answers/item`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            questionId,
            isVerified: !currentVerified,
          }),
        }
      );
      if (res.ok) {
        await onRefreshApplication();
      }
    } catch {}
  };

  // Regenerate single answer
  const handleRegenerateItem = async (questionId: string) => {
    setRegeneratingItemId(questionId);
    setError(null);
    try {
      const res = await fetch(
        `/api/applications/${applicationId}/documents/answers/item`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ questionId }),
        }
      );
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to regenerate answer.');
      }
      await onRefreshApplication();
      setFeedback('Answer regenerated successfully.');
      setTimeout(() => setFeedback(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to regenerate answer.');
    } finally {
      setRegeneratingItemId(null);
    }
  };

  // Categories list
  const categories: string[] = ['All'];
  items.forEach((item) => {
    if (!categories.includes(item.category)) {
      categories.push(item.category);
    }
  });

  const filteredItems =
    activeCategory === 'All'
      ? items
      : items.filter((i) => i.category === activeCategory);

  // Statistics
  const totalCount = items.length;
  const verifiedStandardCount = items.filter(
    (i) => i.source === 'VERIFIED_STANDARD'
  ).length;
  const aiDraftedCount = items.filter((i) => i.source === 'AI_DRAFTED').length;
  const manualRequiredCount = items.filter(
    (i) => i.source === 'MANUAL_REQUIRED' || i.requiresConfirmation
  ).length;

  // Empty state when no answers document exists
  if (!parsedContent || items.length === 0) {
    return (
      <div className="text-center py-12 p-6">
        <FileTextIcon className="w-10 h-10 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
        <h4 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
          No Application Screening Answers Drafted Yet
        </h4>
        <p className="text-xs text-zinc-400 max-w-md mx-auto mt-1.5 mb-5 leading-relaxed">
          Prepare answers to common screening questions (e.g. background, motivation, tools, salary, availability) grounded strictly in your verified profile and standard answers.
        </p>
        <button
          onClick={onGenerate}
          disabled={isGenerating}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors shadow-xs"
        >
          <SparklesIcon
            className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`}
          />
          <span>
            {isGenerating
              ? 'Drafting Answers with Gemini...'
              : 'Generate Screening Answers with AI'}
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5 p-6">
      {/* Feedback & Error banners */}
      {feedback && (
        <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs font-medium text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
          <span>{feedback}</span>
          <button onClick={() => setFeedback(null)}>
            <XIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {error && (
        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs font-medium text-rose-800 dark:text-rose-300 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)}>
            <XIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Top Summary & Metric Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-zinc-100 dark:border-zinc-800">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-semibold text-zinc-800 dark:text-zinc-200">
            {totalCount} Questions Prepared:
          </span>
          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
            <CheckCircleIcon className="w-3 h-3" />
            {verifiedStandardCount} Verified Standard
          </span>
          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 flex items-center gap-1">
            <SparklesIcon className="w-3 h-3" />
            {aiDraftedCount} AI-Drafted
          </span>
          {manualRequiredCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex items-center gap-1">
              <AlertCircleIcon className="w-3 h-3" />
              {manualRequiredCount} Needs Confirmation
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleDownloadAnswers}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-semibold rounded-lg transition-colors"
            title="Download questions and answers as formatted text"
          >
            <DownloadIcon className="w-3.5 h-3.5" />
            <span>Download Answers</span>
          </button>

          <button
            onClick={handleCopyAll}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-semibold rounded-lg transition-colors"
          >
            {copiedId === 'ALL' ? (
              <>
                <CheckIcon className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-600">All Copied!</span>
              </>
            ) : (
              <>
                <CopyIcon className="w-3.5 h-3.5" />
                <span>Copy All Answers</span>
              </>
            )}
          </button>

          <button
            onClick={onGenerate}
            disabled={isGenerating}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors shadow-xs"
          >
            <SparklesIcon
              className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`}
            />
            <span>{isGenerating ? 'Regenerating...' : 'Regenerate All'}</span>
          </button>
        </div>
      </div>

      {/* Category Filter Chips */}
      {categories.length > 2 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                activeCategory === cat
                  ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-semibold'
                  : 'bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Questions List */}
      <div className="space-y-4">
        {filteredItems.map((item, index) => {
          const isEditing = editingItemId === item.id;
          const isRegenerating = regeneratingItemId === item.id;
          const isCopied = copiedId === item.id;

          return (
            <div
              key={item.id || index}
              className={`border rounded-2xl p-5 transition-colors shadow-2xs ${
                item.requiresConfirmation
                  ? 'bg-amber-50/40 dark:bg-amber-950/15 border-amber-200/80 dark:border-amber-900/60'
                  : item.source === 'VERIFIED_STANDARD'
                  ? 'bg-white dark:bg-zinc-900 border-emerald-200/60 dark:border-emerald-950/80'
                  : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800'
              }`}
            >
              {/* Question Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-semibold uppercase px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                    {item.category}
                  </span>

                  {/* Source Badge */}
                  {item.source === 'VERIFIED_STANDARD' ? (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 flex items-center gap-1 border border-emerald-200 dark:border-emerald-800">
                      <CheckCircleIcon className="w-3 h-3 text-emerald-600" />
                      Verified Standard Answer
                    </span>
                  ) : item.requiresConfirmation ? (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 flex items-center gap-1 border border-amber-300 dark:border-amber-800">
                      <AlertCircleIcon className="w-3 h-3 text-amber-600" />
                      Personal Confirmation Required
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 flex items-center gap-1 border border-indigo-200 dark:border-indigo-800">
                      <SparklesIcon className="w-3 h-3 text-indigo-500" />
                      AI-Drafted (Grounded)
                    </span>
                  )}
                </div>

                {/* Card Actions (View Mode) */}
                {!isEditing && (
                  <div className="flex items-center gap-1.5">
                    {/* Copy Button */}
                    <button
                      onClick={() => handleCopy(item.id, item.answer)}
                      disabled={!item.answer || item.requiresConfirmation}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40 transition-colors"
                      title="Copy Answer to Clipboard"
                    >
                      {isCopied ? (
                        <>
                          <CheckIcon className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-600">Copied!</span>
                        </>
                      ) : (
                        <>
                          <CopyIcon className="w-3.5 h-3.5" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>

                    {/* Edit Button */}
                    <button
                      onClick={() => handleStartEdit(item)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                    >
                      <EditIcon className="w-3.5 h-3.5" />
                      <span>{item.answer ? 'Edit' : 'Provide Answer'}</span>
                    </button>

                    {/* Mark as Verified Toggle */}
                    <button
                      onClick={() =>
                        handleToggleVerified(item.id, item.isVerified)
                      }
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                        item.isVerified
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                          : 'text-zinc-500 hover:text-emerald-600 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                      }`}
                      title={
                        item.isVerified
                          ? 'Verified response'
                          : 'Mark as confirmed/verified'
                      }
                    >
                      <CheckCircleIcon className="w-3.5 h-3.5" />
                      <span>{item.isVerified ? 'Verified ✓' : 'Mark Verified'}</span>
                    </button>

                    {/* Regenerate Single Question */}
                    <button
                      onClick={() => handleRegenerateItem(item.id)}
                      disabled={isRegenerating}
                      className="p-1 text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
                      title="Regenerate this answer using AI"
                    >
                      <SparklesIcon
                        className={`w-3.5 h-3.5 ${
                          isRegenerating ? 'animate-spin text-indigo-600' : ''
                        }`}
                      />
                    </button>
                  </div>
                )}
              </div>

              {/* Question Text */}
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-2">
                {item.question}
              </h3>

              {/* Unverified Confirmation Callout */}
              {item.requiresConfirmation && !isEditing && (
                <div className="mb-3 p-3 rounded-xl bg-amber-100/70 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200">
                  <div className="flex items-center gap-1.5 font-bold mb-0.5">
                    <AlertCircleIcon className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400 shrink-0" />
                    <span>Personal Confirmation Required</span>
                  </div>
                  <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
                    {item.confirmationReason ||
                      'JobPilot AI never invents personal commitments. Please click "Provide Answer" to input your answer before submitting.'}
                  </p>
                </div>
              )}

              {/* Answer Body: View or Edit Mode */}
              {isEditing ? (
                <div className="space-y-3 pt-1">
                  <textarea
                    rows={4}
                    value={editedAnswer}
                    onChange={(e) => setEditedAnswer(e.target.value)}
                    placeholder="Provide your accurate answer for this question..."
                    className="w-full p-3 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100 leading-relaxed"
                  />

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <label className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={saveToProfile}
                        onChange={(e) => setSaveToProfile(e.target.checked)}
                        className="rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>
                        Save to candidate profile standard answers for future applications
                      </span>
                    </label>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setEditingItemId(null)}
                        disabled={isSavingItem}
                        className="px-3 py-1.5 text-xs font-semibold text-zinc-600 hover:text-zinc-900 rounded-lg"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleSaveEdit(item.id)}
                        disabled={isSavingItem}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-semibold rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors shadow-xs"
                      >
                        <SaveIcon className="w-3.5 h-3.5" />
                        <span>{isSavingItem ? 'Saving...' : 'Save Answer'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-zinc-800 dark:text-zinc-200 font-sans leading-relaxed whitespace-pre-wrap bg-zinc-50/70 dark:bg-zinc-800/40 p-3.5 rounded-xl border border-zinc-100 dark:border-zinc-800/80">
                  {item.answer ? (
                    item.answer
                  ) : (
                    <span className="italic text-zinc-400">
                      [Unanswered — Click &quot;Provide Answer&quot; to input your response]
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
