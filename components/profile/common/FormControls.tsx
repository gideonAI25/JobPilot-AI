import React, { useState } from 'react';
import { XIcon, PlusIcon, CheckCircleIcon, CircleDotIcon } from '@/components/icons/Icons';

// ==========================================
// Button
// ==========================================
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const base =
    'inline-flex items-center justify-center font-medium rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:pointer-events-none cursor-pointer';

  const sizeClasses = {
    sm: 'text-xs px-2.5 py-1.5 gap-1.5',
    md: 'text-sm px-4 py-2 gap-2',
    lg: 'text-base px-5 py-2.5 gap-2.5',
  };

  const variantClasses = {
    primary:
      'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm focus:ring-indigo-500',
    secondary:
      'bg-zinc-100 hover:bg-zinc-200 text-zinc-900 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-100 focus:ring-zinc-400',
    outline:
      'border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 focus:ring-zinc-400',
    danger:
      'bg-rose-600 hover:bg-rose-700 text-white shadow-sm focus:ring-rose-500',
    ghost:
      'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 focus:ring-zinc-400',
  };

  return (
    <button
      className={`${base} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      disabled={disabled}
      {...props}
    >
      {icon}
      <span>{children}</span>
    </button>
  );
}

// ==========================================
// Input Field
// ==========================================
interface InputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  helperText?: string;
  required?: boolean;
}

export function InputField({
  label,
  id,
  name,
  error,
  helperText,
  required,
  className = '',
  ...props
}: InputFieldProps) {
  const inputId = id || name;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label
          htmlFor={inputId}
          className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400"
        >
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      </div>

      <input
        id={inputId}
        name={name}
        className={`w-full rounded-lg border bg-white dark:bg-zinc-900/80 px-3.5 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 transition-colors focus:outline-none focus:ring-2 ${
          error
            ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20'
            : 'border-zinc-300 dark:border-zinc-700 focus:border-indigo-500 focus:ring-indigo-500/20'
        } ${className}`}
        {...props}
      />

      {error ? (
        <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>
      ) : helperText ? (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">{helperText}</p>
      ) : null}
    </div>
  );
}

// ==========================================
// Text Area Field
// ==========================================
interface TextAreaFieldProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  helperText?: string;
  required?: boolean;
}

export function TextAreaField({
  label,
  id,
  name,
  error,
  helperText,
  required,
  rows = 4,
  className = '',
  ...props
}: TextAreaFieldProps) {
  const inputId = id || name;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label
          htmlFor={inputId}
          className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400"
        >
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      </div>

      <textarea
        id={inputId}
        name={name}
        rows={rows}
        className={`w-full rounded-lg border bg-white dark:bg-zinc-900/80 px-3.5 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 transition-colors focus:outline-none focus:ring-2 ${
          error
            ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20'
            : 'border-zinc-300 dark:border-zinc-700 focus:border-indigo-500 focus:ring-indigo-500/20'
        } ${className}`}
        {...props}
      />

      {error ? (
        <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>
      ) : helperText ? (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">{helperText}</p>
      ) : null}
    </div>
  );
}

// ==========================================
// Select Field
// ==========================================
interface SelectOption {
  value: string;
  label: string;
}

interface SelectFieldProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: SelectOption[];
  error?: string;
  helperText?: string;
  required?: boolean;
}

export function SelectField({
  label,
  id,
  name,
  options,
  error,
  helperText,
  required,
  className = '',
  ...props
}: SelectFieldProps) {
  const inputId = id || name;

  return (
    <div className="space-y-1.5">
      <label
        htmlFor={inputId}
        className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400"
      >
        {label} {required && <span className="text-rose-500">*</span>}
      </label>

      <select
        id={inputId}
        name={name}
        className={`w-full rounded-lg border bg-white dark:bg-zinc-900/80 px-3.5 py-2 text-sm text-zinc-900 dark:text-zinc-100 transition-colors focus:outline-none focus:ring-2 ${
          error
            ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20'
            : 'border-zinc-300 dark:border-zinc-700 focus:border-indigo-500 focus:ring-indigo-500/20'
        } ${className}`}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">
            {opt.label}
          </option>
        ))}
      </select>

      {error ? (
        <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>
      ) : helperText ? (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">{helperText}</p>
      ) : null}
    </div>
  );
}

// ==========================================
// Tag Input (Multi-Item List)
// ==========================================
interface TagInputProps {
  label: string;
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  helperText?: string;
  required?: boolean;
}

export function TagInput({
  label,
  tags,
  onChange,
  placeholder = 'Type and press Enter or comma...',
  helperText,
  required,
}: TagInputProps) {
  const [inputVal, setInputVal] = useState('');

  const addTag = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    if (!tags.includes(trimmed)) {
      onChange([...tags, trimmed]);
    }
    setInputVal('');
  };

  const removeTag = (index: number) => {
    onChange(tags.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(inputVal);
    } else if (e.key === 'Backspace' && !inputVal && tags.length > 0) {
      removeTag(tags.length - 1);
    }
  };

  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
        {label} {required && <span className="text-rose-500">*</span>}
      </label>

      <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900/80 p-2 min-h-[42px] focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20">
        {tags.map((tag, idx) => (
          <span
            key={`${tag}-${idx}`}
            className="inline-flex items-center gap-1 rounded-md bg-indigo-50 dark:bg-indigo-950/60 px-2 py-1 text-xs font-medium text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/70"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(idx)}
              className="text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-200"
            >
              <XIcon className="w-3 h-3" />
            </button>
          </span>
        ))}
        <div className="flex-1 flex items-center min-w-[140px]">
          <input
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => inputVal && addTag(inputVal)}
            placeholder={tags.length === 0 ? placeholder : 'Add another...'}
            className="w-full bg-transparent text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none"
          />
          {inputVal.trim() && (
            <button
              type="button"
              onClick={() => addTag(inputVal)}
              className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 p-1"
            >
              <PlusIcon className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {helperText && <p className="text-xs text-zinc-500 dark:text-zinc-400">{helperText}</p>}
    </div>
  );
}

// ==========================================
// Status Badge
// ==========================================
interface StatusBadgeProps {
  isComplete: boolean;
  itemCount?: number;
}

export function StatusBadge({ isComplete, itemCount }: StatusBadgeProps) {
  if (isComplete) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
        <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
        <span>Complete</span>
        {itemCount !== undefined && <span className="opacity-75">({itemCount})</span>}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
      <CircleDotIcon className="w-3.5 h-3.5 text-zinc-400" />
      <span>Incomplete</span>
    </span>
  );
}
