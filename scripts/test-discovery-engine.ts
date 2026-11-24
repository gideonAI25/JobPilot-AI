export {};

import { prisma } from '../lib/prisma';
import {
  SampleJobSourceAdapter,
  executeDiscovery,
  validateRawJob,
  normalizeJob,
  normalizeJobUrl,
  RawJobPosting,
} from '../services/discovery';

async function runDiscoveryEngineTests() {
  console.log('🧪 Starting Job Discovery Engine Architecture Test Suite...\n');

  const timestamp = Date.now();
  const createdJobIds: string[] = [];
  const createdSourceNames: string[] = [];
  const createdRunIds: string[] = [];

  try {
    // -------------------------------------------------------------
    // TEST 1: Unit Validation & Normalization
    // -------------------------------------------------------------
    console.log('1️⃣ Testing Job Validation and URL Normalization...');

    // URL Normalization test
    const rawUrlWithTracking =
      'https://jobs.example.com/careers/senior-dev/?utm_source=linkedin&utm_medium=cpc&ref=partner#details';
    const cleanedUrl = normalizeJobUrl(rawUrlWithTracking);
    if (cleanedUrl.includes('utm_source') || cleanedUrl.includes('ref') || cleanedUrl.endsWith('/')) {
      throw new Error(`URL normalization failed: expected clean URL, got "${cleanedUrl}"`);
    }
    console.log(`✅ URL normalization verified: "${cleanedUrl}"`);

    // Validation checks
    const invalidJob: RawJobPosting = {
      title: '', // invalid
      company: 'Test Corp',
      description: 'Short', // invalid (<20 chars)
      url: 'not-a-valid-url', // invalid
    };
    const validation = validateRawJob(invalidJob);
    if (validation.isValid || validation.errors.length !== 3) {
      throw new Error(`Expected 3 validation errors, got: ${JSON.stringify(validation.errors)}`);
    }
    console.log(`✅ Validation rules verified: correctly rejected 3 malformed fields (${validation.errors.length} errors)`);

    // Normalization preserves nulls without inventing data
    const normalizedNoSalary = normalizeJob(
      {
        title: 'Senior Cloud Engineer',
        company: 'CloudWorks',
        description: 'Design highly scalable cloud native microservices on Kubernetes.',
        url: 'https://cloudworks.internal/careers/senior-cloud-engineer',
        // salary is omitted
        // deadline is omitted
      },
      'Sample Source'
    );
    if (normalizedNoSalary.salary !== null || normalizedNoSalary.deadline !== null) {
      throw new Error('Normalization invented data! Expected null for omitted salary/deadline.');
    }
    if (normalizedNoSalary.experienceLevel !== 'Senior') {
      throw new Error(`Expected experienceLevel "Senior", got "${normalizedNoSalary.experienceLevel}"`);
    }
    console.log('✅ Normalization preserves unprovided fields as null without inventing missing data');

    // -------------------------------------------------------------
    // TEST 2: Primary Discovery Run with Clean Listings
    // -------------------------------------------------------------
    console.log('\n2️⃣ Testing discovery execution with primary source adapter...');

    const primarySourceName = `Primary Sample Feed ${timestamp}`;
    createdSourceNames.push(primarySourceName);

    const primaryAdapter = new SampleJobSourceAdapter({
      id: `primary-${timestamp}`,
      name: primarySourceName,
      fixtures: [
        {
          externalId: `EXT-A-${timestamp}`,
          title: 'Senior TypeScript Engineer',
          company: `Acme Systems ${timestamp}`,
          description: 'Build robust Next.js and Node.js applications with SQLite and Prisma.',
          url: `https://acme-systems-${timestamp}.org/jobs/senior-ts?utm_source=twitter&ref=feed/`,
          location: 'Remote (Worldwide)',
          workArrangement: 'remote',
          employmentType: 'full-time',
          experienceLevel: 'Senior',
          salary: '$135,000 - $160,000 USD',
          skills: ['TypeScript', 'Next.js', 'Prisma', 'SQLite'],
        },
        {
          externalId: `EXT-B-${timestamp}`,
          title: 'Distributed Systems Architect',
          company: `HyperCloud ${timestamp}`,
          description: 'Architect multi-region distributed storage engines and messaging systems.',
          url: `https://hypercloud-${timestamp}.org/jobs/architect`,
          location: 'Remote',
          workArrangement: 'remote',
          employmentType: 'full-time',
          experienceLevel: 'Staff',
          salary: '$180,000 - $210,000 USD',
          skills: ['Go', 'Rust', 'Raft', 'Kubernetes'],
        },
        {
          // Intentional invalid listing to test in-flight rejection
          title: '',
          company: 'Broken Corp',
          description: 'Too short',
          url: 'invalid',
        },
      ],
    });

    const report1 = await executeDiscovery([primaryAdapter]);
    createdRunIds.push(report1.runId);
    createdJobIds.push(...report1.savedJobIds);

    console.log(`✅ Discovery Run #1 completed:`);
    console.log(`   Run ID: ${report1.runId}`);
    console.log(`   Sources Polled: ${report1.sourcesPolled}`);
    console.log(`   Total Raw Fetched: ${report1.totalRawFetched}`);
    console.log(`   Valid Jobs: ${report1.validJobsCount}`);
    console.log(`   Invalid Skipped: ${report1.invalidJobsSkipped}`);
    console.log(`   New Jobs Saved: ${report1.newJobsSaved}`);

    if (report1.newJobsSaved !== 2) {
      throw new Error(`Expected 2 new jobs saved, got ${report1.newJobsSaved}`);
    }
    if (report1.invalidJobsSkipped !== 1) {
      throw new Error(`Expected 1 invalid listing skipped, got ${report1.invalidJobsSkipped}`);
    }

    // Verify source record was created & polling timestamp recorded
    const dbSource = await prisma.jobSource.findUnique({
      where: { name: primarySourceName },
    });
    if (!dbSource || !dbSource.lastPolledAt) {
      throw new Error('JobSource record or lastPolledAt was not recorded in SQLite');
    }
    console.log(`✅ JobSource verified in database: ID=${dbSource.id}, PolledAt=${dbSource.lastPolledAt.toISOString()}`);

    // Verify AutomationRun record in SQLite
    const dbRun = await prisma.automationRun.findUnique({
      where: { id: report1.runId },
    });
    if (!dbRun || dbRun.status !== 'COMPLETED' || dbRun.discoveredJobs !== 3) {
      throw new Error(`AutomationRun verification failed: ${JSON.stringify(dbRun)}`);
    }
    console.log(`✅ AutomationRun record verified in SQLite: Status=${dbRun.status}, Discovered=${dbRun.discoveredJobs}`);

    // -------------------------------------------------------------
    // TEST 3: Duplicate Detection: Exact URL
    // -------------------------------------------------------------
    console.log('\n3️⃣ Testing duplicate detection for exact URLs...');
    const duplicateRun = await executeDiscovery([primaryAdapter]);
    createdRunIds.push(duplicateRun.runId);

    console.log(`   Duplicates skipped: ${duplicateRun.duplicatesSkipped.total}`);
    console.log(`   Exact URL matches: ${duplicateRun.duplicatesSkipped.exactUrl}`);
    console.log(`   New jobs saved: ${duplicateRun.newJobsSaved}`);

    if (duplicateRun.newJobsSaved !== 0) {
      throw new Error(`Expected 0 new jobs saved on re-run, got ${duplicateRun.newJobsSaved}`);
    }
    if (duplicateRun.duplicatesSkipped.exactUrl !== 2) {
      throw new Error(`Expected 2 exact URL duplicates, got ${duplicateRun.duplicatesSkipped.exactUrl}`);
    }
    console.log('✅ Exact URL duplicate detection correctly blocked re-saving');

    // -------------------------------------------------------------
    // TEST 4: Duplicate Detection: Cross-Source Canonical Matching
    // -------------------------------------------------------------
    console.log('\n4️⃣ Testing cross-source opportunity deduplication...');
    // Simulate a second distinct job board posting the SAME opportunity with a different board URL
    const secondarySourceName = `Secondary Board ${timestamp}`;
    createdSourceNames.push(secondarySourceName);

    const secondaryAdapter = new SampleJobSourceAdapter({
      id: `secondary-${timestamp}`,
      name: secondarySourceName,
      fixtures: [
        {
          externalId: `SECONDARY-BOARD-999-${timestamp}`,
          // Notice slight variations in formatting & brackets
          title: '[Remote] Senior TypeScript Engineer (Full-time)',
          company: `Acme Systems ${timestamp}`,
          description: 'Different board description for the same Acme Systems position.',
          url: `https://secondaryboard-${timestamp}.com/postings/acme-ts-job`,
          location: 'Worldwide',
          workArrangement: 'remote',
        },
      ],
    });

    const reportCross = await executeDiscovery([secondaryAdapter]);
    createdRunIds.push(reportCross.runId);

    console.log(`   Cross-source duplicates detected: ${reportCross.duplicatesSkipped.crossSource}`);
    console.log(`   New jobs saved: ${reportCross.newJobsSaved}`);

    if (reportCross.duplicatesSkipped.crossSource !== 1 || reportCross.newJobsSaved !== 0) {
      throw new Error('Cross-source deduplication failed: Opportunity was duplicated across different sources!');
    }
    console.log('✅ Cross-source deduplication verified: Identical opportunity across boards correctly detected');

    // -------------------------------------------------------------
    // TEST 5: Previously Rejected or Expired Opportunities
    // -------------------------------------------------------------
    console.log('\n5️⃣ Testing rejection/expiration guard...');
    // Take the HyperCloud job, create an application for it, and mark as REJECTED
    const hyperJob = await prisma.job.findFirst({
      where: { company: `HyperCloud ${timestamp}` },
    });
    if (!hyperJob) throw new Error('HyperCloud job not found for rejection test');

    const app = await prisma.application.create({
      data: {
        jobId: hyperJob.id,
        status: 'REJECTED',
        rejectionReason: 'Candidate declined: Stack not aligned with career goals',
      },
    });

    // Now simulate discovering HyperCloud job again in a new feed
    const tertiaryAdapter = new SampleJobSourceAdapter({
      id: `tertiary-${timestamp}`,
      name: `Tertiary Feed ${timestamp}`,
      fixtures: [
        {
          title: hyperJob.title,
          company: hyperJob.company,
          description: hyperJob.description,
          url: `https://another-aggregator-${timestamp}.org/jobs/hypercloud-architect`,
          workArrangement: 'remote',
        },
      ],
    });
    createdSourceNames.push(`Tertiary Feed ${timestamp}`);

    const reportRejected = await executeDiscovery([tertiaryAdapter]);
    createdRunIds.push(reportRejected.runId);

    console.log(`   Previously rejected/expired duplicates caught: ${reportRejected.duplicatesSkipped.previouslyRejectedOrExpired}`);
    console.log(`   New jobs saved: ${reportRejected.newJobsSaved}`);

    if (reportRejected.duplicatesSkipped.previouslyRejectedOrExpired !== 1 || reportRejected.newJobsSaved !== 0) {
      throw new Error('Previously rejected job was allowed to re-enter as a new opportunity!');
    }
    console.log('✅ Previously rejected/expired opportunities correctly blocked from re-discovery');

    // -------------------------------------------------------------
    // TEST 6: Fault Tolerance & Rate Limiting
    // -------------------------------------------------------------
    console.log('\n6️⃣ Testing error handling & simulated rate limits...');
    const failingAdapter = new SampleJobSourceAdapter({
      id: `failing-${timestamp}`,
      name: `Failing Source ${timestamp}`,
      simulateRateLimit: true,
    });
    createdSourceNames.push(`Failing Source ${timestamp}`);

    const reportFailing = await executeDiscovery([failingAdapter]);
    createdRunIds.push(reportFailing.runId);

    console.log(`   Discovery handled error gracefully: errors count = ${reportFailing.errors.length}`);
    console.log(`   Error message: "${reportFailing.errors[0]}"`);
    if (reportFailing.errors.length === 0) {
      throw new Error('Expected error log for failing rate-limited adapter');
    }
    console.log('✅ Fault tolerance verified: Adapter failures logged and handled gracefully');

    // -------------------------------------------------------------
    // CLEANUP
    // -------------------------------------------------------------
    console.log('\n7️⃣ Cleaning up test records...');
    // Delete created jobs
    if (createdJobIds.length > 0) {
      await prisma.job.deleteMany({
        where: { id: { in: createdJobIds } },
      });
    }
    // Delete created sources
    if (createdSourceNames.length > 0) {
      await prisma.jobSource.deleteMany({
        where: { name: { in: createdSourceNames } },
      });
    }
    // Delete created automation runs
    if (createdRunIds.length > 0) {
      await prisma.automationRun.deleteMany({
        where: { id: { in: createdRunIds } },
      });
    }
    console.log('✅ Test cleanup complete');

    console.log('\n🎉 ALL JOB DISCOVERY ENGINE ARCHITECTURE TESTS PASSED SUCCESSFULLY!\n');
  } catch (error) {
    console.error('\n❌ Test Failure:', error);
    // Cleanup if error occurred
    if (createdJobIds.length > 0) {
      await prisma.job.deleteMany({ where: { id: { in: createdJobIds } } }).catch(() => {});
    }
    if (createdSourceNames.length > 0) {
      await prisma.jobSource.deleteMany({ where: { name: { in: createdSourceNames } } }).catch(() => {});
    }
    if (createdRunIds.length > 0) {
      await prisma.automationRun.deleteMany({ where: { id: { in: createdRunIds } } }).catch(() => {});
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runDiscoveryEngineTests();
