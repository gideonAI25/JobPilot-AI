/**
 * Comprehensive End-to-End Integration Test Suite for Applications Section
 * Tests all requirements, validation guards, human-in-the-loop rules, and document editing.
 */

const BASE_URL = 'http://localhost:3000';

async function request(path: string, options: RequestInit = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
}

async function runApplicationsLiveTests() {
  console.log('🧪 Starting Applications Section End-to-End Test Suite...\n');

  const timestamp = Date.now();
  let createdJobId: string | null = null;
  let applicationId: string | null = null;

  try {
    // 1. Initial State Check
    console.log('1️⃣ Checking initial applications endpoint...');
    const initRes = await request('/api/applications');
    if (!initRes.ok || !initRes.data.success) {
      throw new Error(`Failed to fetch initial applications: ${JSON.stringify(initRes.data)}`);
    }
    console.log(`✅ GET /api/applications returned count=${initRes.data.count}, total in metrics=${initRes.data.metrics.total}`);

    // 2. Create a test job to link application to
    console.log('\n2️⃣ Creating test job opportunity...');
    const jobRes = await request('/api/jobs', {
      method: 'POST',
      body: JSON.stringify({
        url: `https://test-company-apps.org/jobs/lead-architect-${timestamp}`,
        title: 'Lead AI Platform Architect',
        company: 'Apex Intelligence Corp',
        description: 'Lead the design of next-generation AI workflows and application infrastructure.',
        location: 'Remote (Worldwide)',
        workArrangement: 'remote',
        employmentType: 'full-time',
        experienceLevel: 'Lead',
        salary: '$160,000 - $190,000 USD',
        skills: ['TypeScript', 'Node.js', 'Next.js', 'Python', 'LLMs'],
        applicationUrl: 'https://test-company-apps.org/apply/lead-architect',
      }),
    });

    if (!jobRes.ok || !jobRes.data.success || !jobRes.data.job) {
      throw new Error(`Failed to create test job: ${JSON.stringify(jobRes.data)}`);
    }
    createdJobId = jobRes.data.job.id;
    console.log(`✅ Test Job created: ID=${createdJobId}, Title="${jobRes.data.job.title}"`);

    // 3. Create Application for Job
    console.log('\n3️⃣ Creating application for job via POST /api/applications...');
    const appRes = await request('/api/applications', {
      method: 'POST',
      body: JSON.stringify({
        jobId: createdJobId,
        notes: 'Target application prepared for Lead AI Architect role',
      }),
    });

    if (!appRes.ok || !appRes.data.success || !appRes.data.application) {
      throw new Error(`Failed to create application: ${JSON.stringify(appRes.data)}`);
    }

    applicationId = appRes.data.application.id;
    console.log(`✅ Application created! ID=${applicationId}, Status=${appRes.data.application.status}`);
    if (appRes.data.application.status !== 'PENDING_REVIEW') {
      throw new Error(`Expected initial status PENDING_REVIEW, got ${appRes.data.application.status}`);
    }

    // 4. Draft & Edit Application Materials (Documents)
    console.log('\n4️⃣ Testing document drafting & editing...');
    
    // Draft Tailored Resume
    const doc1Res = await request(`/api/applications/${applicationId}/documents`, {
      method: 'POST',
      body: JSON.stringify({
        documentType: 'TAILORED_RESUME',
        originalFilename: 'Resume_Lead_AI_Architect_Apex.md',
        content: '# Candidate Name\n\n## Lead AI Architect\n\nExtensive expertise in distributed agent architectures and LLM application engineering.',
      }),
    });
    if (!doc1Res.ok || !doc1Res.data.success || !doc1Res.data.document) {
      throw new Error(`Failed to create document: ${JSON.stringify(doc1Res.data)}`);
    }
    const resumeDocId = doc1Res.data.document.id;
    console.log(`✅ Tailored Resume created: ID=${resumeDocId}, Version=${doc1Res.data.document.version}`);

    // Draft Cover Letter
    const doc2Res = await request(`/api/applications/${applicationId}/documents`, {
      method: 'POST',
      body: JSON.stringify({
        documentType: 'COVER_LETTER',
        originalFilename: 'Cover_Letter_Apex_Corp.md',
        content: 'Dear Hiring Team at Apex Intelligence,\n\nI am thrilled to submit my tailored application for the Lead AI Platform Architect position...',
      }),
    });
    if (!doc2Res.ok || !doc2Res.data.success) {
      throw new Error(`Failed to create cover letter: ${JSON.stringify(doc2Res.data)}`);
    }
    console.log(`✅ Cover Letter created: ID=${doc2Res.data.document.id}`);

    // Edit the Tailored Resume (bump version)
    const docEditRes = await request(`/api/applications/${applicationId}/documents`, {
      method: 'POST',
      body: JSON.stringify({
        id: resumeDocId,
        documentType: 'TAILORED_RESUME',
        content: '# Candidate Name - Revised\n\n## Lead AI Architect\n\nUpdated with specific metrics on LLM latency reductions and cost efficiency.',
      }),
    });
    if (!docEditRes.ok || !docEditRes.data.success) {
      throw new Error(`Failed to update resume: ${JSON.stringify(docEditRes.data)}`);
    }
    if (docEditRes.data.document.version !== 2) {
      throw new Error(`Expected document version 2, got ${docEditRes.data.document.version}`);
    }
    console.log(`✅ Resume updated successfully with incremented version=${docEditRes.data.document.version}`);

    // 5. Test Status Transitions
    console.log('\n5️⃣ Testing status transitions and human guard rules...');

    // A. Approve Application (PENDING_REVIEW -> APPROVED)
    const approveRes = await request(`/api/applications/${applicationId}`, {
      method: 'PATCH',
      body: JSON.stringify({ targetStatus: 'APPROVED' }),
    });
    if (!approveRes.ok || !approveRes.data.success) {
      throw new Error(`Failed to approve application: ${JSON.stringify(approveRes.data)}`);
    }
    if (approveRes.data.application.status !== 'APPROVED') {
      throw new Error(`Expected status APPROVED, got ${approveRes.data.application.status}`);
    }
    console.log(`✅ Transitioned to APPROVED (approvalDate=${approveRes.data.application.approvalDate})`);

    // B. Transition to READY_TO_SUBMIT
    const readyRes = await request(`/api/applications/${applicationId}`, {
      method: 'PATCH',
      body: JSON.stringify({ targetStatus: 'READY_TO_SUBMIT' }),
    });
    if (!readyRes.ok || !readyRes.data.success || readyRes.data.application.status !== 'READY_TO_SUBMIT') {
      throw new Error(`Failed to transition to READY_TO_SUBMIT: ${JSON.stringify(readyRes.data)}`);
    }
    console.log(`✅ Transitioned to READY_TO_SUBMIT`);

    // C. Guard Check: Try marking APPLIED without explicit submission confirmation
    console.log('\n   Checking Human-in-the-Loop guard for APPLIED status...');
    const invalidAppliedRes = await request(`/api/applications/${applicationId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        targetStatus: 'APPLIED',
        submissionConfirmation: false, // NOT confirmed!
      }),
    });
    if (invalidAppliedRes.status !== 400 || invalidAppliedRes.data.success) {
      throw new Error('Guard failure: Application was marked APPLIED without explicit confirmation!');
    }
    console.log(`✅ Guard passed: Unconfirmed APPLIED transition was correctly blocked ("${invalidAppliedRes.data.error}")`);

    // D. Confirm APPLIED with explicit human confirmation
    console.log('\n   Confirming APPLIED with explicit human confirmation...');
    const validAppliedRes = await request(`/api/applications/${applicationId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        targetStatus: 'APPLIED',
        submissionConfirmation: true, // EXPLICIT CONFIRMATION
        submissionDate: '2026-11-18',
        notes: 'Submitted via Apex Careers portal. Confirmation #APX-83921.',
      }),
    });
    if (!validAppliedRes.ok || !validAppliedRes.data.success || validAppliedRes.data.application.status !== 'APPLIED') {
      throw new Error(`Failed to mark as APPLIED: ${JSON.stringify(validAppliedRes.data)}`);
    }
    console.log(`✅ Application marked APPLIED with submissionDate=${validAppliedRes.data.application.submissionDate}`);

    // E. Test Rejection transition
    console.log('\n   Testing rejection transition...');
    const rejectRes = await request(`/api/applications/${applicationId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        targetStatus: 'REJECTED',
        rejectionReason: 'Candidate accepted another offer',
      }),
    });
    if (!rejectRes.ok || !rejectRes.data.success || rejectRes.data.application.status !== 'REJECTED') {
      throw new Error(`Failed to reject application: ${JSON.stringify(rejectRes.data)}`);
    }
    console.log(`✅ Transitioned to REJECTED with reason="${rejectRes.data.application.rejectionReason}"`);

    // F. Test Archive transition
    console.log('\n   Testing archive transition...');
    const archiveRes = await request(`/api/applications/${applicationId}`, {
      method: 'PATCH',
      body: JSON.stringify({ targetStatus: 'ARCHIVED' }),
    });
    if (!archiveRes.ok || !archiveRes.data.success || archiveRes.data.application.status !== 'ARCHIVED') {
      throw new Error(`Failed to archive application: ${JSON.stringify(archiveRes.data)}`);
    }
    console.log(`✅ Transitioned to ARCHIVED`);

    // 6. Test Application Detail Retrieval & Activity History
    console.log('\n6️⃣ Testing GET /api/applications/[id] and activity history...');
    const detailRes = await request(`/api/applications/${applicationId}`);
    if (!detailRes.ok || !detailRes.data.success || !detailRes.data.application) {
      throw new Error(`Failed to get application detail: ${JSON.stringify(detailRes.data)}`);
    }
    const detail = detailRes.data.application;
    console.log(`✅ Application detail retrieved: Title="${detail.jobTitle}", Status="${detail.status}"`);
    console.log(`   Documents attached: ${detail.generatedDocuments.length}`);
    console.log(`   Activity history entries: ${detail.activityHistory.length}`);
    if (detail.activityHistory.length < 4) {
      throw new Error(`Expected at least 4 activity history entries, got ${detail.activityHistory.length}`);
    }
    console.log(`   Sample activity action: "${detail.activityHistory[0].action}"`);

    // 7. Test Server-Rendered UI Pages
    console.log('\n7️⃣ Testing server-rendered HTML routes...');
    const listPageRes = await fetch(`${BASE_URL}/applications`);
    if (!listPageRes.ok) {
      throw new Error(`GET /applications failed with HTTP ${listPageRes.status}`);
    }
    const listHtml = await listPageRes.text();
    if (!listHtml.includes('Applications') || !listHtml.includes('Strict Human-in-the-Loop')) {
      throw new Error('GET /applications markup missing expected header text');
    }
    console.log(`✅ GET /applications rendered successfully (HTTP 200, ${listHtml.length} bytes)`);

    const detailPageRes = await fetch(`${BASE_URL}/applications/${applicationId}`);
    if (!detailPageRes.ok) {
      throw new Error(`GET /applications/${applicationId} failed with HTTP ${detailPageRes.status}`);
    }
    const detailHtml = await detailPageRes.text();
    if (!detailHtml.includes('Lead AI Platform Architect') || !detailHtml.includes('Apex Intelligence Corp')) {
      throw new Error('GET /applications/[id] markup missing expected job title or company');
    }
    console.log(`✅ GET /applications/[id] rendered successfully (HTTP 200, ${detailHtml.length} bytes)`);

    // 8. Cleanup test data
    console.log('\n8️⃣ Cleaning up test records...');
    await request(`/api/jobs/${createdJobId}`, { method: 'DELETE' });
    console.log(`✅ Test job and associated records cleaned up successfully`);
    createdJobId = null;

    console.log('\n🎉 ALL APPLICATIONS TESTS PASSED SUCCESSFULLY!\n');
  } catch (error) {
    console.error('\n❌ Test Failure:', error);
    if (createdJobId) {
      console.log(`Cleaning up remaining test job ${createdJobId}...`);
      await request(`/api/jobs/${createdJobId}`, { method: 'DELETE' }).catch(() => {});
    }
    process.exit(1);
  }
}

runApplicationsLiveTests();

