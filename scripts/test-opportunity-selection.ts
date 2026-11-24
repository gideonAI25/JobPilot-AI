export {};

import { prisma } from '../lib/prisma';
import { selectOpportunitiesForPreparation } from '../services/selection';
import { getOrCreatePrimaryProfile } from '../services/server/profileDbService';

async function testOpportunitySelection() {
  console.log('🧪 Testing Phase 5: Opportunity Ranking and Selection System...\n');

  const createdJobIds: string[] = [];
  const createdAutoRunIds: string[] = [];

  try {
    // 0. Ensure verified profile
    console.log('0️⃣ Ensuring verified candidate profile in database...');
    const primaryCandidate = await getOrCreatePrimaryProfile();

    // Ensure test source
    let source = await prisma.jobSource.findUnique({ where: { name: 'Selection Test Source' } });
    if (!source) {
      source = await prisma.jobSource.create({
        data: {
          name: 'Selection Test Source',
          type: 'api',
          baseUrl: 'https://selection.test',
        },
      });
    }

    // Helper to create test job + evaluation + optional application
    async function createTestJobFixture(params: {
      suffix: string;
      title: string;
      company: string;
      score: number;
      eligibility?: string;
      recommendation?: string;
      daysOld?: number;
      deadlineDaysFromNow?: number | null;
      appStatus?: string | null;
    }) {
      const url = `https://selection.test/jobs/job-${params.suffix}`;

      // Clean up if already exists
      await prisma.job.deleteMany({ where: { url } });

      const postedAt = params.daysOld !== undefined
        ? new Date(Date.now() - params.daysOld * 24 * 60 * 60 * 1000)
        : new Date();

      const deadline = params.deadlineDaysFromNow !== undefined && params.deadlineDaysFromNow !== null
        ? new Date(Date.now() + params.deadlineDaysFromNow * 24 * 60 * 60 * 1000)
        : null;

      const job = await prisma.job.create({
        data: {
          sourceId: source!.id,
          title: params.title,
          company: params.company,
          url,
          location: 'Remote (Worldwide)',
          workArrangement: 'remote',
          description: `Test job description for ${params.title}`,
          postedAt,
          deadline,
        },
      });
      createdJobIds.push(job.id);

      // Create evaluation
      const eligibility = params.eligibility || 'ELIGIBLE';
      const recommendation = params.recommendation || (params.score >= 75 ? 'STRONG_MATCH' : 'POSSIBLE_MATCH');

      await prisma.jobEvaluation.create({
        data: {
          jobId: job.id,
          profileId: primaryCandidate.id,
          overallMatchScore: params.score,
          eligibility,
          recommendation,
          explanation: `Evaluation for ${params.title}`,
        },
      });

      // Create application if requested
      if (params.appStatus) {
        await prisma.application.create({
          data: {
            jobId: job.id,
            profileId: primaryCandidate.id,
            status: params.appStatus,
          },
        });
      }

      return job;
    }

    // =========================================================================
    // SCENARIO 1: Zero Qualified Jobs
    // =========================================================================
    console.log('1️⃣ SCENARIO 1: Testing Zero Qualified Jobs (All excluded)...');
    // Job A: Ineligible (location restriction)
    await createTestJobFixture({
      suffix: 'ineligible-1',
      title: 'US Clearance Engineer',
      company: 'Defense Corp',
      score: 30,
      eligibility: 'INELIGIBLE',
      recommendation: 'NOT_RECOMMENDED',
    });

    // Job B: Past Deadline
    await createTestJobFixture({
      suffix: 'expired-deadline-2',
      title: 'Past Deadline Role',
      company: 'Old Corp',
      score: 85,
      deadlineDaysFromNow: -2, // Deadline 2 days ago
    });

    // Job C: Previously Rejected Application
    await createTestJobFixture({
      suffix: 'rejected-app-3',
      title: 'Rejected Opportunity',
      company: 'Reject Corp',
      score: 80,
      appStatus: 'REJECTED',
    });

    // Job D: Score Below Minimum Threshold (< 50)
    await createTestJobFixture({
      suffix: 'low-score-4',
      title: 'Low Match Role',
      company: 'Mismatch Corp',
      score: 42,
      recommendation: 'NOT_RECOMMENDED',
    });

    const result0 = await selectOpportunitiesForPreparation();
    createdAutoRunIds.push(result0.automationRunId!);

    console.log(`   Total evaluated considered: ${result0.totalEvaluatedConsidered}`);
    console.log(`   Excluded counts:`, result0.excludedCounts);
    console.log(`   Total Qualified: ${result0.totalQualified}`);
    console.log(`   Selected Count: ${result0.selectedCount}`);

    if (result0.selectedCount !== 0 || result0.selectedOpportunities.length !== 0) {
      throw new Error(`Expected exactly 0 selected opportunities, got ${result0.selectedCount}`);
    }
    console.log(`✅ Scenario 1 Passed: Exactly 0 applications prepared when no suitable jobs exist.`);

    // Clean up Scenario 1 jobs before Scenario 2
    await prisma.jobEvaluation.deleteMany({ where: { jobId: { in: createdJobIds } } });
    await prisma.application.deleteMany({ where: { jobId: { in: createdJobIds } } });
    await prisma.job.deleteMany({ where: { id: { in: createdJobIds } } });
    createdJobIds.length = 0;

    // =========================================================================
    // SCENARIO 2: Exactly One Qualified Job
    // =========================================================================
    console.log('\n2️⃣ SCENARIO 2: Testing Exactly One Qualified Job...');
    const singleJob = await createTestJobFixture({
      suffix: 'single-1',
      title: 'Staff AI Engineer',
      company: 'Anthropic Partner',
      score: 92,
      daysOld: 1,
    });

    const result1 = await selectOpportunitiesForPreparation();
    createdAutoRunIds.push(result1.automationRunId!);

    console.log(`   Total Qualified: ${result1.totalQualified}, Selected Count: ${result1.selectedCount}`);
    console.log(`   Selected: "${result1.selectedOpportunities[0]?.title}" at ${result1.selectedOpportunities[0]?.company}`);

    if (result1.selectedCount !== 1) {
      throw new Error(`Expected exactly 1 selected opportunity, got ${result1.selectedCount}`);
    }

    // Verify application status transitioned to PREPARING
    const app1 = await prisma.application.findFirst({ where: { jobId: singleJob.id } });
    console.log(`   Application Status in DB: ${app1?.status}`);
    if (app1?.status !== 'PREPARING') {
      throw new Error(`Expected application status PREPARING, got ${app1?.status}`);
    }
    console.log(`✅ Scenario 2 Passed: Exactly 1 application selected and prepared.`);

    // Clean up Scenario 2
    await prisma.jobEvaluation.deleteMany({ where: { jobId: { in: createdJobIds } } });
    await prisma.application.deleteMany({ where: { jobId: { in: createdJobIds } } });
    await prisma.job.deleteMany({ where: { id: { in: createdJobIds } } });
    createdJobIds.length = 0;

    // =========================================================================
    // SCENARIO 3: Exactly Two Qualified Jobs
    // =========================================================================
    console.log('\n3️⃣ SCENARIO 3: Testing Exactly Two Qualified Jobs...');
    await createTestJobFixture({
      suffix: 'pair-1',
      title: 'Senior LLM Workflow Engineer',
      company: 'Cognitive Flow',
      score: 88,
      daysOld: 2,
    });
    await createTestJobFixture({
      suffix: 'pair-2',
      title: 'Lead Full Stack AI Developer',
      company: 'NextGen Stack',
      score: 82,
      daysOld: 3,
    });

    const result2 = await selectOpportunitiesForPreparation();
    createdAutoRunIds.push(result2.automationRunId!);

    console.log(`   Total Qualified: ${result2.totalQualified}, Selected Count: ${result2.selectedCount}`);
    if (result2.selectedCount !== 2) {
      throw new Error(`Expected exactly 2 selected opportunities, got ${result2.selectedCount}`);
    }
    console.log(`✅ Scenario 3 Passed: Exactly 2 applications selected and prepared.`);

    // Clean up Scenario 3
    await prisma.jobEvaluation.deleteMany({ where: { jobId: { in: createdJobIds } } });
    await prisma.application.deleteMany({ where: { jobId: { in: createdJobIds } } });
    await prisma.job.deleteMany({ where: { id: { in: createdJobIds } } });
    createdJobIds.length = 0;

    // =========================================================================
    // SCENARIO 4: Exactly Three Qualified Jobs
    // =========================================================================
    console.log('\n4️⃣ SCENARIO 4: Testing Exactly Three Qualified Jobs...');
    await createTestJobFixture({
      suffix: 'trio-1',
      title: 'Senior Applied AI Engineer',
      company: 'AlphaTech',
      score: 94,
    });
    await createTestJobFixture({
      suffix: 'trio-2',
      title: 'Autonomous Agents Developer',
      company: 'Agentic AI',
      score: 89,
    });
    await createTestJobFixture({
      suffix: 'trio-3',
      title: 'Python Machine Learning Engineer',
      company: 'DataFlow Inc',
      score: 85,
    });

    const result3 = await selectOpportunitiesForPreparation();
    createdAutoRunIds.push(result3.automationRunId!);

    console.log(`   Total Qualified: ${result3.totalQualified}, Selected Count: ${result3.selectedCount}`);
    if (result3.selectedCount !== 3) {
      throw new Error(`Expected exactly 3 selected opportunities, got ${result3.selectedCount}`);
    }
    console.log(`✅ Scenario 4 Passed: Exactly 3 applications selected and prepared.`);

    // Clean up Scenario 4
    await prisma.jobEvaluation.deleteMany({ where: { jobId: { in: createdJobIds } } });
    await prisma.application.deleteMany({ where: { jobId: { in: createdJobIds } } });
    await prisma.job.deleteMany({ where: { id: { in: createdJobIds } } });
    createdJobIds.length = 0;

    // =========================================================================
    // SCENARIO 5: More Than Three Qualified Jobs (5 Jobs -> Top 3 Selected by Rank)
    // =========================================================================
    console.log('\n5️⃣ SCENARIO 5: Testing Five Qualified Jobs (Capped at Top 3 by Rank)...');
    // Job 1: Score 95, fresh (+5 boost) -> Priority: 105
    await createTestJobFixture({
      suffix: 'five-1',
      title: 'Principal AI Engineer',
      company: 'TopRank Corp',
      score: 95,
      daysOld: 1,
    });
    // Job 2: Score 90, urgent deadline in 3 days (+15 boost) -> Priority: 110 (Should rank #1!)
    await createTestJobFixture({
      suffix: 'five-2',
      title: 'Urgent AI Specialist',
      company: 'Deadline Corp',
      score: 90,
      deadlineDaysFromNow: 3,
    });
    // Job 3: Score 86 -> Priority: 91
    await createTestJobFixture({
      suffix: 'five-3',
      title: 'Senior Python Engineer',
      company: 'MidHigh Corp',
      score: 86,
    });
    // Job 4: Score 75 -> Priority: 80 (Should NOT be selected)
    await createTestJobFixture({
      suffix: 'five-4',
      title: 'Junior/Mid AI Engineer',
      company: 'Lower Corp',
      score: 75,
    });
    // Job 5: Score 65 -> Priority: 70 (Should NOT be selected)
    await createTestJobFixture({
      suffix: 'five-5',
      title: 'Generalist Developer',
      company: 'Bottom Corp',
      score: 65,
    });

    const result5 = await selectOpportunitiesForPreparation();
    createdAutoRunIds.push(result5.automationRunId!);

    console.log(`   Total Qualified: ${result5.totalQualified}, Configured Limit: ${result5.configuredLimit}, Selected: ${result5.selectedCount}`);
    console.log(`   Ranked Selection List:`);
    for (const opp of result5.selectedOpportunities) {
      console.log(`     #${opp.rank}: "${opp.title}" at ${opp.company} - Match: ${opp.overallMatchScore}%, Priority: ${opp.compositeRankScore} (${opp.selectionReason})`);
    }

    if (result5.totalQualified !== 5) {
      throw new Error(`Expected 5 total qualified, got ${result5.totalQualified}`);
    }
    if (result5.selectedCount !== 3) {
      throw new Error(`Expected exactly 3 selected (maximum 3 cap), got ${result5.selectedCount}`);
    }
    // Verify Rank #1 is the urgent deadline job
    if (!result5.selectedOpportunities[0].title.includes('Urgent AI Specialist')) {
      throw new Error(`Expected Urgent AI Specialist to rank #1 due to deadline boost, got ${result5.selectedOpportunities[0].title}`);
    }
    console.log(`✅ Scenario 5 Passed: Capped at top 3, ranking formula prioritized deadline and match score.`);

    // =========================================================================
    // SCENARIO 6: Prevention: Overwrite & Duplication Protection
    // =========================================================================
    console.log('\n6️⃣ SCENARIO 6: Testing Overwrite & Duplication Prevention...');
    // Take one of the selected jobs and simulate user approving it or having it in PENDING_REVIEW
    const protectedJob = await prisma.job.findFirst({
      where: { title: { contains: 'Urgent AI Specialist' } },
      include: { applications: true },
    });

    const protectedApp = protectedJob!.applications[0];
    await prisma.application.update({
      where: { id: protectedApp.id },
      data: {
        status: 'PENDING_REVIEW',
        notes: 'Reviewer manual note: Excellent candidate match, candidate approved interview.',
      },
    });

    // Run selection again
    const resultRepoll = await selectOpportunitiesForPreparation();
    createdAutoRunIds.push(resultRepoll.automationRunId!);

    console.log(`   Re-poll selected count: ${resultRepoll.selectedCount}, already in pipeline excluded: ${resultRepoll.excludedCounts.alreadyInPipeline}`);

    // Verify protected application was NOT overwritten or downgraded
    const verifiedApp = await prisma.application.findUnique({ where: { id: protectedApp.id } });
    console.log(`   Protected Application Status: "${verifiedApp?.status}", Notes: "${verifiedApp?.notes}"`);

    if (verifiedApp?.status !== 'PENDING_REVIEW') {
      throw new Error(`Application overwrite protection failed: status changed to ${verifiedApp?.status}`);
    }
    if (!verifiedApp?.notes?.includes('Reviewer manual note')) {
      throw new Error('Application overwrite protection failed: reviewer notes were wiped!');
    }
    console.log(`✅ Scenario 6 Passed: Existing pending applications are 100% protected and never overwritten.`);

    // =========================================================================
    // SCENARIO 7: Configurable Selection Limit
    // =========================================================================
    console.log('\n7️⃣ SCENARIO 7: Testing Configurable Selection Limit (limit = 2)...');
    // Clean up existing applications to free up qualified jobs
    await prisma.application.deleteMany({ where: { jobId: { in: createdJobIds } } });

    const resultCustomLimit = await selectOpportunitiesForPreparation({
      config: { maxSelectionLimit: 2 },
    });
    createdAutoRunIds.push(resultCustomLimit.automationRunId!);

    console.log(`   Configured Limit: ${resultCustomLimit.configuredLimit}, Selected Count: ${resultCustomLimit.selectedCount}`);
    if (resultCustomLimit.selectedCount !== 2) {
      throw new Error(`Expected exactly 2 selected with custom limit 2, got ${resultCustomLimit.selectedCount}`);
    }
    console.log(`✅ Scenario 7 Passed: Custom selection limit enforced.`);

    // =========================================================================
    // SCENARIO 8: AutomationRun & ActivityLog Audit Verification
    // =========================================================================
    console.log('\n8️⃣ SCENARIO 8: Testing AutomationRun & ActivityLog Audit Records...');
    const latestAutoRun = await prisma.automationRun.findUnique({
      where: { id: resultCustomLimit.automationRunId },
      include: { activityLogs: true },
    });

    console.log(`   AutomationRun ID: ${latestAutoRun?.id}`);
    console.log(`   Run Type: ${latestAutoRun?.runType}, Status: ${latestAutoRun?.status}`);
    console.log(`   Qualified Jobs: ${latestAutoRun?.qualifiedJobs}, Prepared Applications: ${latestAutoRun?.preparedApplications}`);
    console.log(`   Activity Logs count: ${latestAutoRun?.activityLogs.length}`);

    if (latestAutoRun?.status !== 'COMPLETED' || latestAutoRun?.preparedApplications !== 2) {
      throw new Error('AutomationRun record does not match expected stats.');
    }
    if (latestAutoRun.activityLogs.length < 2) {
      throw new Error('Expected ActivityLog audit records for each selected opportunity.');
    }
    console.log(`✅ Scenario 8 Passed: AutomationRun and ActivityLog recorded accurately.`);

    console.log('\n🎉 ALL OPPORTUNITY RANKING & SELECTION TESTS PASSED 100%!\n');
  } catch (error) {
    console.error('\n❌ Test Failure:', error);
    process.exit(1);
  } finally {
    console.log('🧹 Cleaning up test records in finally block...');
    if (createdJobIds.length > 0) {
      await prisma.jobEvaluation.deleteMany({ where: { jobId: { in: createdJobIds } } });
      await prisma.application.deleteMany({ where: { jobId: { in: createdJobIds } } });
      await prisma.job.deleteMany({ where: { id: { in: createdJobIds } } });
      await prisma.activityLog.deleteMany({
        where: {
          OR: [
            { entityType: 'Job', entityId: { in: createdJobIds } },
            { automationRunId: { in: createdAutoRunIds } },
          ],
        },
      });
    }
    if (createdAutoRunIds.length > 0) {
      await prisma.automationRun.deleteMany({
        where: { id: { in: createdAutoRunIds } },
      });
    }
    await prisma.$disconnect();
  }
}

testOpportunitySelection();
