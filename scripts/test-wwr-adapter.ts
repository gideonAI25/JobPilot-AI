export {};

import { prisma } from '../lib/prisma';
import { WeWorkRemotelyAdapter } from '../services/discovery/adapters/weWorkRemotelyAdapter';
import { executeDiscovery } from '../services/discovery/jobDiscoveryService';

async function testWWRIntegration() {
  console.log('🧪 Testing Source 2: WeWorkRemotely RSS Adapter Integration...\n');

  try {
    const adapter = new WeWorkRemotelyAdapter();

    // 1. Test fetching from WeWorkRemotely RSS feed
    console.log('1️⃣ Fetching live listings from WeWorkRemotely RSS (limit: 5)...');
    const fetchResult = await adapter.fetchJobs({ limit: 5 });

    if (!fetchResult.success) {
      throw new Error(`WeWorkRemotely fetch failed: ${fetchResult.error}`);
    }

    console.log(`✅ Successfully parsed ${fetchResult.totalFetched} listings from WeWorkRemotely RSS!`);
    const sample = fetchResult.rawJobs[0];
    console.log(`   Sample Job Title: "${sample.title}"`);
    console.log(`   Company: "${sample.company}"`);
    console.log(`   Location/Region: "${sample.location}"`);
    console.log(`   Experience Level: ${sample.experienceLevel || 'null'}`);
    console.log(`   Employment Type: ${sample.employmentType || 'null'}`);
    const skillsList = Array.isArray(sample.skills) ? sample.skills.join(', ') : (sample.skills || 'none');
    console.log(`   Category/Tags: [${skillsList}]`);
    console.log(`   Salary: ${sample.salary || 'null (truthfully preserved as null)'}`);
    console.log(`   Posting Date: ${sample.postedAt ? new Date(sample.postedAt).toISOString() : 'null'}`);

    // 2. Test Discovery Execution with WeWorkRemotely Adapter
    console.log('\n2️⃣ Executing full discovery run through JobDiscoveryService with WeWorkRemotely...');
    const report = await executeDiscovery([adapter], { limit: 3 });

    console.log(`✅ Discovery Run Completed:`);
    console.log(`   Run ID: ${report.runId}`);
    console.log(`   Sources Polled: ${report.sourcesPolled}`);
    console.log(`   Total Raw Fetched: ${report.totalRawFetched}`);
    console.log(`   Valid Jobs: ${report.validJobsCount}`);
    console.log(`   Duplicates Skipped: ${report.duplicatesSkipped.total}`);
    console.log(`   New Jobs Saved: ${report.newJobsSaved}`);

    // 3. Verify Database Records
    const savedJobs = await prisma.job.findMany({
      where: { id: { in: report.savedJobIds } },
      include: { source: true },
    });

    console.log(`\n3️⃣ Verifying saved database records (${savedJobs.length} records in SQLite)...`);
    for (const job of savedJobs) {
      console.log(`   • [${job.source?.name}] "${job.title}" at ${job.company}`);
      console.log(`     Work Arrangement: ${job.workArrangement}, URL: ${job.url}`);
    }

    // 4. Test Deduplication on Immediate Re-poll
    console.log('\n4️⃣ Testing deduplication on immediate re-poll...');
    const rePollReport = await executeDiscovery([adapter], { limit: 3 });
    console.log(`   Re-poll duplicates skipped: ${rePollReport.duplicatesSkipped.total}`);
    console.log(`   Re-poll new jobs saved: ${rePollReport.newJobsSaved}`);
    if (rePollReport.newJobsSaved !== 0) {
      throw new Error(`Deduplication failure: expected 0 new jobs saved on re-poll, got ${rePollReport.newJobsSaved}`);
    }
    console.log(`✅ Deduplication verified: 100% of previously saved WWR jobs skipped on re-poll.`);

    // 5. Cleanup test records
    console.log('\n5️⃣ Cleaning up test records from database...');
    if (report.savedJobIds.length > 0) {
      await prisma.job.deleteMany({ where: { id: { in: report.savedJobIds } } });
    }
    await prisma.automationRun.deleteMany({ where: { id: { in: [report.runId, rePollReport.runId] } } });
    console.log('✅ Cleaned up test jobs and automation runs successfully.');

    console.log('\n🎉 WE WORK REMOTELY ADAPTER INTEGRATION PASSED 100%!\n');
  } catch (error) {
    console.error('\n❌ WeWorkRemotely Test Failure:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testWWRIntegration();
