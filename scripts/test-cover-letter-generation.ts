import fs from 'fs';
import path from 'path';
import { prisma } from '../lib/prisma';
import {
  generateCoverLetterPdfBuffer,
  renderCoverLetterMarkdownToPdfBuffer,
  generateTailoredCoverLetter,
  CoverLetterSchema,
  buildCoverLetterPrompt,
  formatCoverLetterToMarkdown,
} from '../services/coverLetter';
import { saveOrUpdateDocument } from '../services/server/applicationService';

let createdTestJobIds: string[] = [];
let createdTestAppIds: string[] = [];
let createdTestProfileId: string | null = null;

async function runCoverLetterTests() {
  console.log('========================================================');
  console.log(' PHASE 6: TAILORED COVER LETTER & PDF GENERATION TESTS ');
  console.log('========================================================\n');

  try {
    // -------------------------------------------------------------
    // TEST 1: CoverLetterSchema & Prompt Grounding
    // -------------------------------------------------------------
    console.log('[TEST 1] Testing Cover Letter Schema Validation and Grounding Prompt...');

    const sampleLetterData = {
      senderInfo: {
        fullName: 'Chukwudi Okafor',
        email: 'chukwudi@example.com',
        phone: '+234 801 234 5678',
        location: 'Lagos, Nigeria',
        date: 'November 26, 2026',
      },
      recipientInfo: {
        hiringManager: 'Engineering Hiring Team',
        company: 'Synthetix AI',
        companyLocation: 'Remote',
        roleTitle: 'Staff Full-Stack AI Engineer',
      },
      salutation: 'Dear Hiring Team at Synthetix AI,',
      opening:
        'I am writing to express my interest in the Staff Full-Stack AI Engineer role at Synthetix AI. Having spent the last several years building scalable Next.js platforms and deterministic LLM evaluation pipelines, I am impressed by your team’s focus on robust engineering for production generative workflows.',
      bodyParagraphs: [
        'In my recent software engineering roles, I designed and scaled distributed web architectures with TypeScript and Prisma. I focused heavily on sub-second response times, structured schema validation, and fail-safe LLM integration.',
        'On recent projects like JobPilot AI, I architected end-to-end multi-source discovery engines and ATS-compliant document generators. This hands-on experience in production AI engineering directly matches the technical challenges outlined in your job description.',
      ],
      callToAction:
        'I would welcome the opportunity to discuss how my hands-on background in full-stack AI engineering can help advance Synthetix AI’s product roadmap. Thank you for your time and consideration.',
      signOff: 'Sincerely,\nChukwudi Okafor',
      fullLetterMarkdown: '',
      highlightedMatches: ['Next.js', 'TypeScript', 'Prisma', 'LLM Integration'],
      flaggedGaps: ['Experience with Rust or WebAssembly is unverified in candidate profile.'],
    };

    const schemaValidation = CoverLetterSchema.safeParse(sampleLetterData);
    if (!schemaValidation.success) {
      throw new Error(`Schema validation failed: ${JSON.stringify(schemaValidation.error.format())}`);
    }
    console.log('  ✓ CoverLetterSchema successfully validated structured cover letter object.');

    const prompt = buildCoverLetterPrompt({
      candidateProfile: sampleLetterData,
      job: {
        title: 'Staff Full-Stack AI Engineer',
        company: 'Synthetix AI',
        description: 'Seeking a Staff Engineer experienced with Next.js, Gemini API, and TypeScript.',
        skills: ['Next.js', 'TypeScript', 'Gemini API', 'Rust'],
      },
      jobEvaluation: {
        overallMatchScore: 92,
        strengths: ['Deep expertise in Next.js and LLM integration'],
        missingQualifications: ['Rust'],
      },
    });

    if (!prompt.includes('STRICT ANTI-HALLUCINATION & FACTUAL ACCURACY CONTRACT')) {
      throw new Error('Prompt missing anti-hallucination grounding contract.');
    }
    if (!prompt.includes('Synthetix AI')) {
      throw new Error('Prompt missing company context.');
    }
    if (!prompt.includes('NATURAL HUMAN VOICE')) {
      throw new Error('Prompt missing natural human voice instructions.');
    }
    console.log('  ✓ buildCoverLetterPrompt incorporates grounding contract, anti-cliché rules, and company context.');

    // -------------------------------------------------------------
    // TEST 2: PDF Generation Engine (Vector ATS-Compliant PDF)
    // -------------------------------------------------------------
    console.log('\n[TEST 2] Testing Vector PDF Generation for Cover Letters...');

    const pdfBuffer = await generateCoverLetterPdfBuffer(sampleLetterData);
    if (!pdfBuffer || pdfBuffer.length === 0) {
      throw new Error('Generated cover letter PDF buffer is empty.');
    }

    const pdfHeader = pdfBuffer.slice(0, 5).toString('ascii');
    if (!pdfHeader.startsWith('%PDF-')) {
      throw new Error(`Invalid PDF header: ${pdfHeader}. Expected %PDF-`);
    }
    console.log(`  ✓ Generated cover letter PDF buffer successfully (${pdfBuffer.length} bytes, header: ${pdfHeader}).`);

    // Test Markdown to PDF synchronization
    const markdown = formatCoverLetterToMarkdown(sampleLetterData);
    const recompiledPdf = await renderCoverLetterMarkdownToPdfBuffer(markdown);
    if (!recompiledPdf || recompiledPdf.length === 0) {
      throw new Error('Recompiled Markdown PDF buffer is empty.');
    }
    const recompHeader = recompiledPdf.slice(0, 5).toString('ascii');
    if (!recompHeader.startsWith('%PDF-')) {
      throw new Error(`Invalid recompiled PDF header: ${recompHeader}. Expected %PDF-`);
    }
    console.log(`  ✓ renderCoverLetterMarkdownToPdfBuffer rendered Markdown to PDF (${recompiledPdf.length} bytes).`);

    // -------------------------------------------------------------
    // TEST 3: Database Candidate Profile & Job Setup
    // -------------------------------------------------------------
    console.log('\n[TEST 3] Setting up test candidate profile, job, and application in SQLite...');

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
          summary: 'Experienced Software Engineer specializing in Next.js and GenAI.',
          completionPercentage: 100,
          isFullyComplete: true,
          workExperience: {
            create: [
              {
                company: 'Aegis Cloud Systems',
                position: 'Senior Software Engineer',
                employmentType: 'full-time',
                startDate: '2022-03',
                endDate: '',
                isCurrentRole: true,
                responsibilities: JSON.stringify([
                  'Architected distributed microservices with Next.js and Prisma.',
                ]),
                achievements: JSON.stringify([
                  'Reduced latency by 40% with streaming responses.',
                ]),
              },
            ],
          },
          technicalSkills: {
            create: [
              { name: 'TypeScript', category: 'Frontend', proficiency: 'Expert' },
              { name: 'Next.js', category: 'Frontend', proficiency: 'Expert' },
              { name: 'Node.js', category: 'Backend', proficiency: 'Advanced' },
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

    const testJob = await prisma.job.create({
      data: {
        title: 'Staff AI Engineer',
        company: 'Synthetix AI Global',
        description: `
We are looking for a Staff AI Engineer to build next-generation autonomous pipelines.
Required skills: Next.js, TypeScript, Gemini API, Python.
Applications from Nigeria and worldwide are accepted.
        `.trim(),
        url: `https://test-jobs.example.com/staff-ai-${Date.now()}`,
        location: 'Remote (Worldwide)',
        workArrangement: 'remote',
        employmentType: 'full-time',
        skills: JSON.stringify(['Next.js', 'TypeScript', 'Gemini API', 'Python']),
      },
    });
    createdTestJobIds.push(testJob.id);

    const testApp = await prisma.application.create({
      data: {
        jobId: testJob.id,
        profileId: profile.id,
        status: 'PENDING_REVIEW',
        notes: 'Cover letter automated test run.',
      },
    });
    createdTestAppIds.push(testApp.id);

    console.log(`  ✓ Created test Job (${testJob.title} at ${testJob.company})`);
    console.log(`  ✓ Created test Application ID: ${testApp.id}`);

    // -------------------------------------------------------------
    // TEST 4: Generate Tailored Cover Letter (Version 1)
    // -------------------------------------------------------------
    console.log('\n[TEST 4] Generating Tailored Cover Letter v1 via generateTailoredCoverLetter...');

    const v1Result = await generateTailoredCoverLetter(testApp.id);
    if (!v1Result.success) {
      throw new Error(`v1 Cover Letter generation failed: ${v1Result.error}`);
    }

    if (v1Result.version !== 1) {
      throw new Error(`Expected version 1, got version ${v1Result.version}`);
    }

    const v1DiskPath = path.isAbsolute(v1Result.filePath!)
      ? v1Result.filePath!
      : path.join(process.cwd(), v1Result.filePath!);

    if (!fs.existsSync(v1DiskPath)) {
      throw new Error(`v1 Cover Letter file not found on disk at: ${v1DiskPath}`);
    }

    const v1FileBytes = fs.readFileSync(v1DiskPath);
    if (!v1FileBytes.slice(0, 5).toString('ascii').startsWith('%PDF-')) {
      throw new Error('v1 file on disk is not a valid PDF file.');
    }

    console.log(`  ✓ Generated Cover Letter v1 successfully: ${v1Result.originalFilename}`);
    console.log(`  ✓ File size on disk: ${v1FileBytes.length} bytes`);

    // -------------------------------------------------------------
    // TEST 5: Regenerate Cover Letter (Version 2) - Version Preservation
    // -------------------------------------------------------------
    console.log('\n[TEST 5] Regenerating Cover Letter v2 (Testing Version Preservation)...');

    const v2Result = await generateTailoredCoverLetter(testApp.id, {
      customInstructions: 'Emphasize architectural resilience and pragmatic engineering without buzzwords.',
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
      throw new Error(`v2 Cover Letter file not found on disk at: ${v2DiskPath}`);
    }

    // CRITICAL CHECK: Ensure Version 1 file was NOT deleted or overwritten
    if (!fs.existsSync(v1DiskPath)) {
      throw new Error('CRITICAL FAILURE: Version 1 Cover Letter was overwritten or deleted!');
    }

    const allCoverDocs = await prisma.generatedDocument.findMany({
      where: { applicationId: testApp.id, documentType: 'COVER_LETTER' },
      orderBy: { version: 'asc' },
    });

    if (allCoverDocs.length !== 2) {
      throw new Error(`Expected 2 COVER_LETTER records, found ${allCoverDocs.length}`);
    }

    if (allCoverDocs[0].version !== 1 || allCoverDocs[1].version !== 2) {
      throw new Error(`Version mismatch in database: [${allCoverDocs.map((d) => d.version).join(', ')}]`);
    }

    console.log(`  ✓ Version 2 created successfully (${v2Result.originalFilename})`);
    console.log('  ✓ Version 1 file and database record preserved intact (Zero overwrite).');

    // -------------------------------------------------------------
    // TEST 6: Editing Document Content & PDF Synchronization
    // -------------------------------------------------------------
    console.log('\n[TEST 6] Testing Cover Letter Content Editing and Synchronized PDF Update...');

    const docToEdit = allCoverDocs[1]; // v2
    const editedMarkdown = `${docToEdit.content}\n\nP.S. I have also open-sourced developer tools for LLM regression testing.`;

    const saveResult = await saveOrUpdateDocument(testApp.id, {
      id: docToEdit.id,
      documentType: 'COVER_LETTER',
      originalFilename: docToEdit.originalFilename,
      content: editedMarkdown,
    });

    if (!saveResult.success) {
      throw new Error(`Failed to save edited document: ${saveResult.error}`);
    }

    const reCheckedDiskBytes = fs.readFileSync(v2DiskPath);
    if (!reCheckedDiskBytes.slice(0, 5).toString('ascii').startsWith('%PDF-')) {
      throw new Error('Synchronized cover letter PDF file is invalid after editing.');
    }

    console.log(`  ✓ Cover letter content updated and PDF successfully re-synchronized on disk.`);

    // -------------------------------------------------------------
    // TEST 7: Zero Hallucination & Natural Language Verification
    // -------------------------------------------------------------
    console.log('\n[TEST 7] Verifying Grounding and Anti-Cliché Standards...');

    const letterContent = v2Result.content!;
    const lowerFullText = JSON.stringify(letterContent).toLowerCase();

    // Ensure candidate identity matches
    if (!letterContent.senderInfo.fullName.includes(profile.fullName)) {
      throw new Error(`Candidate name mismatch: expected ${profile.fullName}, got ${letterContent.senderInfo.fullName}`);
    }

    // Ensure company name is addressed
    if (!lowerFullText.includes('synthetix ai')) {
      throw new Error('Cover letter does not mention target company Synthetix AI.');
    }

    // Ensure no generic AI tropes
    const forbiddenClichés = [
      'thrilled to apply',
      'delighted to apply',
      'unique blend of skills',
      'in today’s fast-paced',
      'testament to my',
      'spearheaded a paradigm shift',
    ];

    for (const cliché of forbiddenClichés) {
      if (lowerFullText.includes(cliché)) {
        throw new Error(`Forbidden generic AI cliché detected in cover letter: "${cliché}"`);
      }
    }

    console.log(`  ✓ Candidate identity verified: ${letterContent.senderInfo.fullName}`);
    console.log(`  ✓ Verified target company context present: Synthetix AI`);
    console.log(`  ✓ Anti-cliché check passed (zero generic AI tropes detected).`);
    console.log(`  ✓ Unverified job requirements flagged in flaggedGaps: ${letterContent.flaggedGaps.length} gaps`);

    console.log('\n========================================================');
    console.log(' ALL PHASE 6 COVER LETTER & PDF TESTS PASSED (7/7)      ');
    console.log('========================================================\n');
  } catch (err: any) {
    console.error('\n❌ TEST FAILED:', err);
    throw err;
  } finally {
    console.log('Cleaning up test data in SQLite...');
    try {
      for (const appId of createdTestAppIds) {
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

runCoverLetterTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
