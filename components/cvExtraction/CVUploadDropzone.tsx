import React, { useState, useRef } from 'react';
import { UploadIcon, FileTextIcon, AlertCircleIcon, XIcon } from '@/components/icons/Icons';
import { Button } from '@/components/profile/common/FormControls';
import { CVExtractionResult, DocumentUploadResponse } from '@/types/cvExtraction';

interface CVUploadDropzoneProps {
  onExtractionSuccess: (extraction: CVExtractionResult) => void;
  onCancel?: () => void;
}

export function CVUploadDropzone({ onExtractionSuccess, onCancel }: CVUploadDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
  };

  const processSelectedFile = (file: File) => {
    setError(null);
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'pdf' && ext !== 'docx') {
      setError('Unsupported file type. Please upload a PDF (.pdf) or Word document (.docx).');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setError('File size exceeds the 15MB limit.');
      return;
    }
    setSelectedFile(file);
    uploadAndExtract(file);
  };

  const uploadAndExtract = async (file: File) => {
    setIsUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/cv/upload', {
        method: 'POST',
        body: formData,
      });

      const data: DocumentUploadResponse = await response.json();

      if (!response.ok || !data.success || !data.extraction) {
        throw new Error(data.error || 'Failed to extract text from document.');
      }

      onExtractionSuccess(data.extraction);
    } catch (err) {
      console.error('Upload failed:', err);
      setError(err instanceof Error ? err.message : 'Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 max-w-2xl mx-auto shadow-sm">
      <div className="flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-zinc-800 mb-6">
        <div>
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Upload Existing CV</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Extract professional history, education, skills, and projects into a staged review
          </p>
        </div>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1 rounded-lg"
          >
            <XIcon className="w-5 h-5" />
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Drag & Drop Box */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isUploading && fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 sm:p-12 text-center transition-all cursor-pointer ${
          isDragging
            ? 'border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/40'
            : 'border-zinc-300 dark:border-zinc-700 hover:border-indigo-400 dark:hover:border-indigo-500 bg-zinc-50/50 dark:bg-zinc-900/40'
        } ${isUploading ? 'opacity-60 pointer-events-none' : ''}`}
      >
        {isUploading ? (
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                Parsing & Extracting Document...
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {selectedFile?.name} ({(selectedFile ? selectedFile.size / 1024 : 0).toFixed(0)} KB)
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-center mx-auto shadow-2xs">
              <UploadIcon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                Click to browse or drop your CV document here
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                Supports Adobe PDF (<strong className="font-medium text-zinc-700 dark:text-zinc-300">.pdf</strong>) and Microsoft Word (<strong className="font-medium text-zinc-700 dark:text-zinc-300">.docx</strong>) up to 15MB
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mt-4 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 flex items-start gap-2.5 text-xs text-rose-800 dark:text-rose-300">
          <AlertCircleIcon className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Accuracy & Privacy Policy Note */}
      <div className="mt-6 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-950/40 space-y-1.5 text-xs text-zinc-600 dark:text-zinc-400">
        <div className="flex items-center gap-1.5 font-semibold text-zinc-800 dark:text-zinc-200">
          <FileTextIcon className="w-3.5 h-3.5 text-indigo-500" />
          <span>Extraction Accuracy Guarantee</span>
        </div>
        <ul className="list-disc list-inside space-y-1 pl-1 text-[11px] text-zinc-500 dark:text-zinc-400">
          <li>Extracted data is staged in a review interface and <strong>never automatically approved</strong>.</li>
          <li>Original CV documents are securely preserved in your local workspace.</li>
          <li>Existing verified profile sections will not be overwritten without your explicit approval.</li>
        </ul>
      </div>

      <div className="mt-6 flex justify-end gap-2.5">
        {onCancel && (
          <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={isUploading}>
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
}
