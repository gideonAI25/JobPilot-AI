import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Verifying JobPilot AI MVP Database Models & Relationships ---\n');

  // 1. Verify Database Connectivity
  await prisma.$connect();
  console.log('✔ Connected to SQLite database successfully');

  // 2. Test CandidateProfile creation
  const profile = await prisma.candidateProfile.create({
    data: {
      fullName: 'Alex Vance',
      email: 'alex.vance@example.com',
      phone: '+1 555-0199',
      country: 'United States',
      city: 'Seattle',
      headline: 'Staff Full-Stack Engineer',
      summary: 'Experienced builder specializing in TypeScript and distributed systems.',
    },
  });
  console.log(`✔ CandidateProfile created: ${profile.fullName} (ID: ${profile.id})`);

  // 3. Test JobSource creation
  const jobSource = await prisma.jobSource.create({
    data: {
      name: 'RemoteOK Aggregator',
      type: 'rss',
      baseUrl: 'https://remoteok.com/api',
      isActive: true,
      lastPolledAt: new Date(),
    },
  });
  console.log(`✔ JobSource created: ${jobSource.name} (ID: ${jobSource.id})`);

  // 4. Test Job creation with comprehensive metadata
  const job1 = await prisma.job.create({
    data: {
      sourceId: jobSource.id,
      externalId: 'rok-98214',
      title: 'Senior TypeScript Engineer',
      company: 'Acme Cloud Solutions',
      description: 'Looking for a Senior TypeScript Engineer to design cloud workflows with Next.js & Node.js.',
      url: 'https://example.com/jobs/acme-senior-ts-98214',
      applicationUrl: 'https://jobs.lever.co/acme/apply-98214',
      location: 'Remote (US/Canada)',
      workArrangement: 'remote',
      employmentType: 'full-time',
      experienceLevel: 'Senior',
      skills: JSON.stringify(['TypeScript', 'Next.js', 'Node.js', 'PostgreSQL', 'Docker']),
      salary: '$150,000 - $180,000 USD',
      deadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30), // 30 days from now
      postedAt: new Date(),
      discoveredAt: new Date(),
    },
  });
  console.log(`✔ Job created: "${job1.title}" at ${job1.company} (ID: ${job1.id})`);

  // 5. Verify Duplicate Job Prevention (Unique URL Constraint)
  let duplicateCaught = false;
  try {
    await prisma.job.create({
      data: {
        sourceId: jobSource.id,
        title: 'Senior TypeScript Engineer - Duplicate Test',
        company: 'Acme Cloud Solutions',
        description: 'Duplicate listing attempt',
        url: 'https://example.com/jobs/acme-senior-ts-98214', // Duplicate URL
      },
    });
  } catch (err: any) {
    if (err.code === 'P2002') {
      duplicateCaught = true;
      console.log('✔ Duplicate job prevention verified: Unique URL constraint (P2002) caught as expected');
    } else {
      throw err;
    }
  }
  if (!duplicateCaught) {
    throw new Error('FAILED: Duplicate job URL did not trigger unique constraint violation!');
  }

  // 6. Test JobEvaluation creation (scoring dimensions, eligibility, rationales)
  const evaluation = await prisma.jobEvaluation.create({
    data: {
      jobId: job1.id,
      profileId: profile.id,
      overallMatchScore: 94,
      scoringDimensions: JSON.stringify({
        skillsMatch: 95,
        experienceMatch: 90,
        salaryMatch: 100,
        workArrangementMatch: 100,
        seniorityMatch: 85,
      }),
      eligibility: 'ELIGIBLE',
      explanation: 'Candidate strongly meets technical stack (TypeScript/Next.js) and salary expectations exceed minimum threshold.',
      missingQualifications: JSON.stringify([]),
      concerns: JSON.stringify(['Docker experience not explicitly listed in profile']),
      strengths: JSON.stringify(['Expertise in full-stack architecture', 'Proven remote work track record']),
      recommendation: 'HIGHLY_RECOMMENDED',
      evaluatedAt: new Date(),
    },
  });
  console.log(`✔ JobEvaluation created: Score ${evaluation.overallMatchScore} (${evaluation.recommendation})`);

  // 7. Test Application creation (lifecycle tracking)
  const prepDate = new Date();
  const application = await prisma.application.create({
    data: {
      jobId: job1.id,
      profileId: profile.id,
      status: 'PREPARED',
      preparationDate: prepDate,
      reviewDate: new Date(prepDate.getTime() + 1000 * 60 * 30), // reviewed 30 mins later
      approvalDate: new Date(prepDate.getTime() + 1000 * 60 * 45), // candidate approved 45 mins later
      submissionDate: null, // Human-in-the-loop: Not submitted yet
      notes: 'Tailored resume generated. Waiting for final candidate dispatch confirmation.',
    },
  });
  console.log(`✔ Application created with status "${application.status}" (ID: ${application.id})`);

  // 8. Test GeneratedDocument creation & version preservation
  const docV1 = await prisma.generatedDocument.create({
    data: {
      applicationId: application.id,
      documentType: 'TAILORED_RESUME',
      filePath: 'uploads/documents/app_' + application.id + '_resume_v1.pdf',
      originalFilename: 'Alex_Vance_Resume_Acme_v1.pdf',
      version: 1,
      content: '# Alex Vance - Tailored Resume v1\n- Highlighting Next.js & TypeScript',
      mimeType: 'application/pdf',
    },
  });
  console.log(`✔ GeneratedDocument v1 created: ${docV1.originalFilename}`);

  // Create v2 to verify previous generations are preserved without overwrite
  const docV2 = await prisma.generatedDocument.create({
    data: {
      applicationId: application.id,
      documentType: 'TAILORED_RESUME',
      filePath: 'uploads/documents/app_' + application.id + '_resume_v2.pdf',
      originalFilename: 'Alex_Vance_Resume_Acme_v2.pdf',
      version: 2,
      content: '# Alex Vance - Tailored Resume v2\n- Added Docker & AWS highlights',
      mimeType: 'application/pdf',
    },
  });
  console.log(`✔ GeneratedDocument v2 created: ${docV2.originalFilename}`);

  const coverLetter = await prisma.generatedDocument.create({
    data: {
      applicationId: application.id,
      documentType: 'COVER_LETTER',
      filePath: 'uploads/documents/app_' + application.id + '_cover_letter_v1.pdf',
      originalFilename: 'Alex_Vance_Cover_Letter_Acme.pdf',
      version: 1,
      content: 'Dear Acme Hiring Team,\nI am writing to express my strong enthusiasm...',
      mimeType: 'application/pdf',
    },
  });
  console.log(`✔ GeneratedDocument Cover Letter created: ${coverLetter.originalFilename}`);

  // 9. Test AutomationRun with independent run metrics
  const autoRun = await prisma.automationRun.create({
    data: {
      runType: 'FULL_PIPELINE',
      status: 'COMPLETED',
      trigger: 'SCHEDULED_CRON',
      startTime: new Date(Date.now() - 1000 * 60 * 5),
      completionTime: new Date(),
      discoveredJobs: 24,
      evaluatedJobs: 24,
      qualifiedJobs: 3,
      preparedApplications: 2,
      errors: null,
    },
  });
  console.log(`✔ AutomationRun created: status "${autoRun.status}", qualified jobs: ${autoRun.qualifiedJobs}`);

  // 10. Test ActivityLog linked to AutomationRun
  const activity1 = await prisma.activityLog.create({
    data: {
      automationRunId: autoRun.id,
      level: 'INFO',
      action: 'JOB_EVALUATED',
      entityType: 'Job',
      entityId: job1.id,
      details: JSON.stringify({ matchScore: 94, recommendation: 'HIGHLY_RECOMMENDED' }),
    },
  });

  const activity2 = await prisma.activityLog.create({
    data: {
      automationRunId: autoRun.id,
      level: 'INFO',
      action: 'APPLICATION_PREPARED',
      entityType: 'Application',
      entityId: application.id,
      details: JSON.stringify({ documentsCount: 3, status: 'PREPARED' }),
    },
  });
  console.log(`✔ ActivityLogs created: 2 audit events linked to AutomationRun ${autoRun.id}`);

  // 11. Test NotificationLog
  const notification = await prisma.notificationLog.create({
    data: {
      channel: 'TELEGRAM',
      recipient: '@alexvance_dev',
      notificationType: 'APPLICATION_READY_FOR_REVIEW',
      title: 'New High-Match Application Prepared',
      message: 'Senior TypeScript Engineer at Acme Cloud Solutions (94% match) is prepared for your review and approval.',
      metadata: JSON.stringify({ jobId: job1.id, applicationId: application.id, score: 94 }),
      status: 'SENT',
      externalId: 'tg_msg_7729104',
      sentAt: new Date(),
    },
  });
  console.log(`✔ NotificationLog created: sent to ${notification.recipient} (Type: ${notification.notificationType})`);

  // 12. Verify Historical Application Record Preservation
  // If the raw Job record is removed or purged, the Application and its attached GeneratedDocuments MUST remain intact!
  await prisma.job.delete({
    where: { id: job1.id },
  });

  const preservedApp = await prisma.application.findUnique({
    where: { id: application.id },
    include: {
      generatedDocuments: true,
    },
  });

  if (!preservedApp) {
    throw new Error('FAILED: Historical application was unexpectedly deleted when job was removed!');
  }
  if (preservedApp.jobId !== null) {
    throw new Error('FAILED: Application jobId was not set to null upon job deletion!');
  }
  if (preservedApp.generatedDocuments.length !== 3) {
    throw new Error(`FAILED: Expected 3 preserved generated documents, found ${preservedApp.generatedDocuments.length}`);
  }
  console.log('✔ Historical preservation verified: Application & 3 GeneratedDocuments preserved after Job deletion');

  // 13. Clean up remaining test data
  await prisma.candidateProfile.delete({ where: { id: profile.id } });
  await prisma.application.delete({ where: { id: application.id } });
  await prisma.jobSource.delete({ where: { id: jobSource.id } });
  await prisma.automationRun.delete({ where: { id: autoRun.id } });
  await prisma.notificationLog.delete({ where: { id: notification.id } });

  console.log('✔ Cleanup completed. Database returned to pristine state.');
  console.log('\nAll 8 MVP models, unique constraints, deletion rules, and relationships verified successfully! 🎉');
}

main()
  .catch((e) => {
    console.error('Database verification error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
