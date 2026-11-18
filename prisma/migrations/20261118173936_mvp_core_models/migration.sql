/*
  Warnings:

  - You are about to drop the `DiscoveredJob` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `JobApplication` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TelegramNotification` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `completedAt` on the `AutomationRun` table. All the data in the column will be lost.
  - You are about to drop the column `error` on the `AutomationRun` table. All the data in the column will be lost.
  - You are about to drop the column `jobsEvaluated` on the `AutomationRun` table. All the data in the column will be lost.
  - You are about to drop the column `jobsFound` on the `AutomationRun` table. All the data in the column will be lost.
  - You are about to drop the column `startedAt` on the `AutomationRun` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `AutomationRun` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `GeneratedDocument` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `GeneratedDocument` table. All the data in the column will be lost.
  - You are about to drop the column `matchedSkills` on the `JobEvaluation` table. All the data in the column will be lost.
  - You are about to drop the column `missingSkills` on the `JobEvaluation` table. All the data in the column will be lost.
  - You are about to drop the column `summary` on the `JobEvaluation` table. All the data in the column will be lost.
  - Added the required column `updatedAt` to the `AutomationRun` table without a default value. This is not possible if the table is not empty.
  - Added the required column `documentType` to the `GeneratedDocument` table without a default value. This is not possible if the table is not empty.
  - Added the required column `originalFilename` to the `GeneratedDocument` table without a default value. This is not possible if the table is not empty.
  - Made the column `filePath` on table `GeneratedDocument` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `explanation` to the `JobEvaluation` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "DiscoveredJob_isRemote_idx";

-- DropIndex
DROP INDEX "DiscoveredJob_discoveredAt_idx";

-- DropIndex
DROP INDEX "DiscoveredJob_company_idx";

-- DropIndex
DROP INDEX "DiscoveredJob_sourceId_idx";

-- DropIndex
DROP INDEX "DiscoveredJob_url_key";

-- DropIndex
DROP INDEX "JobApplication_status_idx";

-- DropIndex
DROP INDEX "JobApplication_profileId_idx";

-- DropIndex
DROP INDEX "JobApplication_jobId_key";

-- DropIndex
DROP INDEX "TelegramNotification_createdAt_idx";

-- DropIndex
DROP INDEX "TelegramNotification_type_idx";

-- DropIndex
DROP INDEX "TelegramNotification_status_idx";

-- AlterTable
ALTER TABLE "ActivityLog" ADD COLUMN "entityId" TEXT;
ALTER TABLE "ActivityLog" ADD COLUMN "entityType" TEXT;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "DiscoveredJob";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "JobApplication";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "TelegramNotification";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sourceId" TEXT,
    "externalId" TEXT,
    "title" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "applicationUrl" TEXT,
    "location" TEXT NOT NULL DEFAULT 'Remote',
    "workArrangement" TEXT NOT NULL DEFAULT 'remote',
    "employmentType" TEXT,
    "experienceLevel" TEXT,
    "skills" TEXT NOT NULL DEFAULT '[]',
    "salary" TEXT,
    "deadline" DATETIME,
    "postedAt" DATETIME,
    "discoveredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Job_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "JobSource" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Application" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jobId" TEXT,
    "profileId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "preparationDate" DATETIME,
    "reviewDate" DATETIME,
    "approvalDate" DATETIME,
    "submissionDate" DATETIME,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Application_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Application_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "CandidateProfile" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "NotificationLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "channel" TEXT NOT NULL DEFAULT 'TELEGRAM',
    "recipient" TEXT,
    "notificationType" TEXT NOT NULL,
    "title" TEXT,
    "message" TEXT NOT NULL,
    "metadata" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "externalId" TEXT,
    "error" TEXT,
    "sentAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AutomationRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "runType" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "startTime" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completionTime" DATETIME,
    "discoveredJobs" INTEGER NOT NULL DEFAULT 0,
    "evaluatedJobs" INTEGER NOT NULL DEFAULT 0,
    "qualifiedJobs" INTEGER NOT NULL DEFAULT 0,
    "preparedApplications" INTEGER NOT NULL DEFAULT 0,
    "errors" TEXT,
    "trigger" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_AutomationRun" ("createdAt", "id", "status") SELECT "createdAt", "id", "status" FROM "AutomationRun";
DROP TABLE "AutomationRun";
ALTER TABLE "new_AutomationRun" RENAME TO "AutomationRun";
CREATE INDEX "AutomationRun_runType_idx" ON "AutomationRun"("runType");
CREATE INDEX "AutomationRun_status_idx" ON "AutomationRun"("status");
CREATE INDEX "AutomationRun_startTime_idx" ON "AutomationRun"("startTime");
CREATE TABLE "new_GeneratedDocument" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "applicationId" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "content" TEXT,
    "mimeType" TEXT NOT NULL DEFAULT 'application/pdf',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "GeneratedDocument_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_GeneratedDocument" ("applicationId", "content", "createdAt", "filePath", "id", "updatedAt", "version") SELECT "applicationId", "content", "createdAt", "filePath", "id", "updatedAt", "version" FROM "GeneratedDocument";
DROP TABLE "GeneratedDocument";
ALTER TABLE "new_GeneratedDocument" RENAME TO "GeneratedDocument";
CREATE INDEX "GeneratedDocument_applicationId_idx" ON "GeneratedDocument"("applicationId");
CREATE INDEX "GeneratedDocument_documentType_idx" ON "GeneratedDocument"("documentType");
CREATE INDEX "GeneratedDocument_createdAt_idx" ON "GeneratedDocument"("createdAt");
CREATE TABLE "new_JobEvaluation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jobId" TEXT NOT NULL,
    "profileId" TEXT,
    "overallMatchScore" INTEGER NOT NULL,
    "scoringDimensions" TEXT NOT NULL DEFAULT '{}',
    "eligibility" TEXT NOT NULL DEFAULT 'ELIGIBLE',
    "explanation" TEXT NOT NULL,
    "missingQualifications" TEXT NOT NULL DEFAULT '[]',
    "concerns" TEXT NOT NULL DEFAULT '[]',
    "strengths" TEXT NOT NULL DEFAULT '[]',
    "recommendation" TEXT NOT NULL,
    "evaluatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "JobEvaluation_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "JobEvaluation_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "CandidateProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_JobEvaluation" ("concerns", "createdAt", "evaluatedAt", "id", "jobId", "overallMatchScore", "profileId", "recommendation", "strengths", "updatedAt") SELECT "concerns", "createdAt", "evaluatedAt", "id", "jobId", "overallMatchScore", "profileId", "recommendation", "strengths", "updatedAt" FROM "JobEvaluation";
DROP TABLE "JobEvaluation";
ALTER TABLE "new_JobEvaluation" RENAME TO "JobEvaluation";
CREATE INDEX "JobEvaluation_jobId_idx" ON "JobEvaluation"("jobId");
CREATE INDEX "JobEvaluation_profileId_idx" ON "JobEvaluation"("profileId");
CREATE INDEX "JobEvaluation_overallMatchScore_idx" ON "JobEvaluation"("overallMatchScore");
CREATE INDEX "JobEvaluation_eligibility_idx" ON "JobEvaluation"("eligibility");
CREATE INDEX "JobEvaluation_recommendation_idx" ON "JobEvaluation"("recommendation");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Job_url_key" ON "Job"("url");

-- CreateIndex
CREATE INDEX "Job_sourceId_idx" ON "Job"("sourceId");

-- CreateIndex
CREATE INDEX "Job_company_idx" ON "Job"("company");

-- CreateIndex
CREATE INDEX "Job_workArrangement_idx" ON "Job"("workArrangement");

-- CreateIndex
CREATE INDEX "Job_employmentType_idx" ON "Job"("employmentType");

-- CreateIndex
CREATE INDEX "Job_discoveredAt_idx" ON "Job"("discoveredAt");

-- CreateIndex
CREATE INDEX "Application_jobId_idx" ON "Application"("jobId");

-- CreateIndex
CREATE INDEX "Application_profileId_idx" ON "Application"("profileId");

-- CreateIndex
CREATE INDEX "Application_status_idx" ON "Application"("status");

-- CreateIndex
CREATE INDEX "Application_submissionDate_idx" ON "Application"("submissionDate");

-- CreateIndex
CREATE INDEX "NotificationLog_channel_idx" ON "NotificationLog"("channel");

-- CreateIndex
CREATE INDEX "NotificationLog_notificationType_idx" ON "NotificationLog"("notificationType");

-- CreateIndex
CREATE INDEX "NotificationLog_status_idx" ON "NotificationLog"("status");

-- CreateIndex
CREATE INDEX "NotificationLog_createdAt_idx" ON "NotificationLog"("createdAt");

-- CreateIndex
CREATE INDEX "ActivityLog_action_idx" ON "ActivityLog"("action");
