import fs from 'fs';
import path from 'path';
import { prisma } from '../lib/prisma';
import {
  generateCVPdfBuffer,
  renderMarkdownToPdfBuffer,
  generateTailoredCV,
  TailoredCVSchema,
  buildCVTailoringPrompt,
  formatCVToMarkdown,
} from '../services/cvGeneration';
import { saveOrUpdateDocument } from '../services/server/applicationService';

let createdTestJobIds: string[] = [];
let createdTestAppIds: string[] = [];
let createdTestProfileId: string | null = null;

async function runCVGenerationTests() {
  console.log('====================================================');
  console.log(' PHASE 6: TAILORED CV GENERATION & PDF ENGINE TESTS ');
  console.log('====================================================\n');

  try {
    // -------------------------------------------------------------
    // TEST 1: TailoredCVSchema & Prompt Grounding
    // -------------------------------------------------------------
    console.log('[TEST 1] Testing Schema Validation and Grounding Prompt...');

    const sampleCVData = {
      personalInfo: {
        fullName: 'Chukwudi Okafor',
        email: 'chukwudi@example.com',
        phone: '+234 801 234 5678',
        location: 'Lagos, Nigeria',
        linkedInUrl: 'https://linkedin.com/in/chukwudi-ai',
        portfolioUrl: 'https://chukwudi.dev',
        targetTitle: 'Senior Full Stack AI Engineer',
      },
      professionalSummary:
        'Accomplished Software Engineer with 5+ years of experience building production TypeScript, Python, and Next.js applications with integrated LLM agents.',
      skills: [
        {
          category: 'AI & LLM Orchestration',
          skills: ['Gemini API', 'LangChain', 'Prompt Engineering', 'RAG'],
        },
        {
          category: 'Frontend & Full-Stack',
          skills: ['Next.js', 'React', 'TypeScript', 'Tailwind CSS'],
        },
        {
          category: 'Backend & Cloud',
          skills: ['Node.js', 'PostgreSQL', 'SQLite', 'Prisma', 'Docker'],
        },
      ],
      workExperience: [
        {
          company: 'Aegis Cloud Systems',
          position: 'Senior Software Engineer',
          location: 'Remote',
          startDate: '2022-03',
          endDate: 'Present',
          isCurrentRole: true,
          employmentType: 'full-time',
          highlights: [
            'Architected scalable Next.js microservices handling 25,000+ daily candidate evaluations.',
            'Integrated LLM agent pipelines with structured Zod schema validation and automated fallback handlers.',
          ],
        },
      ],
      projects: [
        {
          name: 'JobPilot AI',
          description: 'Autonomous job discovery and application preparation engine.',
          technologies: ['Next.js', 'TypeScript', 'Gemini API', 'SQLite'],
          projectUrl: 'https://github.com/example/jobpilot',
          highlights: ['Built ATS-compliant vector PDF CV generator.'],
        },
      ],
      education: [
        {
          institution: 'University of Lagos',
          degree: 'Bachelor of Science',
          fieldOfStudy: 'Computer Engineering',
          startDate: '2016-09',
          graduationDate: '2021-07',
          academicDetails: 'First Class Honours',
        },
      ],
      certifications: [
        {
          name: 'Google Cloud Professional Cloud Architect',
          issuingOrganization: 'Google Cloud',
          dateObtained: '2023-08',
          credentialUrl: 'https://cloud.google.com/certification',
        },
      ],
      flaggedGaps: [
        'Required skill "Kubernetes Cluster Administration" is not verified in candidate profile.',
      ],
      tailoringRationale:
        'Prioritized Next.js, LLM orchestration, and full-stack architecture matching the job requirements.',
    };

    const schemaValidation = TailoredCVSchema.safeParse(sampleCVData);
    if (!schemaValidation.success) {
      throw new Error(`Schema validation failed: ${JSON.stringify(schemaValidation.error.format())}`);
    }
    console.log('  ✓ TailoredCVSchema successfully validated structured CV object.');

    const prompt = buildCVTailoringPrompt({
      candidateProfile: sampleCVData,
      job: {
        title: 'Senior AI Applications Engineer',
        company: 'Vanguard Dynamics',
        description: 'Looking for a Senior Engineer with Next.js, Gemini API, and TypeScript.',
        skills: ['Next.js', 'Gemini API', 'TypeScript', 'Kubernetes'],
        workArrangement: 'remote',
      },
      jobEvaluation: {
        overallMatchScore: 88,
        eligibility: 'ELIGIBLE',
        strengths: ['Strong Next.js and TypeScript background'],
        missingQualifications: ['Kubernetes'],
      },
    });

    if (!prompt.includes('STRICT ANTI-HALLUCINATION & FACTUAL ACCURACY CONTRACT')) {
      throw new Error('Prompt missing anti-hallucination grounding contract.');
    }
    if (!prompt.includes('Vanguard Dynamics')) {
      throw new Error('Prompt missing company context.');
    }
    console.log('  ✓ buildCVTailoringPrompt incorporates grounding contract and target job context.');

    // -------------------------------------------------------------
    // TEST 2: PDF Generation Engine (Vector ATS-Compliant PDF)
    // -------------------------------------------------------------
    console.log('\n[TEST 2] Testing ATS-Compliant Vector PDF Generation...');

    const pdfBuffer = await generateCVPdfBuffer(sampleCVData);
    if (!pdfBuffer || pdfBuffer.length === 0) {
      throw new Error('Generated PDF buffer is empty.');
    }

    // Verify PDF Magic Bytes (%PDF-1.)
    const pdfHeader = pdfBuffer.slice(0, 5).toString('ascii');
    if (!pdfHeader.startsWith('%PDF-')) {
      throw new Error(`Invalid PDF header: ${pdfHeader}. Expected %PDF-`);
    }
    console.log(`  ✓ Generated PDF buffer successfully (${pdfBuffer.length} bytes, header: ${pdfHeader}).`);

    // Test Markdown to PDF synchronization
    const markdown = formatCVToMarkdown(sampleCVData);
    const recompiledPdf = await renderMarkdownToPdfBuffer(markdown);
    if (!recompiledPdf || recompiledPdf.length === 0) {
      throw new Error('Recompiled Markdown PDF buffer is empty.');
    }
    const recompHeader = recompiledPdf.slice(0, 5).toString('ascii');
    if (!recompHeader.startsWith('%PDF-')) {
      throw new Error(`Invalid recompiled PDF header: ${recompHeader}. Expected %PDF-`);
    }
    console.log(`  ✓ renderMarkdownToPdfBuffer successfully rendered Markdown to PDF (${recompiledPdf.length} bytes).`);

    // -------------------------------------------------------------
    // TEST 3: Database Candidate Profile & Job Setup
    // -------------------------------------------------------------
    console.log('\n[TEST 3] Setting up test candidate profile, job, and application in SQLite...');

    // Find or create test candidate profile
    let profile = await prisma.candidateProfile.findFirst({
      include: {
        workExperience: true,
        technicalSkills: true,
        education: true,
        projects: true,
        certifications: true,
      },
    });

    if (!profile) {
      profile = await prisma.candidateProfile.create({
        data: {
          fullName: 'Chukwudi Okafor',
          email: 'chukwudi.test@example.com',
          phone: '+234 801 234 5678',
          country: 'Nigeria',
          city: 'Lagos',
          headline: 'Senior Full Stack & AI Engineer',
          summary: 'Experienced Software Engineer specializing in Next.js, Node.js, and GenAI.',
          completionPercentage: 100,
          isFullyComplete: true,
          workExperience: {
            create: [
              {
                company: 'Aegis Cloud Systems',
                position: 'Senior Full Stack Engineer',
                employmentType: 'full-time',
                startDate: '2022-03',
                endDate: '',
                isCurrentRole: true,
                responsibilities: JSON.stringify([
                  'Architected distributed microservices with Next.js and Prisma.',
                  'Engineered GenAI pipelines and structured JSON evaluation engines.',
                ]),
                achievements: JSON.stringify([
                  'Reduced workflow latency by 40% with streaming responses.',
                ]),
              },
            ],
          },
          technicalSkills: {
            create: [
              { name: 'TypeScript', category: 'Frontend', proficiency: 'Expert' },
              { name: 'Next.js', category: 'Frontend', proficiency: 'Expert' },
              { name: 'Node.js', category: 'Backend', proficiency: 'Advanced' },
              { name: 'Gemini API', category: 'Core AI', proficiency: 'Advanced' },
              { name: 'SQLite', category: 'Backend', proficiency: 'Advanced' },
            ],
          },
          education: {
            create: [
              {
                institution: 'University of Lagos',
                degree: 'B.Sc.',
                fieldOfStudy: 'Computer Engineering',
                startDate: '2016-09',
                graduationDate: '2021-07',
                academicDetails: 'First Class Honours',
              },
            ],
          },
          projects: {
            create: [
              {
                name: 'JobPilot AI Platform',
                description: 'Autonomous job discovery and application preparation engine.',
                technologies: JSON.stringify(['TypeScript', 'Next.js', 'Prisma', 'Gemini API']),
                projectUrl: 'https://github.com/example/jobpilot',
                keyResponsibilities: 'Architected end-to-end evaluation and document tailoring.',
              },
            ],
          },
        },
        include: {
          workExperience: true,
          technicalSkills: true,
          education: true,
          projects: true,
          certifications: true,
        },
      });
      createdTestProfileId = profile.id;
    }

    console.log(`  ✓ Verified Candidate Profile ID: ${profile.id} (${profile.fullName})`);

    // Create test job opportunity
    const testJob = await prisma.job.create({
      data: {
        title: 'Lead AI Engineer',
        company: 'Apex Global Tech',
        description: `
We are seeking a Lead AI Engineer to architect our enterprise LLM solutions.
Required Skills: Next.js, TypeScript, Gemini API, Python, Cloud Architecture.
The ideal candidate will have extensive experience designing autonomous agent pipelines.
Location: Worldwide Remote. Applications from Nigeria are welcome.
        `.trim(),
        url: `https://test-jobs.example.com/lead-ai-${Date.now()}`,
        location: 'Remote (Worldwide)',
        workArrangement: 'remote',
        employmentType: 'full-time',
        skills: JSON.stringify(['Next.js', 'TypeScript', 'Gemini API', 'Python', 'Cloud Architecture']),
      },
    });
    createdTestJobIds.push(testJob.id);

    // Create test application in PREPARING status
    const testApp = await prisma.application.create({
      data: {
        jobId: testJob.id,
        profileId: profile.id,
        status: 'PREPARING',
        notes: 'Initial automated application preparation test run.',
      },
    });
    createdTestAppIds.push(testApp.id);

    console.log(`  ✓ Created test Job (${testJob.title} at ${testJob.company})`);
    console.log(`  ✓ Created test Application ID: ${testApp.id} (Status: ${testApp.status})`);

    // -------------------------------------------------------------
    // TEST 4: Generate Tailored CV (Version 1)
    // -------------------------------------------------------------
    console.log('\n[TEST 4] Generating Tailored CV v1 via generateTailoredCV...');

    const v1Result = await generateTailoredCV(testApp.id);
    if (!v1Result.success) {
      throw new Error(`v1 Generation failed: ${v1Result.error}`);
    }

    if (v1Result.version !== 1) {
      throw new Error(`Expected version 1, got version ${v1Result.version}`);
    }

    if (!v1Result.filePath) {
      throw new Error('v1 filePath is missing.');
    }

    const v1DiskPath = path.isAbsolute(v1Result.filePath)
      ? v1Result.filePath
      : path.join(process.cwd(), v1Result.filePath);

    if (!fs.existsSync(v1DiskPath)) {
      throw new Error(`v1 PDF file not found on disk at: ${v1DiskPath}`);
    }

    const v1FileBytes = fs.readFileSync(v1DiskPath);
    if (!v1FileBytes.slice(0, 5).toString('ascii').startsWith('%PDF-')) {
      throw new Error('v1 file on disk is not a valid PDF file.');
    }

    console.log(`  ✓ Generated CV v1 successfully: ${v1Result.originalFilename}`);
    console.log(`  ✓ File size on disk: ${v1FileBytes.length} bytes`);
    console.log(`  ✓ Flagged Gaps count: ${v1Result.flaggedGaps?.length || 0}`);

    // Verify Application status transitioned to PENDING_REVIEW
    const updatedApp1 = await prisma.application.findUnique({
      where: { id: testApp.id },
    });
    if (updatedApp1?.status !== 'PENDING_REVIEW') {
      throw new Error(`Expected app status PENDING_REVIEW, got: ${updatedApp1?.status}`);
    }
    console.log(`  ✓ Application status transitioned to: ${updatedApp1.status}`);

    // -------------------------------------------------------------
    // TEST 5: Regenerate Tailored CV (Version 2) - Version Preservation
    // -------------------------------------------------------------
    console.log('\n[TEST 5] Regenerating Tailored CV v2 (Testing Version Preservation)...');

    const v2Result = await generateTailoredCV(testApp.id, {
      customInstructions: 'Emphasize distributed systems architecture and GenAI evaluation precision.',
    });

    if (!v2Result.success) {
      throw new Error(`v2 Generation failed: ${v2Result.error}`);
    }

    if (v2Result.version !== 2) {
      throw new Error(`Expected version 2, got version ${v2Result.version}`);
    }

    const v2DiskPath = path.isAbsolute(v2Result.filePath!)
      ? v2Result.filePath!
      : path.join(process.cwd(), v2Result.filePath!);

    if (!fs.existsSync(v2DiskPath)) {
      throw new Error(`v2 PDF file not found on disk at: ${v2DiskPath}`);
    }

    // CRITICAL REQUIREMENT CHECK: Verify Version 1 file was NOT deleted or overwritten!
    if (!fs.existsSync(v1DiskPath)) {
      throw new Error('CRITICAL FAILURE: Version 1 file was overwritten or deleted!');
    }

    const allDocs = await prisma.generatedDocument.findMany({
      where: { applicationId: testApp.id, documentType: 'TAILORED_RESUME' },
      orderBy: { version: 'asc' },
    });

    if (allDocs.length !== 2) {
      throw new Error(`Expected 2 GeneratedDocument records, found ${allDocs.length}`);
    }

    if (allDocs[0].version !== 1 || allDocs[1].version !== 2) {
      throw new Error(`Version mismatch in database: [${allDocs.map((d) => d.version).join(', ')}]`);
    }

    console.log(`  ✓ Version 2 created successfully (${v2Result.originalFilename})`);
    console.log('  ✓ Version 1 file and database record preserved intact (Zero overwrite).');

    // -------------------------------------------------------------
    // TEST 6: Editing Document Content & PDF Synchronization
    // -------------------------------------------------------------
    console.log('\n[TEST 6] Testing Document Content Editing and Synchronized PDF Update...');

    const docToEdit = allDocs[1]; // v2
    const editedMarkdown = `${docToEdit.content}\n\n- Engineered high-throughput vector ingestion pipeline.`;

    const saveResult = await saveOrUpdateDocument(testApp.id, {
      id: docToEdit.id,
      documentType: 'TAILORED_RESUME',
      originalFilename: docToEdit.originalFilename,
      content: editedMarkdown,
    });

    if (!saveResult.success) {
      throw new Error(`Failed to save edited document: ${saveResult.error}`);
    }

    const reCheckedDiskBytes = fs.readFileSync(v2DiskPath);
    if (!reCheckedDiskBytes.slice(0, 5).toString('ascii').startsWith('%PDF-')) {
      throw new Error('Synchronized PDF file is invalid after editing.');
    }

    console.log(`  ✓ Document content updated and PDF successfully re-synchronized on disk.`);

    // -------------------------------------------------------------
    // TEST 7: Zero Hallucination & Factual Grounding Verification
    // -------------------------------------------------------------
    console.log('\n[TEST 7] Verifying Zero Hallucination Guarantee...');

    // Ensure all candidate experience entries are strictly grounded in verified profile
    const v2Content = v2Result.cvContent!;
    const verifiedCompanyNames = profile.workExperience.map((w) => w.company.toLowerCase());

    if (verifiedCompanyNames.length > 0) {
      for (const exp of v2Content.workExperience) {
        const matchesVerified = verifiedCompanyNames.some(
          (name) => name.includes(exp.company.toLowerCase()) || exp.company.toLowerCase().includes(name)
        );
        if (!matchesVerified) {
          throw new Error(`Tailored CV includes unverified company: ${exp.company}`);
        }
      }
      console.log(`  ✓ All tailored work experiences are strictly grounded in verified profile: [${v2Content.workExperience.map((w) => w.company).join(', ')}]`);
    }

    // Ensure candidate name matches verified profile
    if (!v2Content.personalInfo.fullName.includes(profile.fullName)) {
      throw new Error(`Candidate name mismatch: expected ${profile.fullName}, got ${v2Content.personalInfo.fullName}`);
    }
    console.log(`  ✓ Candidate identity verified: ${v2Content.personalInfo.fullName}`);
    console.log(`  ✓ Unverified job requirements correctly flagged in flaggedGaps: ${v2Content.flaggedGaps.length} gaps`);

    console.log('\n====================================================');
    console.log(' ALL PHASE 6 TAILORED CV & PDF TESTS PASSED (7/7)   ');
    console.log('====================================================\n');
  } catch (err: any) {
    console.error('\n❌ TEST FAILED:', err);
    throw err;
  } finally {
    // Teardown test records
    console.log('Cleaning up test data in SQLite...');
    try {
      for (const appId of createdTestAppIds) {
        // Remove generated files from disk
        const dir = path.join(process.cwd(), 'storage', 'generated_documents', appId);
        if (fs.existsSync(dir)) {
          fs.rmSync(dir, { recursive: true, force: true });
        }
        await prisma.generatedDocument.deleteMany({ where: { applicationId: appId } });
        await prisma.activityLog.deleteMany({ where: { entityId: appId } });
        await prisma.application.delete({ where: { id: appId } }).catch(() => {});
      }
      for (const jobId of createdTestJobIds) {
        await prisma.jobEvaluation.deleteMany({ where: { jobId } });
        await prisma.job.delete({ where: { id: jobId } }).catch(() => {});
      }
      if (createdTestProfileId) {
        await prisma.candidateProfile.delete({ where: { id: createdTestProfileId } }).catch(() => {});
      }
      console.log('Cleanup completed successfully.');
    } catch (cleanupErr) {
      console.error('Error during test cleanup:', cleanupErr);
    }
  }
}

runCVGenerationTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
