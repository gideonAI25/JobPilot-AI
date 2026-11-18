export {};

/**
 * End-to-End Integration Test Suite for Find Jobs & Manual Job Entry
 * Tests the live Next.js API endpoints and database operations over HTTP.
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

async function runFindJobsLiveTests() {
  console.log('🧪 Starting Find Jobs & Manual Job Entry Live Test Suite...\n');

  const timestamp = Date.now();
  const testUrl = `https://careers.neurotechlabs.ai/jobs/senior-ai-systems-engineer-${timestamp}`;
  let createdJobId: string | null = null;

  try {
    // 1. Validation check - Missing required fields
    console.log('1️⃣ Testing validation for missing required fields...');
    const invalidRes = await request('/api/jobs', {
      method: 'POST',
      body: JSON.stringify({
        url: '',
        title: '',
        company: '',
        description: '',
      }),
    });
    if (invalidRes.status !== 400 || invalidRes.data.success) {
      throw new Error(`Expected 400 for empty body, got ${invalidRes.status}: ${JSON.stringify(invalidRes.data)}`);
    }
    console.log(`✅ Validation correctly rejected missing fields: "${invalidRes.data.error}"`);

    // 2. Manual Job Creation
    console.log('\n2️⃣ Testing manual job creation via POST /api/jobs...');
    const createRes = await request('/api/jobs', {
      method: 'POST',
      body: JSON.stringify({
        url: testUrl,
        title: 'Senior AI Systems Engineer',
        company: 'NeuroTech Labs',
        description: 'Lead the architecture and deployment of multi-agent LLM systems and vector search pipelines. Work closely with frontend and platform teams.',
        location: 'Remote (Worldwide)',
        workArrangement: 'remote',
        employmentType: 'full-time',
        experienceLevel: 'Senior',
        salary: '$145,000 - $180,000 USD',
        skills: ['TypeScript', 'Python', 'Next.js', 'Prisma', 'LLMs', 'Vector Search'],
        applicationUrl: 'https://careers.neurotechlabs.ai/apply/senior-ai-engineer',
        deadline: '2026-12-31T23:59:59.000Z',
      }),
    });

    if (!createRes.ok || !createRes.data.success || !createRes.data.job) {
      throw new Error(`Failed to create manual job: ${JSON.stringify(createRes.data)}`);
    }

    const job = createRes.data.job;
    createdJobId = job.id;
    console.log(`✅ Job created successfully!`);
    console.log(`   ID: ${job.id}`);
    console.log(`   Title: ${job.title}`);
    console.log(`   Company: ${job.company}`);
    console.log(`   Source: ${job.sourceName}`);
    console.log(`   Work Arrangement: ${job.workArrangement}`);
    console.log(`   Seniority: ${job.experienceLevel}`);
    console.log(`   Skills: [${job.skills.join(', ')}]`);

    // 3. Duplicate URL Prevention
    console.log('\n3️⃣ Testing duplicate URL prevention via POST /api/jobs...');
    const duplicateRes = await request('/api/jobs', {
      method: 'POST',
      body: JSON.stringify({
        url: testUrl,
        title: 'Another Job with Same URL',
        company: 'Another Company',
        description: 'This must be rejected because URL already exists.',
      }),
    });

    if (duplicateRes.status !== 400 || duplicateRes.data.success) {
      throw new Error(`Expected 400 duplicate rejection, got: ${JSON.stringify(duplicateRes.data)}`);
    }
    console.log(`✅ Duplicate correctly rejected: "${duplicateRes.data.error}"`);

    // 4. Job Detail Retrieval via GET /api/jobs/[id]
    console.log(`\n4️⃣ Testing detail retrieval via GET /api/jobs/${createdJobId}...`);
    const detailRes = await request(`/api/jobs/${createdJobId}`);
    if (!detailRes.ok || !detailRes.data.success || !detailRes.data.job) {
      throw new Error(`Failed to fetch job detail: ${JSON.stringify(detailRes.data)}`);
    }
    const detailJob = detailRes.data.job;
    if (detailJob.title !== 'Senior AI Systems Engineer') {
      throw new Error(`Title mismatch in detail: expected "Senior AI Systems Engineer", got "${detailJob.title}"`);
    }
    if (detailJob.sourceName !== 'Manual Entry') {
      throw new Error(`Source mismatch: expected "Manual Entry", got "${detailJob.sourceName}"`);
    }
    console.log(`✅ Detail retrieval verified: Title="${detailJob.title}", Source="${detailJob.sourceName}"`);

    // 5. Search Functionality via GET /api/jobs?search=...
    console.log('\n5️⃣ Testing search functionality via GET /api/jobs?search=...');
    
    // Search by company
    const searchRes1 = await request(`/api/jobs?search=NeuroTech`);
    if (!searchRes1.ok || !searchRes1.data.jobs) {
      throw new Error(`Search by company failed: ${JSON.stringify(searchRes1.data)}`);
    }
    const foundByCompany = searchRes1.data.jobs.some((j: any) => j.id === createdJobId);
    if (!foundByCompany) throw new Error('Search by company failed to return the created job');
    console.log(`✅ Search by company ("NeuroTech"): Found (${searchRes1.data.count} result(s))`);

    // Search by skill
    const searchRes2 = await request(`/api/jobs?search=Vector+Search`);
    if (!searchRes2.ok || !searchRes2.data.jobs) {
      throw new Error(`Search by skill failed: ${JSON.stringify(searchRes2.data)}`);
    }
    const foundBySkill = searchRes2.data.jobs.some((j: any) => j.id === createdJobId);
    if (!foundBySkill) throw new Error('Search by skill failed to return the created job');
    console.log(`✅ Search by skill keyword ("Vector Search"): Found (${searchRes2.data.count} result(s))`);

    // Search by non-existent term
    const searchRes3 = await request(`/api/jobs?search=NonExistentXYZTerm987`);
    if (!searchRes3.ok || !searchRes3.data.jobs) {
      throw new Error(`Search with negative term failed: ${JSON.stringify(searchRes3.data)}`);
    }
    const foundNegative = searchRes3.data.jobs.some((j: any) => j.id === createdJobId);
    if (foundNegative) throw new Error('Search with negative term unexpectedly matched');
    console.log(`✅ Search with non-matching term: Correctly returned 0 results`);

    // 6. Multi-Criteria Filtering
    console.log('\n6️⃣ Testing multi-criteria filters via GET /api/jobs?...');

    // Filter by workArrangement = remote
    const filterRemoteRes = await request(`/api/jobs?workArrangement=remote`);
    const foundRemote = filterRemoteRes.data.jobs?.some((j: any) => j.id === createdJobId);
    if (!foundRemote) throw new Error('Filter workArrangement=remote failed to include job');
    console.log(`✅ Filter workArrangement="remote": Verified (${filterRemoteRes.data.count} result(s))`);

    // Filter by workArrangement = on-site (should NOT include our remote job)
    const filterOnSiteRes = await request(`/api/jobs?workArrangement=on-site`);
    const foundOnSite = filterOnSiteRes.data.jobs?.some((j: any) => j.id === createdJobId);
    if (foundOnSite) throw new Error('Filter workArrangement=on-site unexpectedly matched remote job');
    console.log(`✅ Filter workArrangement="on-site": Correctly excluded (${filterOnSiteRes.data.count} result(s))`);

    // Filter by employmentType = full-time
    const filterFullTimeRes = await request(`/api/jobs?employmentType=full-time`);
    const foundFullTime = filterFullTimeRes.data.jobs?.some((j: any) => j.id === createdJobId);
    if (!foundFullTime) throw new Error('Filter employmentType=full-time failed');
    console.log(`✅ Filter employmentType="full-time": Verified (${filterFullTimeRes.data.count} result(s))`);

    // Filter by experienceLevel = Senior
    const filterSeniorRes = await request(`/api/jobs?experienceLevel=Senior`);
    const foundSenior = filterSeniorRes.data.jobs?.some((j: any) => j.id === createdJobId);
    if (!foundSenior) throw new Error('Filter experienceLevel=Senior failed');
    console.log(`✅ Filter experienceLevel="Senior": Verified (${filterSeniorRes.data.count} result(s))`);

    // 7. Dynamic Filter Options via GET /api/jobs?options=true
    console.log('\n7️⃣ Testing dynamic filter options via GET /api/jobs?options=true...');
    const optionsRes = await request(`/api/jobs?options=true`);
    if (!optionsRes.ok || !optionsRes.data.options) {
      throw new Error(`Failed to fetch options: ${JSON.stringify(optionsRes.data)}`);
    }
    const options = optionsRes.data.options;
    if (!options.companies.includes('NeuroTech Labs')) {
      throw new Error('Distinct companies did not contain "NeuroTech Labs"');
    }
    console.log(`✅ Filter options retrieved successfully:`);
    console.log(`   Companies: ${options.companies.join(', ')}`);
    console.log(`   Work Arrangements: ${options.workArrangements.join(', ')}`);
    console.log(`   Employment Types: ${options.employmentTypes.join(', ')}`);
    console.log(`   Seniority Levels: ${options.experienceLevels.join(', ')}`);

    // 8. Test /jobs server-rendered UI route
    console.log('\n8️⃣ Testing HTML page render for GET /jobs...');
    const pageRes = await fetch(`${BASE_URL}/jobs`);
    if (!pageRes.ok) {
      throw new Error(`GET /jobs returned status ${pageRes.status}`);
    }
    const htmlText = await pageRes.text();
    if (!htmlText.includes('Find Jobs') || !htmlText.includes('Discovered Opportunities')) {
      throw new Error('GET /jobs HTML does not contain expected header titles');
    }
    console.log(`✅ /jobs route returned HTTP 200 with complete HTML markup (${htmlText.length} bytes)`);

    // 9. Job Deletion via DELETE /api/jobs/[id]
    console.log(`\n9️⃣ Testing deletion via DELETE /api/jobs/${createdJobId}...`);
    const deleteRes = await request(`/api/jobs/${createdJobId}`, {
      method: 'DELETE',
    });
    if (!deleteRes.ok || !deleteRes.data.success) {
      throw new Error(`Failed to delete job: ${JSON.stringify(deleteRes.data)}`);
    }
    console.log(`✅ DELETE /api/jobs/${createdJobId} succeeded`);

    // Verify it is no longer retrievable (404)
    const checkDeletedRes = await request(`/api/jobs/${createdJobId}`);
    if (checkDeletedRes.status !== 404) {
      throw new Error(`Expected 404 after deletion, got ${checkDeletedRes.status}`);
    }
    console.log(`✅ Verified job is completely removed (GET returned 404 Not Found)`);
    createdJobId = null; // cleanup complete

    console.log('\n🎉 ALL FIND JOBS & MANUAL ENTRY END-TO-END TESTS PASSED SUCCESSFULLY!\n');
  } catch (error) {
    console.error('\n❌ Test Failure:', error);
    // Cleanup if test aborted mid-way
    if (createdJobId) {
      console.log(`Cleaning up remaining test job ${createdJobId}...`);
      await request(`/api/jobs/${createdJobId}`, { method: 'DELETE' }).catch(() => {});
    }
    process.exit(1);
  }
}

runFindJobsLiveTests();
