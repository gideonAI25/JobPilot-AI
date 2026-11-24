export {};

import { prisma } from '../lib/prisma';
import {
  evaluateJob,
  getJobEvaluation,
  calculateJobFreshnessScore,
  aggregateEvaluationScore,
  normalizeWeights,
  DEFAULT_EVALUATION_WEIGHTS,
} from '../services/evaluation';
import { createApplicationForJob } from '../services/server/applicationService';
import { getOrCreatePrimaryProfile } from '../services/server/profileDbService';

async function testEvaluationEngine() {
  console.log('🧪 Testing Phase 5: JobPilot AI Job Evaluation Engine...\n');

  const createdJobIds: string[] = [];
  const createdAppIds: string[] = [];

  try {
    // 0. Setup candidate profile with verified Nigeria location & AI engineering skills
    console.log('0️⃣ Ensuring verified candidate profile in database...');

    // Clean up any lingering test jobs from previous runs
    await prisma.job.deleteMany({
      where: {
        url: {
          in: [
            'https://test.local/jobs/eval-eligible-1',
            'https://test.local/jobs/eval-unclear-2',
            'https://test.local/jobs/eval-ineligible-3',
          ],
        },
      },
    });

    const primaryCandidate = await getOrCreatePrimaryProfile();

    // Ensure candidate country is set to Nigeria
    const profile = await prisma.candidateProfile.update({
      where: { id: primaryCandidate.id },
      data: {
        country: 'Nigeria',
        city: 'Lagos',
        headline: 'Senior AI Engineer & Full Stack Developer',
        summary: 'Experienced AI and software engineer specializing in LLM applications, Python, TypeScript, and distributed workflows.',
      },
      include: {
        technicalSkills: true,
      },
    });

    // Ensure key technical skills exist in profile
    const existingSkillNames = new Set(profile.technicalSkills.map((s) => s.name.toLowerCase()));
    const desiredSkills = [
      { name: 'Python', category: 'Backend', proficiency: 'Expert' },
      { name: 'TypeScript', category: 'Frontend', proficiency: 'Advanced' },
      { name: 'LangChain', category: 'AI / ML', proficiency: 'Advanced' },
      { name: 'Next.js', category: 'Frontend', proficiency: 'Advanced' },
    ];

    for (const skill of desiredSkills) {
      if (!existingSkillNames.has(skill.name.toLowerCase())) {
        await prisma.technicalSkill.create({
          data: {
            profileId: profile.id,
            name: skill.name,
            category: skill.category,
            proficiency: skill.proficiency,
          },
        });
      }
    }
    console.log(`   Candidate: "${profile.fullName}", Country: "${profile.country}", Skills: Python, TypeScript, LangChain, Next.js`);

    // Ensure test source exists
    let testSource = await prisma.jobSource.findUnique({ where: { name: 'Evaluation Test Source' } });
    if (!testSource) {
      testSource = await prisma.jobSource.create({
        data: {
          name: 'Evaluation Test Source',
          type: 'api',
          baseUrl: 'https://test.local',
        },
      });
    }

    // -------------------------------------------------------------
    // SCENARIO 1: Confirmed ELIGIBLE Job (Worldwide Remote)
    // -------------------------------------------------------------
    console.log('\n1️⃣ SCENARIO 1: Confirmed ELIGIBLE Job (Worldwide Remote, accepts Nigeria)...');
    const eligibleJob = await prisma.job.create({
      data: {
        sourceId: testSource.id,
        title: 'Senior AI Automation Engineer',
        company: 'Global AI Ventures',
        url: 'https://test.local/jobs/eval-eligible-1',
        location: 'Remote (Worldwide - Anywhere in the World)',
        workArrangement: 'remote',
        employmentType: 'full-time',
        experienceLevel: 'Senior',
        skills: JSON.stringify(['Python', 'LangChain', 'TypeScript', 'Next.js', 'FastAPI']),
        description: `
We are looking for a Senior AI Automation Engineer to join our fully distributed worldwide team.
Applicants can be located anywhere in the world, including Africa and Nigeria.
Key Responsibilities:
- Build autonomous agent workflows using Python, LangChain, and modern LLM frameworks.
- Design responsive full-stack dashboards using Next.js and TypeScript.
- Architect high-throughput API endpoints with FastAPI and SQLite/PostgreSQL.
Qualifications:
- 4+ years of professional software engineering experience.
- Strong proficiency in Python, TypeScript, and prompt engineering.
        `.trim(),
        postedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days old (Freshness: 100)
      },
    });
    createdJobIds.push(eligibleJob.id);

    // Create discovery application record
    const eligibleApp = await prisma.application.create({
      data: {
        jobId: eligibleJob.id,
        profileId: profile.id,
        status: 'DISCOVERED',
      },
    });
    createdAppIds.push(eligibleApp.id);

    // Execute Evaluation
    const evalResult1 = await evaluateJob(eligibleJob.id, {
      profileId: profile.id,
    });

    console.log(`✅ Eligible Evaluation Completed:`);
    console.log(`   Overall Score: ${evalResult1.overallMatchScore}%`);
    console.log(`   Eligibility: ${evalResult1.eligibility}`);
    console.log(`   Recommendation: ${evalResult1.recommendation}`);
    console.log(`   Scoring Dimensions:`, evalResult1.scoringDimensions);
    console.log(`   Relevant Qualifications: [${evalResult1.relevantQualifications.join(', ')}]`);
    console.log(`   Eligibility Explanation: "${evalResult1.eligibilityExplanation}"`);

    // Assertions for Scenario 1
    if (evalResult1.eligibility !== 'ELIGIBLE') {
      throw new Error(`Expected ELIGIBLE for worldwide job, got ${evalResult1.eligibility}`);
    }
    if (evalResult1.recommendation !== 'STRONG_MATCH') {
      throw new Error(`Expected STRONG_MATCH, got ${evalResult1.recommendation}`);
    }
    if (evalResult1.overallMatchScore < 70) {
      throw new Error(`Expected overall score >= 70, got ${evalResult1.overallMatchScore}`);
    }
    if (evalResult1.scoringDimensions.locationEligibility < 80) {
      throw new Error(`Expected location score >= 80 for eligible job, got ${evalResult1.scoringDimensions.locationEligibility}`);
    }

    // Verify application status transitioned to PENDING_REVIEW
    const updatedApp1 = await prisma.application.findUnique({ where: { id: eligibleApp.id } });
    console.log(`   Application Status after evaluation: ${updatedApp1?.status}`);
    if (updatedApp1?.status !== 'PENDING_REVIEW') {
      throw new Error(`Expected application status PENDING_REVIEW, got ${updatedApp1?.status}`);
    }

    // -------------------------------------------------------------
    // SCENARIO 2: UNCLEAR Eligibility Job (Unspecified Remote)
    // -------------------------------------------------------------
    console.log('\n2️⃣ SCENARIO 2: UNCLEAR Eligibility Job (Remote without country specifications)...');
    const unclearJob = await prisma.job.create({
      data: {
        sourceId: testSource.id,
        title: 'Full Stack AI Developer',
        company: 'CloudSphere Labs',
        url: 'https://test.local/jobs/eval-unclear-2',
        location: 'Remote',
        workArrangement: 'remote',
        employmentType: 'full-time',
        experienceLevel: 'Mid-Level',
        skills: JSON.stringify(['TypeScript', 'React', 'Python']),
        description: `
We are seeking a Full Stack AI Developer to work remotely.
Responsibilities:
- Build frontend interfaces with React and TypeScript.
- Integrate backend LLM APIs with Python.
Requirements:
- 3+ years experience.
(No geographic eligibility, country, or timezone specifications provided).
        `.trim(),
        postedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days old (Freshness: 75)
      },
    });
    createdJobIds.push(unclearJob.id);

    const unclearApp = await prisma.application.create({
      data: {
        jobId: unclearJob.id,
        profileId: profile.id,
        status: 'DISCOVERED',
      },
    });
    createdAppIds.push(unclearApp.id);

    const evalResult2 = await evaluateJob(unclearJob.id, {
      profileId: profile.id,
    });

    console.log(`✅ Unclear Evaluation Completed:`);
    console.log(`   Overall Score: ${evalResult2.overallMatchScore}%`);
    console.log(`   Eligibility: ${evalResult2.eligibility}`);
    console.log(`   Recommendation: ${evalResult2.recommendation}`);
    console.log(`   Requires Manual Confirmation: ${evalResult2.requiresManualConfirmation}`);
    console.log(`   Scoring Dimensions:`, evalResult2.scoringDimensions);

    // Assertions for Scenario 2
    if (evalResult2.eligibility !== 'UNCLEAR') {
      throw new Error(`Expected UNCLEAR for unspecified remote job, got ${evalResult2.eligibility}`);
    }
    // Rule 3: Do not treat unclear eligibility as confirmed eligibility (cannot be STRONG_MATCH)
    if (evalResult2.recommendation === 'STRONG_MATCH') {
      throw new Error('Rule 3 violation: Unclear eligibility cannot receive STRONG_MATCH!');
    }
    if (!evalResult2.requiresManualConfirmation) {
      throw new Error('Expected requiresManualConfirmation to be true for unclear eligibility.');
    }

    // Verify application status transitioned to NEEDS_REVIEW
    const updatedApp2 = await prisma.application.findUnique({ where: { id: unclearApp.id } });
    console.log(`   Application Status after evaluation: ${updatedApp2?.status}`);
    if (updatedApp2?.status !== 'NEEDS_REVIEW') {
      throw new Error(`Expected application status NEEDS_REVIEW, got ${updatedApp2?.status}`);
    }

    // -------------------------------------------------------------
    // SCENARIO 3: Clearly INELIGIBLE Job (US Only / Excluded)
    // -------------------------------------------------------------
    console.log('\n3️⃣ SCENARIO 3: Clearly INELIGIBLE Job (Strictly US Only / Excludes Nigeria)...');
    const ineligibleJob = await prisma.job.create({
      data: {
        sourceId: testSource.id,
        title: 'Principal AI Security Engineer',
        company: 'Defense Cyber Works',
        url: 'https://test.local/jobs/eval-ineligible-3',
        location: 'Remote (US Only - Must be US Citizen with active DoD Secret Clearance)',
        workArrangement: 'remote',
        employmentType: 'full-time',
        experienceLevel: 'Staff',
        skills: JSON.stringify(['Python', 'LangChain', 'Cybersecurity']),
        description: `
Principal AI Security Engineer.
STRICT MANDATORY REQUIREMENTS:
- Must be a United States Citizen residing within the continental US.
- Active DoD Secret Clearance is strictly required. No foreign nationals or candidates outside the US permitted.
- No visa sponsorship or international contractors.
        `.trim(),
        postedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      },
    });
    createdJobIds.push(ineligibleJob.id);

    const ineligibleApp = await prisma.application.create({
      data: {
        jobId: ineligibleJob.id,
        profileId: profile.id,
        status: 'DISCOVERED',
      },
    });
    createdAppIds.push(ineligibleApp.id);

    const evalResult3 = await evaluateJob(ineligibleJob.id, {
      profileId: profile.id,
    });

    console.log(`✅ Ineligible Evaluation Completed:`);
    console.log(`   Overall Score: ${evalResult3.overallMatchScore}% (penalized/capped)`);
    console.log(`   Eligibility: ${evalResult3.eligibility}`);
    console.log(`   Recommendation: ${evalResult3.recommendation}`);
    console.log(`   Is Eligible flag: ${evalResult3.isEligible}`);
    console.log(`   Explanation: "${evalResult3.eligibilityExplanation}"`);

    // Assertions for Scenario 3 (Rule 4: clearly ineligible jobs must not proceed)
    if (evalResult3.eligibility !== 'INELIGIBLE') {
      throw new Error(`Expected INELIGIBLE, got ${evalResult3.eligibility}`);
    }
    if (evalResult3.recommendation !== 'NOT_RECOMMENDED') {
      throw new Error(`Expected NOT_RECOMMENDED for ineligible job, got ${evalResult3.recommendation}`);
    }
    if (evalResult3.isEligible !== false) {
      throw new Error('Expected isEligible to be false.');
    }
    if (evalResult3.overallMatchScore > 35) {
      throw new Error(`Ineligible job score must be capped <= 35, got ${evalResult3.overallMatchScore}`);
    }

    // Verify application status was marked REJECTED
    const updatedApp3 = await prisma.application.findUnique({ where: { id: ineligibleApp.id } });
    console.log(`   Application Status after evaluation: ${updatedApp3?.status}`);
    if (updatedApp3?.status !== 'REJECTED') {
      throw new Error(`Expected application status REJECTED for ineligible job, got ${updatedApp3?.status}`);
    }

    // Verify Rule 4 enforcement in applicationService (trying to create an application for ineligible job is blocked)
    const blockAttempt = await createApplicationForJob({
      jobId: ineligibleJob.id,
    });
    console.log(`   Blocked application creation attempt: success=${blockAttempt.success}, error="${blockAttempt.error}"`);

    // -------------------------------------------------------------
    // SCENARIO 4: Configurable Weights Verification
    // -------------------------------------------------------------
    console.log('\n4️⃣ SCENARIO 4: Testing Configurable Weights Math...');
    const customWeights = normalizeWeights({
      skillsMatch: 0.50, // 50%
      roleRelevance: 0.20, // 20%
      experienceFit: 0.10, // 10%
      locationEligibility: 0.10, // 10%
      jobFreshness: 0.10, // 10%
    });

    const testDimensions = {
      skillsMatch: 80,
      roleRelevance: 70,
      experienceFit: 60,
      locationEligibility: 90,
      jobFreshness: 100,
    };

    const aggregatedCustom = aggregateEvaluationScore(
      testDimensions,
      customWeights,
      'ELIGIBLE'
    );

    // Expected: 80*0.5 + 70*0.2 + 60*0.1 + 90*0.1 + 100*0.1 = 40 + 14 + 6 + 9 + 10 = 79
    console.log(`   Custom Weighted Overall Score: ${aggregatedCustom.overallScore}%`);
    if (aggregatedCustom.overallScore !== 79) {
      throw new Error(`Expected 79% weighted score, got ${aggregatedCustom.overallScore}%`);
    }
    console.log(`✅ Configurable weights aggregation verified mathematically.`);

    // -------------------------------------------------------------
    // SCENARIO 5: Deduplication on Repeated Evaluation
    // -------------------------------------------------------------
    console.log('\n5️⃣ SCENARIO 5: Testing Deduplication on Re-evaluation...');
    const evalCountBefore = await prisma.jobEvaluation.count({
      where: { jobId: eligibleJob.id, profileId: profile.id },
    });

    // Re-evaluate WITHOUT forceReevaluate
    const cachedEval = await evaluateJob(eligibleJob.id, {
      profileId: profile.id,
      forceReevaluate: false,
    });

    const evalCountAfter = await prisma.jobEvaluation.count({
      where: { jobId: eligibleJob.id, profileId: profile.id },
    });

    console.log(`   Evaluation count before: ${evalCountBefore}, after re-evaluation: ${evalCountAfter}`);
    if (evalCountAfter !== evalCountBefore || evalCountAfter !== 1) {
      throw new Error(`Deduplication failure: expected 1 record, got ${evalCountAfter}`);
    }
    console.log(`✅ Deduplication verified: repeated evaluations return existing record without creating duplicates.`);

    // -------------------------------------------------------------
    // 6. Cleanup test records
    // -------------------------------------------------------------
    console.log('\n6️⃣ Cleaning up test records from SQLite...');
    await prisma.jobEvaluation.deleteMany({
      where: { jobId: { in: createdJobIds } },
    });
    await prisma.application.deleteMany({
      where: { id: { in: createdAppIds } },
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
    console.log('✅ Cleaned up all test jobs, applications, and evaluations successfully.');

    console.log('\n🎉 ALL PHASE 5 JOB EVALUATION ENGINE TESTS PASSED 100%!\n');
  } catch (error) {
    console.error('\n❌ Evaluation Engine Test Failure:', error);
    process.exit(1);
  } finally {
    console.log('🧹 Cleaning up test records in finally block...');
    if (createdJobIds.length > 0) {
      await prisma.jobEvaluation.deleteMany({
        where: { jobId: { in: createdJobIds } },
      });
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
    }
    await prisma.$disconnect();
  }
}

testEvaluationEngine();
