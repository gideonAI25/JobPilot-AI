import { prisma } from '@/lib/prisma';
import { getDashboardOverviewData } from '@/services/server/dashboardService';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { FileTextIcon, UploadIcon, DownloadIcon } from '@/components/icons/Icons';
import Link from 'next/link';

export const instant = false;

export default async function DocumentsPage() {
  const [data, cvDocs, generatedDocs] = await Promise.all([
    getDashboardOverviewData(),
    prisma.cVDocument.findMany({
      orderBy: { uploadedAt: 'desc' },
    }),
    prisma.generatedDocument.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        application: {
          include: { job: true },
        },
      },
    }),
  ]);

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <DashboardShell
      title="Documents"
      subtitle="Source CV uploads and tailored application documents"
      profile={data.profile}
      stats={data.stats}
      notifications={data.notifications}
    >
      <div className="space-y-8">
        {/* Section 1: Uploaded Source CVs */}
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800 mb-4">
            <div>
              <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                Uploaded Source CVs ({cvDocs.length})
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Original resumes used for information extraction and profile verification
              </p>
            </div>
            <Link
              href="/profile"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
            >
              <UploadIcon className="w-3.5 h-3.5" />
              <span>Upload New CV</span>
            </Link>
          </div>

          {cvDocs.length === 0 ? (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-8 text-center">
              <FileTextIcon className="w-6 h-6 text-zinc-400 mx-auto mb-2" />
              <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                No CV documents uploaded yet
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Upload your PDF/DOCX resume in My Profile to populate your verified qualifications.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {cvDocs.map((doc) => (
                <div
                  key={doc.id}
                  className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-xs"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                      <FileTextIcon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                        {doc.originalFilename}
                      </p>
                      <p className="text-[11px] text-zinc-500 mt-0.5">
                        {formatBytes(doc.fileSize)} • {new Date(doc.uploadedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 2: Generated Application Materials */}
        <div>
          <div className="pb-3 border-b border-zinc-200 dark:border-zinc-800 mb-4">
            <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              Tailored Application Documents ({generatedDocs.length})
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Targeted resumes, cover letters, and application answers generated for specific roles
            </p>
          </div>

          {generatedDocs.length === 0 ? (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-8 text-center">
              <FileTextIcon className="w-6 h-6 text-zinc-400 mx-auto mb-2" />
              <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                No generated materials yet
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 max-w-sm mx-auto">
                Tailored resumes and cover letters will be stored here as applications are prepared for your review.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {generatedDocs.map((doc) => (
                <div
                  key={doc.id}
                  className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                      {doc.documentType.replace(/_/g, ' ')}
                    </span>
                    <span className="text-[10px] font-mono text-zinc-400">
                      v{doc.version}
                    </span>
                  </div>
                  <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 mt-2 truncate">
                    {doc.originalFilename}
                  </h3>
                  <p className="text-[11px] text-zinc-500 mt-1 truncate">
                    For: {doc.application?.job?.title || 'Job Application'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
