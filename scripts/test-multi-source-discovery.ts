export {};

import { prisma } from '../lib/prisma';
import { JobicyAdapter } from '../services/discovery/adapters/jobicyAdapter';
import { WeWorkRemotelyAdapter } from '../services/discovery/adapters/weWorkRemotelyAdapter';
import { RemotiveAdapter } from '../services/discovery/adapters/remotiveAdapter';
import { adapterRegistry } from '../services/discovery/adapterRegistry';
import { executeDiscovery } from '../services/discovery/jobDiscoveryService';

async function testMultiSourceDiscovery() {
  console.log('🧪 Testing Multi-Source Discovery Engine Integration...\n');

  try {
    // 0. Clean up any previous test jobs from previous incomplete run
    await prisma.job.deleteMany({
      where: {
        source: {
          name: { in: ['Jobicy', 'We Work Remotely', 'Remotive'] },
        },
      },
    });

    // 1. Verify Adapter Registry
    console.log('1️⃣ Checking Adapter Registry...');
    const registeredAdapters = adapterRegistry.getAll();
    console.log(`   Found ${registeredAdapters.length} registered adapters: [${registeredAdapters.map((a) => a.metadata.id).join(', ')}]`);

    if (registeredAdapters.length < 3) {
      throw new Error(`Expected at least 3 adapters registered, found ${registeredAdapters.length}`);
    }

    const jobicy = adapterRegistry.get('jobicy');
    const wwr = adapterRegistry.get('weworkremotely');
    const remotive = adapterRegistry.get('remotive');

    if (!jobicy || !wwr || !remotive) {
      throw new Error('Missing one of the core adapters: jobicy, weworkremotely, remotive');
    }

    // 2. Execute Multi-Source Discovery (fetching 2 jobs per source = up to 6 jobs)
    console.log('\n2️⃣ Executing unified multi-source discovery run across Jobicy, WWR, and Remotive...');
    const multiAdapters = [jobicy, wwr, remotive];
    const report = await executeDiscovery(multiAdapters, { limit: 2, query: 'ai' });

    console.log(`✅ Multi-Source Discovery Run Completed:`);
    console.log(`   Run ID: ${report.runId}`);
    console.log(`   Sources Polled: ${report.sourcesPolled}`);
    console.log(`   Total Raw Fetched: ${report.totalRawFetched}`);
    console.log(`   Valid Jobs: ${report.validJobsCount}`);
    console.log(`   Duplicates Skipped: ${report.duplicatesSkipped.total}`);
    console.log(`   New Jobs Saved: ${report.newJobsSaved}`);
    console.log(`   Source Breakdowns:`);
    for (const [src, stats] of Object.entries(report.sourceBreakdowns || {})) {
      console.log(`     • ${stats.sourceName} (${src}): fetched=${stats.rawFetched}, saved=${stats.saved}, duplicates=${stats.duplicates}, invalid=${stats.invalid}, status=${stats.status}`);
    }

    if (report.sourcesPolled !== 3) {
      throw new Error(`Expected 3 sources polled, got ${report.sourcesPolled}`);
    }

    if (report.newJobsSaved === 0) {
      throw new Error('Expected at least 1 new job saved across the sources.');
    }

    // 3. Verify Database Records and Sources
    console.log('\n3️⃣ Verifying database records and source tracking in SQLite...');
    const savedJobs = await prisma.job.findMany({
      where: { id: { in: report.savedJobIds } },
      include: { source: true },
    });

    console.log(`   Saved ${savedJobs.length} jobs in database:`);
    for (const job of savedJobs) {
      console.log(`   • [${job.source?.name || 'Unknown Source'}] "${job.title}" at ${job.company}`);
      console.log(`     Location: ${job.location}, Work: ${job.workArrangement}, Experience: ${job.experienceLevel || 'none'}`);
      console.log(`     Salary: ${job.salary || 'none'}, Deadline: ${job.deadline ? job.deadline.toISOString() : 'none'}`);
    }

    // Verify JobSource records have updated lastPolledAt
    const dbSources = await prisma.jobSource.findMany({
      where: { name: { in: ['Jobicy', 'We Work Remotely', 'Remotive'] } },
    });
    console.log(`\n   Verified ${dbSources.length} JobSource entries in SQLite:`);
    for (const s of dbSources) {
      console.log(`   • ${s.name} (${s.type}): lastPolledAt=${s.lastPolledAt?.toISOString()}`);
      if (!s.lastPolledAt) {
        throw new Error(`JobSource ${s.name} missing lastPolledAt!`);
      }
    }

    // Verify AutomationRun record
    const runRecord = await prisma.automationRun.findUnique({
      where: { id: report.runId },
    });
    console.log(`\n   Verified AutomationRun record: status=${runRecord?.status}, discoveredJobs=${runRecord?.discoveredJobs}`);

    // 4. Test Deduplication on Immediate Re-poll
    console.log('\n4️⃣ Testing multi-source deduplication on immediate re-poll...');
    const rePollReport = await executeDiscovery(multiAdapters, { limit: 2, query: 'ai' });
    console.log(`   Re-poll duplicates skipped: ${rePollReport.duplicatesSkipped.total}`);
    console.log(`   Re-poll new jobs saved: ${rePollReport.newJobsSaved}`);
    if (rePollReport.newJobsSaved !== 0) {
      throw new Error(`Deduplication failure: expected 0 new jobs saved on re-poll, got ${rePollReport.newJobsSaved}`);
    }
    console.log(`✅ Deduplication verified: all re-polled listings recognized as duplicates and skipped.`);

    // 5. Cleanup test records
    console.log('\n5️⃣ Cleaning up test records from database...');
    if (report.savedJobIds.length > 0) {
      await prisma.job.deleteMany({ where: { id: { in: report.savedJobIds } } });
    }
    await prisma.automationRun.deleteMany({
      where: { id: { in: [report.runId, rePollReport.runId] } },
    });
    console.log('✅ Cleaned up test jobs and automation runs successfully.');

    console.log('\n🎉 ALL 3 PERMITTED JOB DISCOVERY SOURCES INTEGRATED & VERIFIED 100%!\n');
  } catch (error) {
    console.error('\n❌ Multi-Source Test Failure:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testMultiSourceDiscovery();
