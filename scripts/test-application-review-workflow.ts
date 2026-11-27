import fs from 'fs';
import path from 'path';
import { prisma } from '../lib/prisma';
import {
  createApplicationForJob,
  transitionApplicationStatus,
  getApplicationById,
  saveOrUpdateDocument,
} from '../services/server/applicationService';
import { selectOpportunitiesForPreparation } from '../services/selection';
import { checkDuplicateJob } from '../services/discovery/duplicateDetectionService';

let createdTestJobIds: string[] = [];
let createdTestAppIds: string[] = [];
let createdTestProfileId: string | null = null;

async function runApplicationReviewWorkflowTests() {
  console.log('================================================================');
  console.log(' PHASE 6: APPLICATION REVIEW WORKFLOW & STATUS ENGINE TESTS   ');
  console.log('================================================================\n');

  try {
    // -------------------------------------------------------------
    // SETUP: Resolve or Create Test Candidate Profile & Test Job
    // -------------------------------------------------------------
    console.log('[SETUP] Resolving candidate profile and creating test opportunity...');

    let profile: any = await prisma.candidateProfile.findFirst({
      include: {
        workExperience: true,
        technicalSkills: true,
        preferences: true,
      },
    });

    if (!profile) {
      profile = await prisma.candidateProfile.create({
        data: {
          fullName: 'Test Candidate',
          email: `test-${Date.now()}@jobpilot.test`,
          country: 'Nigeria',
          city: 'Lagos',
        },
        include: {
          workExperience: true,
          technicalSkills: true,
          preferences: true,
        },
      });
      createdTestProfileId = profile.id;
    }

    const testJobUrl = `https://test-hiring.example.com/roles/ai-lead-${Date.now()}`;
    const testJob = await prisma.job.create({
      data: {
        title: 'Lead AI Application Engineer',
        company: 'Vanguard Cognitive Systems',
        description: `
We are seeking a Lead AI Application Engineer to oversee full-stack AI agents and autonomous workflows.
Required skills: TypeScript, Next.js, Python, Gemini 2.5 API, PostgreSQL.
Location: Worldwide Remote. Candidate can work from anywhere globally.
Salary: $140,000 - $170,000 USD / year.
        `.trim(),
        url: testJobUrl,
        applicationUrl: 'https://vanguard.example.com/apply/ai-lead',
        location: 'Remote (Worldwide)',
        workArrangement: 'remote',
        employmentType: 'full-time',
        salary: '$140,000 - $170,000 USD',
        skills: JSON.stringify(['TypeScript', 'Next.js', 'Python', 'Gemini API']),
      },
    });
    createdTestJobIds.push(testJob.id);

    // Create associated evaluation
    const testEval = await prisma.jobEvaluation.create({
      data: {
        jobId: testJob.id,
        profileId: profile.id,
        overallMatchScore: 88,
        eligibility: 'ELIGIBLE',
        explanation: 'Strong match on core full-stack GenAI engineering and worldwide remote eligibility from Nigeria.',
        strengths: JSON.stringify(['Next.js & TypeScript production experience', 'Autonomous workflow architecture']),
        missingQualifications: JSON.stringify(['PostgreSQL sharding']),
        recommendation: 'HIGHLY_RECOMMENDED',
        scoringDimensions: JSON.stringify({
          skillsMatch: 88,
          roleRelevance: 90,
          experienceFit: 85,
          locationEligibility: 100,
          jobFreshness: 90,
        }),
      },
    });

    console.log(`  ✓ Candidate Profile ID: ${profile.id} (${profile.fullName})`);
    console.log(`  ✓ Test Job Created: "${testJob.title}" at ${testJob.company}`);
    console.log(`  ✓ Test Evaluation Created: ${testEval.overallMatchScore}% (${testEval.recommendation})`);

    // -------------------------------------------------------------
    // TEST 1: Associated Application Record Creation (PENDING_REVIEW)
    // -------------------------------------------------------------
    console.log('\n[TEST 1] Testing Application Record Creation for Selected Opportunity...');

    const createResult = await createApplicationForJob({
      jobId: testJob.id,
      status: 'PENDING_REVIEW',
      notes: 'Initial opportunity preparation candidate.',
    });

    if (!createResult.success || !createResult.application) {
      throw new Error(`Failed to create application: ${createResult.error}`);
    }

    const testAppId = createResult.application.id;
    createdTestAppIds.push(testAppId);

    if (createResult.application.status !== 'PENDING_REVIEW') {
      throw new Error(`Expected initial status PENDING_REVIEW, got "${createResult.application.status}"`);
    }

    if (!createResult.application.reviewDate) {
      throw new Error('Expected reviewDate to be initialized upon PENDING_REVIEW status');
    }

    // Verify audit log
    const initialLog = await prisma.activityLog.findFirst({
      where: { entityType: 'Application', entityId: testAppId, action: 'APPLICATION_CREATED' },
    });
    if (!initialLog) {
      throw new Error('ActivityLog missing APPLICATION_CREATED event.');
    }

    console.log(`  ✓ Application created with ID: ${testAppId}`);
    console.log('  ✓ Status correctly initialized to PENDING_REVIEW (awaiting candidate attention)');
    console.log('  ✓ reviewDate successfully timestamped');
    console.log('  ✓ ActivityLog APPLICATION_CREATED event verified');

    // -------------------------------------------------------------
    // TEST 2: Persistence Across Scheduled Runs & Duplicate Prevention
    // -------------------------------------------------------------
    console.log('\n[TEST 2] Testing Persistence Across Scheduled Runs (Zero Overwrite / Duplication)...');

    // Execute opportunity selection while application is in PENDING_REVIEW
    const selectionResult = await selectOpportunitiesForPreparation({
      profileId: profile.id,
      config: { maxSelectionLimit: 5 },
    });

    // Check that testJob was not re-selected or overwritten
    const testAppPostSelect = await prisma.application.findUnique({
      where: { id: testAppId },
    });

    if (!testAppPostSelect) {
      throw new Error('Application was deleted during selection run!');
    }

    if (testAppPostSelect.status !== 'PENDING_REVIEW') {
      throw new Error(`Application status was overwritten to "${testAppPostSelect.status}"!`);
    }

    const appCount = await prisma.application.count({
      where: { jobId: testJob.id },
    });

    if (appCount !== 1) {
      throw new Error(`Expected exactly 1 application record for job, found ${appCount}`);
    }

    console.log('  ✓ Application awaiting review persisted intact across selection pipeline');
    console.log('  ✓ Guard prevented duplicate application creation (Count: 1)');

    // -------------------------------------------------------------
    // TEST 3: Application Materials Preparation, Editing & Versioning
    // -------------------------------------------------------------
    console.log('\n[TEST 3] Testing Materials Attachment, Manual Editing & Versioning...');

    // Save Tailored Resume Document v1
    const resumeDoc = await saveOrUpdateDocument(testAppId, {
      documentType: 'TAILORED_RESUME',
      originalFilename: 'Tailored_Resume_Vanguard_v1.pdf',
      content: '# GIDEON NDEDU\n\nLead AI Automation Engineer with deep expertise in Next.js, Python, and Gemini API.',
    });

    if (!resumeDoc.success || !resumeDoc.document) {
      throw new Error(`Failed to save tailored resume: ${resumeDoc.error}`);
    }

    // Save Cover Letter Document v1
    const clDoc = await saveOrUpdateDocument(testAppId, {
      documentType: 'COVER_LETTER',
      originalFilename: 'Cover_Letter_Vanguard_v1.pdf',
      content: 'Dear Vanguard Cognitive Systems Hiring Team,\n\nI am writing to express my strong interest in the Lead AI Application Engineer position...',
    });

    if (!clDoc.success || !clDoc.document) {
      throw new Error(`Failed to save cover letter: ${clDoc.error}`);
    }

    // Save Screening Answers Document v1
    const answersDoc = await saveOrUpdateDocument(testAppId, {
      documentType: 'APPLICATION_ANSWERS',
      originalFilename: 'Screening_Answers_Vanguard_v1.json',
      content: JSON.stringify({
        version: 1,
        items: [
          {
            id: 'q1',
            question: 'Tell us about yourself.',
            answer: 'Experienced AI and full-stack software engineer.',
            source: 'AI_DRAFTED',
            isVerified: true,
            requiresConfirmation: false,
          },
        ],
      }),
    });

    if (!answersDoc.success || !answersDoc.document) {
      throw new Error(`Failed to save screening answers: ${answersDoc.error}`);
    }

    // Edit resume and verify version increments to 2
    const resumeV2 = await saveOrUpdateDocument(testAppId, {
      id: resumeDoc.document.id,
      documentType: 'TAILORED_RESUME',
      originalFilename: 'Tailored_Resume_Vanguard_v2.pdf',
      content: '# GIDEON NDEDU\n\nLead AI Automation Engineer with Next.js, TypeScript, and autonomous agent orchestration.',
    });

    if (!resumeV2.success || !resumeV2.document) {
      throw new Error(`Failed to update resume to v2: ${resumeV2.error}`);
    }

    if (resumeV2.document.version !== 2) {
      throw new Error(`Expected resume version 2, got ${resumeV2.document.version}`);
    }

    console.log('  ✓ Tailored Resume attached (v1 -> v2 version increment verified)');
    console.log('  ✓ Tailored Cover Letter attached');
    console.log('  ✓ Screening Answers attached');

    // -------------------------------------------------------------
    // TEST 4: Status Transition: PENDING_REVIEW -> APPROVED
    // -------------------------------------------------------------
    console.log('\n[TEST 4] Testing Status Transition: PENDING_REVIEW -> APPROVED...');

    const approveResult = await transitionApplicationStatus(testAppId, {
      targetStatus: 'APPROVED',
      notes: 'Reviewed all documents; CV and cover letter tailored accurately.',
    });

    if (!approveResult.success || !approveResult.application) {
      throw new Error(`Failed to transition to APPROVED: ${approveResult.error}`);
    }

    if (approveResult.application.status !== 'APPROVED') {
      throw new Error(`Expected status APPROVED, got "${approveResult.application.status}"`);
    }

    if (!approveResult.application.approvalDate) {
      throw new Error('Expected approvalDate to be recorded upon approval.');
    }

    console.log('  ✓ Successfully transitioned to APPROVED');
    console.log(`  ✓ approvalDate recorded: ${approveResult.application.approvalDate}`);

    // -------------------------------------------------------------
    // TEST 5: Status Transition: APPROVED -> READY_TO_SUBMIT
    // -------------------------------------------------------------
    console.log('\n[TEST 5] Testing Status Transition: APPROVED -> READY_TO_SUBMIT...');

    const readyResult = await transitionApplicationStatus(testAppId, {
      targetStatus: 'READY_TO_SUBMIT',
      notes: 'Materials finalized for manual portal completion.',
    });

    if (!readyResult.success || !readyResult.application) {
      throw new Error(`Failed to transition to READY_TO_SUBMIT: ${readyResult.error}`);
    }

    if (readyResult.application.status !== 'READY_TO_SUBMIT') {
      throw new Error(`Expected status READY_TO_SUBMIT, got "${readyResult.application.status}"`);
    }

    console.log('  ✓ Successfully transitioned to READY_TO_SUBMIT');

    // -------------------------------------------------------------
    // TEST 6: Human-in-the-Loop Guard: Block Automatic Submission
    // -------------------------------------------------------------
    console.log('\n[TEST 6] Testing Security Guard: Automatic Submission to APPLIED is Blocked...');

    // Attempt to set APPLIED without explicit candidate confirmation
    const unconfirmedAttempt = await transitionApplicationStatus(testAppId, {
      targetStatus: 'APPLIED',
      submissionConfirmation: false,
    });

    if (unconfirmedAttempt.success) {
      throw new Error('SECURITY VIOLATION: System allowed marking application APPLIED without explicit human confirmation!');
    }

    console.log('  ✓ Unconfirmed automatic submission was strictly BLOCKED');
    console.log(`  ✓ Rejection notice: "${unconfirmedAttempt.error}"`);

    // -------------------------------------------------------------
    // TEST 7: Status Transition: READY_TO_SUBMIT -> APPLIED (Confirmed)
    // -------------------------------------------------------------
    console.log('\n[TEST 7] Testing Confirmed Submission: READY_TO_SUBMIT -> APPLIED...');

    const submissionDateStr = '2026-11-27T10:00:00.000Z';
    const appliedResult = await transitionApplicationStatus(testAppId, {
      targetStatus: 'APPLIED',
      submissionConfirmation: true,
      submissionDate: submissionDateStr,
      notes: 'Submitted via Vanguard hiring portal. Confirmation #VG-8941.',
    });

    if (!appliedResult.success || !appliedResult.application) {
      throw new Error(`Failed to confirm submission: ${appliedResult.error}`);
    }

    if (appliedResult.application.status !== 'APPLIED') {
      throw new Error(`Expected status APPLIED, got "${appliedResult.application.status}"`);
    }

    if (!appliedResult.application.submissionDate) {
      throw new Error('Expected submissionDate to be recorded upon confirmed submission.');
    }

    console.log('  ✓ Successfully confirmed submission (Status: APPLIED)');
    console.log(`  ✓ Recorded submissionDate: ${appliedResult.application.submissionDate}`);

    // -------------------------------------------------------------
    // TEST 8: Re-Opening Review & Status Transition to REJECTED
    // -------------------------------------------------------------
    console.log('\n[TEST 8] Testing Rejection Workflow & Reason Tracking...');

    // Transition to REJECTED with reason
    const rejectResult = await transitionApplicationStatus(testAppId, {
      targetStatus: 'REJECTED',
      rejectionReason: 'Position requires 5+ days on-site in Tokyo despite remote listing.',
      notes: 'Company recruiter clarified on-site requirement during screening.',
    });

    if (!rejectResult.success || !rejectResult.application) {
      throw new Error(`Failed to reject application: ${rejectResult.error}`);
    }

    if (rejectResult.application.status !== 'REJECTED') {
      throw new Error(`Expected status REJECTED, got "${rejectResult.application.status}"`);
    }

    if (!rejectResult.application.rejectionReason) {
      throw new Error('Expected rejectionReason to be stored on application record.');
    }

    console.log('  ✓ Successfully transitioned to REJECTED');
    console.log(`  ✓ Stored rejection reason: "${rejectResult.application.rejectionReason}"`);

    // -------------------------------------------------------------
    // TEST 9: Status Transition: REJECTED -> ARCHIVED & Duplicate Check
    // -------------------------------------------------------------
    console.log('\n[TEST 9] Testing Opportunity Archiving & Duplicate Detection Recognition...');

    const archiveResult = await transitionApplicationStatus(testAppId, {
      targetStatus: 'ARCHIVED',
      notes: 'Archived from active tracking.',
    });

    if (!archiveResult.success || !archiveResult.application) {
      throw new Error(`Failed to archive application: ${archiveResult.error}`);
    }

    if (archiveResult.application.status !== 'ARCHIVED') {
      throw new Error(`Expected status ARCHIVED, got "${archiveResult.application.status}"`);
    }

    // Verify duplicate detection flags the archived job URL
    const dupCheck = await checkDuplicateJob({
      url: testJobUrl,
      title: testJob.title,
      company: testJob.company,
      location: testJob.location,
    } as any);

    if (!dupCheck.isDuplicate || dupCheck.reason !== 'PREVIOUSLY_REJECTED_OR_EXPIRED') {
      throw new Error(`Expected duplicate detection reason PREVIOUSLY_REJECTED_OR_EXPIRED, got ${dupCheck.reason}`);
    }

    console.log('  ✓ Successfully transitioned to ARCHIVED');
    console.log('  ✓ Duplicate detection correctly flags archived job as PREVIOUSLY_REJECTED_OR_EXPIRED');

    // -------------------------------------------------------------
    // TEST 10: Re-Open Review from ARCHIVED -> PENDING_REVIEW
    // -------------------------------------------------------------
    console.log('\n[TEST 10] Testing Re-opening Application for Review...');

    const reopenResult = await transitionApplicationStatus(testAppId, {
      targetStatus: 'PENDING_REVIEW',
      notes: 'Re-opened review after company announced 100% remote policy.',
    });

    if (!reopenResult.success || !reopenResult.application) {
      throw new Error(`Failed to re-open application: ${reopenResult.error}`);
    }

    if (reopenResult.application.status !== 'PENDING_REVIEW') {
      throw new Error(`Expected status PENDING_REVIEW, got "${reopenResult.application.status}"`);
    }

    console.log('  ✓ Application successfully re-opened to PENDING_REVIEW');

    // -------------------------------------------------------------
    // TEST 11: Full Application Detail & Activity History Audit Integrity
    // -------------------------------------------------------------
    console.log('\n[TEST 11] Verifying Comprehensive Detail & Activity Audit History Trail...');

    const fullDetail = await getApplicationById(testAppId);

    if (!fullDetail) {
      throw new Error('Failed to retrieve full application detail.');
    }

    // Verify all 8 detail sections
    if (!fullDetail.jobTitle || !fullDetail.company || !fullDetail.jobDescription) {
      throw new Error('Section 1 (Job Information) incomplete in application detail.');
    }

    if (!fullDetail.matchScore || !fullDetail.evaluationSummary) {
      throw new Error('Section 2 (Match Score & Evaluation) missing in application detail.');
    }

    if (!fullDetail.eligibility) {
      throw new Error('Section 3 (Eligibility Assessment) missing in application detail.');
    }

    const hasResume = fullDetail.generatedDocuments.some((d) => d.documentType === 'TAILORED_RESUME');
    if (!hasResume) throw new Error('Section 4 (Tailored CV) missing from generated documents.');

    const hasCoverLetter = fullDetail.generatedDocuments.some((d) => d.documentType === 'COVER_LETTER');
    if (!hasCoverLetter) throw new Error('Section 5 (Cover Letter) missing from generated documents.');

    const hasAnswers = fullDetail.generatedDocuments.some((d) => d.documentType === 'APPLICATION_ANSWERS');
    if (!hasAnswers) throw new Error('Section 6 (Screening Answers) missing from generated documents.');

    if (!fullDetail.status) {
      throw new Error('Section 7 (Application Status) missing in application detail.');
    }

    if (!fullDetail.activityHistory || fullDetail.activityHistory.length < 5) {
      throw new Error(`Section 8 (Activity History) incomplete. Expected >= 5 audit logs, found ${fullDetail.activityHistory.length}`);
    }

    console.log(`  ✓ Section 1 (Job Information): "${fullDetail.jobTitle}" at ${fullDetail.company}`);
    console.log(`  ✓ Section 2 (Evaluation & Score): ${fullDetail.matchScore}% Match (${fullDetail.recommendation})`);
    console.log(`  ✓ Section 3 (Eligibility): ${fullDetail.eligibility}`);
    console.log(`  ✓ Section 4 (Tailored CV): Document attached`);
    console.log(`  ✓ Section 5 (Cover Letter): Document attached`);
    console.log(`  ✓ Section 6 (Screening Answers): Document attached`);
    console.log(`  ✓ Section 7 (Status): ${fullDetail.status}`);
    console.log(`  ✓ Section 8 (Activity Audit History): ${fullDetail.activityHistory.length} audit trail events recorded`);

    console.log('\n================================================================');
    console.log(' ALL 11 APPLICATION REVIEW WORKFLOW TESTS PASSED (11/11)        ');
    console.log('================================================================\n');
  } catch (err) {
    console.error('\n❌ APPLICATION REVIEW WORKFLOW TEST FAILED:', err);
    throw err;
  } finally {
    console.log('Cleaning up test data in SQLite...');
    try {
      for (const appId of createdTestAppIds) {
        await prisma.generatedDocument.deleteMany({ where: { applicationId: appId } });
        await prisma.activityLog.deleteMany({
          where: {
            OR: [
              { entityType: 'Application', entityId: appId },
              { details: { contains: appId } },
            ],
          },
        });
        await prisma.application.delete({ where: { id: appId } }).catch(() => {});
      }
      for (const jobId of createdTestJobIds) {
        await prisma.jobEvaluation.deleteMany({ where: { jobId } });
        await prisma.job.delete({ where: { id: jobId } }).catch(() => {});
      }
      if (createdTestProfileId) {
        await prisma.candidateProfile.delete({ where: { id: createdTestProfileId } }).catch(() => {});
      }
      console.log('Cleanup completed successfully.');
    } catch (cleanupErr) {
      console.error('Error during test cleanup:', cleanupErr);
    }
  }
}

runApplicationReviewWorkflowTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
