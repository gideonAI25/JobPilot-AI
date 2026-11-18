-- CreateTable
CREATE TABLE "CVDocument" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "profileId" TEXT,
    "filename" TEXT NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "rawText" TEXT,
    "parsedData" TEXT,
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CVDocument_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "CandidateProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CandidateProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fullName" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "country" TEXT NOT NULL DEFAULT '',
    "city" TEXT NOT NULL DEFAULT '',
    "linkedInUrl" TEXT NOT NULL DEFAULT '',
    "portfolioUrl" TEXT NOT NULL DEFAULT '',
    "headline" TEXT NOT NULL DEFAULT '',
    "summary" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "completionPercentage" INTEGER NOT NULL DEFAULT 0,
    "completedSections" TEXT NOT NULL DEFAULT '[]',
    "isFullyComplete" BOOLEAN NOT NULL DEFAULT false
);
INSERT INTO "new_CandidateProfile" ("city", "country", "createdAt", "email", "fullName", "headline", "id", "linkedInUrl", "phone", "portfolioUrl", "summary", "updatedAt") SELECT "city", "country", "createdAt", "email", "fullName", "headline", "id", "linkedInUrl", "phone", "portfolioUrl", "summary", "updatedAt" FROM "CandidateProfile";
DROP TABLE "CandidateProfile";
ALTER TABLE "new_CandidateProfile" RENAME TO "CandidateProfile";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "CVDocument_profileId_idx" ON "CVDocument"("profileId");

-- CreateIndex
CREATE INDEX "CVDocument_uploadedAt_idx" ON "CVDocument"("uploadedAt");
