export {};

import { prisma } from '../lib/prisma';
import { createManualJob } from '../services/server/jobService';

async function testManualJobEntry() {
  console.log('🧪 Testing Manual Job Entry (LinkedIn & Custom Opportunities)...\n');

  const createdJobIds: string[] = [];

  try {
    // 0. Clean up any existing test records with test IDs
    await prisma.job.deleteMany({
      where: {
        externalId: { in: ['4028372819', '4028372820', '4028372821'] },
      },
    });

    // 1. Test complete LinkedIn manual opportunity entry
    console.log('1️⃣ Testing complete LinkedIn manual opportunity entry...');
    const originalUrl1 = 'https://www.linkedin.com/jobs/view/4028372819?trackingId=trk_abc123&refId=ref_xyz789';
    const completeResult = await createManualJob({
      url: originalUrl1,
      originalUrl: originalUrl1,
      title: 'Senior AI Automation Engineer',
      company: 'Cognitive Dynamics',
      description: 'We are seeking an exceptional Senior AI Automation Engineer to lead agent development using LangGraph and Python. Must have 4+ years of software development experience and proficiency in modern LLM orchestration.',
      location: 'Remote (Worldwide)',
      workArrangement: 'remote',
      employmentType: 'full-time',
      experienceLevel: 'Senior',
      salary: '$140,000 - $180,000 USD',
      skills: ['Python', 'LangGraph', 'TypeScript', 'FastAPI'],
    });

    if (!completeResult.success || !completeResult.job) {
      throw new Error(`Failed to create complete manual job: ${completeResult.error}`);
    }

    createdJobIds.push(completeResult.job.id);
    console.log(`✅ Saved complete manual job:`);
    console.log(`   ID: ${completeResult.job.id}`);
    console.log(`   Canonical URL: ${completeResult.job.url}`);
    console.log(`   Application URL (Preserved Original): ${completeResult.job.applicationUrl}`);
    console.log(`   External ID: ${completeResult.job.externalId}`);
    console.log(`   Source: ${completeResult.job.sourceName}`);
    console.log(`   Application Status: ${completeResult.job.applicationStatus}`);

    // Assertions
    if (completeResult.job.url !== 'https://www.linkedin.com/jobs/view/4028372819') {
      throw new Error(`URL was not canonicalized: got ${completeResult.job.url}`);
    }
    if (completeResult.job.applicationUrl !== originalUrl1) {
      throw new Error(`Original URL was not preserved: got ${completeResult.job.applicationUrl}`);
    }
    if (completeResult.job.externalId !== '4028372819') {
      throw new Error(`External ID not extracted: got ${completeResult.job.externalId}`);
    }
    if (completeResult.job.applicationStatus !== 'DISCOVERED') {
      throw new Error(`Expected application status DISCOVERED, got ${completeResult.job.applicationStatus}`);
    }

    // 2. Test Duplicate Detection: Exact URL & Canonical Tracking Param Variant
    console.log('\n2️⃣ Testing duplicate detection for manual LinkedIn entries...');
    // A: Exact URL
    const dupResult1 = await createManualJob({
      url: originalUrl1,
      title: 'Senior AI Automation Engineer',
      company: 'Cognitive Dynamics',
      description: 'Sample description...',
    });
    console.log(`   Exact URL duplicate check: success=${dupResult1.success}, error="${dupResult1.error}"`);
    if (dupResult1.success) {
      throw new Error('Deduplication failed: expected duplicate rejection for identical URL.');
    }

    // B: Different tracking parameters for same LinkedIn job ID
    const differentTrackingUrl = 'https://www.linkedin.com/jobs/view/4028372819?trackingId=different_tracking_456&context=job_search';
    const dupResult2 = await createManualJob({
      url: differentTrackingUrl,
      title: 'Senior AI Engineer',
      company: 'Cognitive Dynamics',
      description: 'Another sample description...',
    });
    console.log(`   Variant tracking URL duplicate check: success=${dupResult2.success}, error="${dupResult2.error}"`);
    if (dupResult2.success) {
      throw new Error('Deduplication failed: expected duplicate rejection for canonical LinkedIn URL/ID.');
    }
    console.log(`✅ 100% Duplicate detection verified across tracking parameters.`);

    // 3. Test Incomplete Manual Entry (URL only, no description)
    console.log('\n3️⃣ Testing incomplete manual entry (URL only, no description)...');
    const incompleteUrl = 'https://www.linkedin.com/jobs/view/4028372820';
    const incompleteResult = await createManualJob({
      url: incompleteUrl,
      // No description provided!
      title: 'AI Prompt Engineer',
      company: 'PromptGen AI',
    });

    if (!incompleteResult.success || !incompleteResult.job) {
      throw new Error(`Failed to save incomplete manual job: ${incompleteResult.error}`);
    }

    createdJobIds.push(incompleteResult.job.id);
    console.log(`✅ Incomplete job saved successfully:`);
    console.log(`   ID: ${incompleteResult.job.id}`);
    console.log(`   IsIncomplete flag: ${incompleteResult.isIncomplete}`);
    console.log(`   Description placeholder: "${incompleteResult.job.description}"`);
    console.log(`   Application Status: ${incompleteResult.job.applicationStatus}`);

    if (!incompleteResult.isIncomplete) {
      throw new Error('Expected isIncomplete to be true.');
    }
    if (incompleteResult.job.applicationStatus !== 'NEEDS_REVIEW') {
      throw new Error(`Expected application status NEEDS_REVIEW for incomplete listing, got ${incompleteResult.job.applicationStatus}`);
    }

    // 4. Test Auto-Inference of Title and Company from LinkedIn URL slug
    console.log('\n4️⃣ Testing metadata inference from LinkedIn slug URL...');
    const slugUrl = 'https://www.linkedin.com/jobs/view/senior-machine-learning-engineer-at-anthropic-4028372821?ref=search';
    const inferredResult = await createManualJob({
      url: slugUrl,
      // Omit title and company intentionally
      description: 'Design robust evaluation systems for foundational AI models and align safety benchmarks.',
    });

    if (!inferredResult.success || !inferredResult.job) {
      throw new Error(`Failed to save slug-inferred job: ${inferredResult.error}`);
    }

    createdJobIds.push(inferredResult.job.id);
    console.log(`✅ Inferred metadata from URL:`);
    console.log(`   Inferred Title: "${inferredResult.job.title}"`);
    console.log(`   Inferred Company: "${inferredResult.job.company}"`);
    console.log(`   Inferred External ID: "${inferredResult.job.externalId}"`);

    if (!inferredResult.job.title.toLowerCase().includes('machine learning engineer')) {
      throw new Error(`Failed to infer title: got "${inferredResult.job.title}"`);
    }
    if (!inferredResult.job.company.toLowerCase().includes('anthropic')) {
      throw new Error(`Failed to infer company: got "${inferredResult.job.company}"`);
    }

    // 5. Test Invalid Protocol Validation
    console.log('\n5️⃣ Testing invalid protocol validation...');
    const invalidResult = await createManualJob({
      url: 'ftp://files.example.com/jobs/1234',
      description: 'Some description',
    });
    console.log(`   Invalid URL check: success=${invalidResult.success}, error="${invalidResult.error}"`);
    if (invalidResult.success) {
      throw new Error('Expected failure for non-http/https protocol.');
    }
    console.log(`✅ Invalid protocol rejected properly.`);

    // 6. Cleanup test records
    console.log('\n6️⃣ Cleaning up test records from SQLite...');
    await prisma.application.deleteMany({
      where: { jobId: { in: createdJobIds } },
    });
    await prisma.job.deleteMany({
      where: { id: { in: createdJobIds } },
    });
    await prisma.activityLog.deleteMany({
      where: {
        entityType: 'Job',
        entityId: { in: createdJobIds },
      },
    });
    console.log('✅ Cleaned up all test records successfully.');

    console.log('\n🎉 ALL MANUAL JOB ENTRY TESTS PASSED 100%!\n');
  } catch (error) {
    console.error('\n❌ Test Failure:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testManualJobEntry();
