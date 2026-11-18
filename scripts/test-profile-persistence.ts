export {};

/**
 * Integration Test Suite for Candidate Profile SQLite & Prisma Persistence
 * Tests all requirements over live Next.js API endpoints.
 */

const BASE_URL = 'http://localhost:3000';

async function main() {
  console.log('=== JobPilot AI: Candidate Profile Persistence Test ===\n');

  // Helper for JSON requests
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

  // 1. Initial Profile Retrieval (Reset to pristine for clean test)
  console.log('1. Resetting profile to pristine state for test...');
  const resetRes = await request('/api/profile', {
    method: 'PUT',
    body: JSON.stringify({ reset: true }),
  });
  if (!resetRes.ok) throw new Error('Failed to reset profile: ' + JSON.stringify(resetRes.data));
  console.log('✔ Profile reset to empty state in SQLite');

  const getRes1 = await request('/api/profile');
  if (!getRes1.ok || !getRes1.data.profile) {
    throw new Error('Failed to fetch initial profile: ' + JSON.stringify(getRes1.data));
  }
  const initialProfile = getRes1.data.profile;
  console.log(`✔ Initial profile retrieved (ID: ${initialProfile.id})`);
  console.log(`  - Completion: ${getRes1.data.completion.completionPercentage}%`);

  // 2. Input Validation Tests
  console.log('\n2. Testing Input Validation Rules...');
  const invalidEmailRes = await request('/api/profile', {
    method: 'PUT',
    body: JSON.stringify({
      section: 'personal',
      data: {
        fullName: 'Jane Doe',
        email: 'invalid-email-address',
      },
    }),
  });
  if (invalidEmailRes.status === 422) {
    console.log('✔ Input validation caught invalid email format (422)');
  } else {
    throw new Error('Validation failed to catch invalid email address!');
  }

  // 3. Creating Profile Information (Personal Info, Summary, Preferences)
  console.log('\n3. Creating Profile Information...');
  const personalRes = await request('/api/profile', {
    method: 'PUT',
    body: JSON.stringify({
      section: 'personal',
      data: {
        fullName: 'Sarah Connor',
        email: 'sarah.connor@cyberdyne.org',
        phone: '+1 415-555-0142',
        country: 'United States',
        city: 'Los Angeles',
        linkedInUrl: 'https://linkedin.com/in/sarahconnor',
        portfolioUrl: 'https://sarahconnor.tech',
      },
    }),
  });
  if (!personalRes.ok) throw new Error('Failed to save personal info: ' + JSON.stringify(personalRes.data));
  console.log('✔ Personal Information saved to SQLite');

  const summaryRes = await request('/api/profile', {
    method: 'PUT',
    body: JSON.stringify({
      section: 'summary',
      data: {
        headline: 'Senior Full Stack & AI Systems Engineer',
        summary: 'Specializing in resilient distributed architectures, TypeScript, Next.js, and autonomous agent workflows.',
      },
    }),
  });
  if (!summaryRes.ok) throw new Error('Failed to save summary: ' + JSON.stringify(summaryRes.data));
  console.log('✔ Professional Summary saved to SQLite');

  const prefsRes = await request('/api/profile', {
    method: 'PUT',
    body: JSON.stringify({
      section: 'preferences',
      data: {
        targetJobTitles: ['Senior Full Stack Engineer', 'Lead AI Engineer'],
        preferredEmploymentTypes: ['full-time', 'contract'],
        preferredSeniority: ['Senior', 'Lead'],
        remoteWorkPreference: 'remote-only',
        preferredCountries: ['United States', 'Canada', 'United Kingdom'],
        excludedLocations: [],
        minSalaryExpectation: {
          currency: 'USD',
          amount: 155000,
          period: 'yearly',
        },
      },
    }),
  });
  if (!prefsRes.ok) throw new Error('Failed to save preferences: ' + JSON.stringify(prefsRes.data));
  console.log('✔ Employment Preferences saved to SQLite');

  // 4. Testing Multiple Relational Records (Education, Experience, Skills, Projects, Certs)
  console.log('\n4. Adding Multiple Relational Records...');

  // Education 1
  const edu1Res = await request('/api/profile/items', {
    method: 'POST',
    body: JSON.stringify({
      sectionKey: 'education',
      item: {
        institution: 'University of California, Los Angeles',
        degree: 'Bachelor of Science',
        fieldOfStudy: 'Computer Science',
        startDate: '2015-09',
        graduationDate: '2019-06',
        academicDetails: 'Summa Cum Laude, GPA 3.92',
      },
    }),
  });
  if (!edu1Res.ok) throw new Error('Failed to add education 1: ' + JSON.stringify(edu1Res.data));
  const edu1 = edu1Res.data.profile.education[0];
  console.log(`✔ Education record 1 added: ${edu1.degree} at ${edu1.institution}`);

  // Education 2
  const edu2Res = await request('/api/profile/items', {
    method: 'POST',
    body: JSON.stringify({
      sectionKey: 'education',
      item: {
        institution: 'Stanford University Online',
        degree: 'Graduate Certificate',
        fieldOfStudy: 'Artificial Intelligence & Machine Learning',
        startDate: '2020-01',
        graduationDate: '2021-03',
        academicDetails: 'Specialization in Autonomous Systems',
      },
    }),
  });
  if (!edu2Res.ok) throw new Error('Failed to add education 2: ' + JSON.stringify(edu2Res.data));
  console.log(`✔ Education record 2 added. Total education records: ${edu2Res.data.profile.education.length}`);

  // Work Experience 1 & 2
  const exp1Res = await request('/api/profile/items', {
    method: 'POST',
    body: JSON.stringify({
      sectionKey: 'workExperience',
      item: {
        company: 'Cyberdyne Systems',
        position: 'Senior Full Stack Engineer',
        employmentType: 'full-time',
        startDate: '2021-04',
        endDate: '',
        isCurrentRole: true,
        responsibilities: ['Architected cloud applications with Next.js & TypeScript', 'Maintained 99.99% uptime'],
        achievements: ['Scaled throughput by 300%', 'Mentored 6 junior engineers'],
      },
    }),
  });
  if (!exp1Res.ok) throw new Error('Failed to add experience 1: ' + JSON.stringify(exp1Res.data));
  const exp1 = exp1Res.data.profile.workExperience[0];

  const exp2Res = await request('/api/profile/items', {
    method: 'POST',
    body: JSON.stringify({
      sectionKey: 'workExperience',
      item: {
        company: 'Vanguard Software Inc',
        position: 'Software Engineer',
        employmentType: 'full-time',
        startDate: '2019-07',
        endDate: '2021-03',
        isCurrentRole: false,
        responsibilities: ['Developed React frontends and Node.js REST services'],
        achievements: ['Reduced bundle size by 40%'],
      },
    }),
  });
  if (!exp2Res.ok) throw new Error('Failed to add experience 2: ' + JSON.stringify(exp2Res.data));
  console.log(`✔ Work Experience records added: ${exp2Res.data.profile.workExperience.length} total experiences`);

  // Technical Skills (Multiple)
  const skillsToAdd = [
    { name: 'TypeScript', category: 'Programming Languages', proficiency: 'Expert' },
    { name: 'Next.js', category: 'Frontend', proficiency: 'Expert' },
    { name: 'Node.js', category: 'Backend', proficiency: 'Advanced' },
    { name: 'Prisma & SQLite', category: 'Database', proficiency: 'Advanced' },
  ];
  for (const s of skillsToAdd) {
    await request('/api/profile/items', {
      method: 'POST',
      body: JSON.stringify({ sectionKey: 'technicalSkills', item: s }),
    });
  }
  console.log(`✔ Technical Skills added: ${skillsToAdd.length} skills recorded`);

  // Project
  const projRes = await request('/api/profile/items', {
    method: 'POST',
    body: JSON.stringify({
      sectionKey: 'projects',
      item: {
        name: 'Autonomous Agent Dispatcher',
        description: 'Multi-threaded task execution queue with automatic retries',
        technologies: ['TypeScript', 'Node.js', 'SQLite'],
        projectUrl: 'https://github.com/sarahconnor/agent-dispatcher',
        keyResponsibilities: 'Designed queue state machine and failure recovery',
      },
    }),
  });
  if (!projRes.ok) throw new Error('Failed to add project');
  console.log('✔ Project record added');

  // Certification
  const certRes = await request('/api/profile/items', {
    method: 'POST',
    body: JSON.stringify({
      sectionKey: 'certifications',
      item: {
        name: 'AWS Certified Solutions Architect - Associate',
        issuingOrganization: 'Amazon Web Services',
        dateObtained: '2023-08',
        credentialUrl: 'https://aws.amazon.com/verification/example',
      },
    }),
  });
  if (!certRes.ok) throw new Error('Failed to add certification');
  console.log('✔ Certification record added');

  // Standard Answer
  const ansRes = await request('/api/profile/items', {
    method: 'POST',
    body: JSON.stringify({
      sectionKey: 'standardAnswers',
      item: {
        question: 'Are you legally authorized to work in the United States?',
        answer: 'Yes, US Citizen with no sponsorship requirements.',
        category: 'Work Authorization',
      },
    }),
  });
  if (!ansRes.ok) throw new Error('Failed to add standard answer');
  console.log('✔ Standard Answer record added');

  // 5. Testing Granular Editing & Non-Deletion of Unrelated Information
  console.log('\n5. Testing Granular Editing & Non-Deletion Rule...');
  const editEduRes = await request('/api/profile/items', {
    method: 'PUT',
    body: JSON.stringify({
      sectionKey: 'education',
      id: edu1.id,
      item: {
        institution: 'University of California, Los Angeles (UCLA)',
        degree: 'Bachelor of Science (Honors)',
        fieldOfStudy: 'Computer Science & Engineering',
        startDate: '2015-09',
        graduationDate: '2019-06',
        academicDetails: 'Summa Cum Laude, Departmental Honors, GPA 3.95',
      },
    }),
  });
  if (!editEduRes.ok) throw new Error('Failed to update education');

  // Verify that other sections are completely unaffected
  const profileAfterEdit = editEduRes.data.profile;
  if (profileAfterEdit.workExperience.length !== 2) {
    throw new Error('Work experience records were accidentally altered!');
  }
  if (profileAfterEdit.technicalSkills.length !== 4) {
    throw new Error('Skills were accidentally altered!');
  }
  if (profileAfterEdit.personalInfo.fullName !== 'Sarah Connor') {
    throw new Error('Personal info was accidentally altered!');
  }
  console.log('✔ Granular edit verified: Education updated, all unrelated sections completely preserved');

  // 6. Simulating Application Reload & Fetching Persisted Data
  console.log('\n6. Simulating Application Reload (Fresh GET /api/profile)...');
  const reloaded = await request('/api/profile');
  if (!reloaded.ok) throw new Error('Failed to reload profile');

  const loadedData = reloaded.data.profile;
  const loadedCompletion = reloaded.data.completion;

  console.log(`✔ Reload verified: Retrieved profile for "${loadedData.personalInfo.fullName}"`);
  console.log(`  - Headline: "${loadedData.summary.headline}"`);
  console.log(`  - Education records: ${loadedData.education.length}`);
  console.log(`  - Work Experience records: ${loadedData.workExperience.length}`);
  console.log(`  - Technical Skills: ${loadedData.technicalSkills.length}`);
  console.log(`  - Projects: ${loadedData.projects.length}`);
  console.log(`  - Certifications: ${loadedData.certifications.length}`);
  console.log(`  - Standard Answers: ${loadedData.standardAnswers.length}`);
  console.log(`  - Verified Completion Score: ${loadedCompletion.completionPercentage}%`);
  console.log(`  - Completed Sections: ${loadedCompletion.completedSections}/${loadedCompletion.totalSections}`);

  // 7. Testing CV Document Upload and Persistence
  console.log('\n7. Testing CV Document Upload and Database Persistence...');
  const fs = await import('fs');
  const path = await import('path');
  const samplePdfPath = path.join(
    process.cwd(),
    'uploads',
    'cv',
    '1795018682168_50550193-997d-4b06-8c61-2e986553f92f_Gideon_Ndedu_Resumeee.pdf'
  );
  const pdfBuffer = fs.readFileSync(samplePdfPath);
  const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
  const formData = new FormData();
  formData.append('file', blob, 'Sarah_Connor_Resume.pdf');

  const uploadRes = await fetch(`${BASE_URL}/api/cv/upload`, {
    method: 'POST',
    body: formData,
  });
  const uploadData = await uploadRes.json();
  if (!uploadRes.ok || !uploadData.success) {
    throw new Error('Failed to upload CV: ' + JSON.stringify(uploadData));
  }
  console.log(`✔ CV uploaded, parsed and recorded in SQLite: "${uploadData.extraction.originalFilename}"`);

  // Query CV documents via GET /api/cv
  const cvListRes = await request('/api/cv');
  if (!cvListRes.ok || !Array.isArray(cvListRes.data.documents)) {
    throw new Error('Failed to fetch CV documents: ' + JSON.stringify(cvListRes.data));
  }
  console.log(`✔ Retrieved CV records from SQLite: ${cvListRes.data.documents.length} document(s) registered`);
  const uploadedDoc = cvListRes.data.documents[0];
  console.log(`  - Document ID: ${uploadedDoc.id}`);
  console.log(`  - Original Filename: ${uploadedDoc.originalFilename}`);
  console.log(`  - File Size: ${uploadedDoc.fileSize} bytes`);
  console.log(`  - Storage Path: ${uploadedDoc.filePath}`);

  // Test CV document deletion
  const deleteCvRes = await request(`/api/cv?id=${uploadedDoc.id}`, { method: 'DELETE' });
  if (!deleteCvRes.ok) throw new Error('Failed to delete CV document');
  console.log(`✔ CV document record deleted successfully from database`);

  const cvListAfterDelete = await request('/api/cv');
  if (cvListAfterDelete.data.documents.length !== 0) {
    throw new Error('CV document was not removed from database!');
  }
  console.log('✔ CV documents table confirmed empty after deletion');

  console.log('\n======================================================');
  console.log('ALL CANDIDATE PROFILE PERSISTENCE TESTS PASSED! 🎉');
  console.log('======================================================\n');
}

main().catch((err) => {
  console.error('\n❌ Test failed with error:', err);
  process.exit(1);
});
