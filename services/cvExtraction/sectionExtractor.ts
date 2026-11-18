import {
  PersonalInformation,
  ProfessionalSummary,
  EducationEntry,
  WorkExperienceEntry,
  TechnicalSkillEntry,
  ProjectEntry,
  CertificationEntry,
  SkillCategory,
  ProficiencyLevel,
  EmploymentType,
} from '@/types/profile';
import { CVExtractionResult, ExtractedSectionReview } from '@/types/cvExtraction';
import { generateId } from '@/services/profileService';

// Known skills catalog for categorization
const SKILL_CATALOG: Record<string, { category: SkillCategory; proficiency: ProficiencyLevel }> = {
  // Programming Languages
  typescript: { category: 'Programming Languages', proficiency: 'Advanced' },
  javascript: { category: 'Programming Languages', proficiency: 'Advanced' },
  python: { category: 'Programming Languages', proficiency: 'Advanced' },
  golang: { category: 'Programming Languages', proficiency: 'Intermediate' },
  go: { category: 'Programming Languages', proficiency: 'Intermediate' },
  rust: { category: 'Programming Languages', proficiency: 'Intermediate' },
  java: { category: 'Programming Languages', proficiency: 'Intermediate' },
  'c++': { category: 'Programming Languages', proficiency: 'Intermediate' },
  'c#': { category: 'Programming Languages', proficiency: 'Intermediate' },
  ruby: { category: 'Programming Languages', proficiency: 'Intermediate' },
  php: { category: 'Programming Languages', proficiency: 'Intermediate' },
  sql: { category: 'Programming Languages', proficiency: 'Advanced' },
  html: { category: 'Frontend', proficiency: 'Advanced' },
  css: { category: 'Frontend', proficiency: 'Advanced' },
  bash: { category: 'DevOps / Cloud', proficiency: 'Intermediate' },

  // Frontend
  react: { category: 'Frontend', proficiency: 'Advanced' },
  'next.js': { category: 'Frontend', proficiency: 'Advanced' },
  nextjs: { category: 'Frontend', proficiency: 'Advanced' },
  vue: { category: 'Frontend', proficiency: 'Intermediate' },
  angular: { category: 'Frontend', proficiency: 'Intermediate' },
  'tailwind css': { category: 'Frontend', proficiency: 'Advanced' },
  tailwind: { category: 'Frontend', proficiency: 'Advanced' },
  redux: { category: 'Frontend', proficiency: 'Intermediate' },
  zustand: { category: 'Frontend', proficiency: 'Intermediate' },

  // Backend
  'node.js': { category: 'Backend', proficiency: 'Advanced' },
  nodejs: { category: 'Backend', proficiency: 'Advanced' },
  express: { category: 'Backend', proficiency: 'Advanced' },
  nestjs: { category: 'Backend', proficiency: 'Intermediate' },
  fastapi: { category: 'Backend', proficiency: 'Intermediate' },
  django: { category: 'Backend', proficiency: 'Intermediate' },
  'spring boot': { category: 'Backend', proficiency: 'Intermediate' },
  graphql: { category: 'Backend', proficiency: 'Intermediate' },
  'rest api': { category: 'Backend', proficiency: 'Advanced' },
  rest: { category: 'Backend', proficiency: 'Advanced' },

  // Database
  postgresql: { category: 'Database', proficiency: 'Advanced' },
  postgres: { category: 'Database', proficiency: 'Advanced' },
  mysql: { category: 'Database', proficiency: 'Intermediate' },
  mongodb: { category: 'Database', proficiency: 'Intermediate' },
  redis: { category: 'Database', proficiency: 'Intermediate' },
  sqlite: { category: 'Database', proficiency: 'Advanced' },
  prisma: { category: 'Database', proficiency: 'Advanced' },

  // DevOps & Cloud
  docker: { category: 'DevOps / Cloud', proficiency: 'Advanced' },
  kubernetes: { category: 'DevOps / Cloud', proficiency: 'Intermediate' },
  aws: { category: 'DevOps / Cloud', proficiency: 'Advanced' },
  gcp: { category: 'DevOps / Cloud', proficiency: 'Intermediate' },
  azure: { category: 'DevOps / Cloud', proficiency: 'Intermediate' },
  terraform: { category: 'DevOps / Cloud', proficiency: 'Intermediate' },
  'ci/cd': { category: 'DevOps / Cloud', proficiency: 'Advanced' },
  'github actions': { category: 'DevOps / Cloud', proficiency: 'Advanced' },

  // Testing
  jest: { category: 'Testing & QA', proficiency: 'Advanced' },
  playwright: { category: 'Testing & QA', proficiency: 'Advanced' },
  cypress: { category: 'Testing & QA', proficiency: 'Intermediate' },
  vitest: { category: 'Testing & QA', proficiency: 'Intermediate' },

  // AI / ML
  gemini: { category: 'AI / Machine Learning', proficiency: 'Advanced' },
  openai: { category: 'AI / Machine Learning', proficiency: 'Advanced' },
  pytorch: { category: 'AI / Machine Learning', proficiency: 'Intermediate' },
  tensorflow: { category: 'AI / Machine Learning', proficiency: 'Intermediate' },
  langchain: { category: 'AI / Machine Learning', proficiency: 'Intermediate' },
};

/**
 * Extracts structured sections and review states from raw CV text.
 */
export function extractCVSections(
  rawText: string,
  docMetadata: {
    documentId: string;
    originalFilename: string;
    fileSize: number;
    mimeType: string;
  }
): CVExtractionResult {
  const lines = rawText
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const textLower = rawText.toLowerCase();

  // 1. Personal Information Extraction
  const personalReview = extractPersonalInfo(lines, rawText);

  // 2. Identify Section Blocks
  const blocks = splitIntoMajorBlocks(rawText);

  // 3. Professional Summary
  const summaryReview = extractSummary(blocks.summary, lines);

  // 4. Education
  const educationReview = extractEducation(blocks.education);

  // 5. Work Experience
  const experienceReview = extractExperience(blocks.experience);

  // 6. Technical Skills
  const skillsReview = extractSkills(blocks.skills, rawText);

  // 7. Projects
  const projectsReview = extractProjects(blocks.projects);

  // 8. Certifications
  const certsReview = extractCertifications(blocks.certifications);

  // Unextracted sections list
  const unextractedSections: string[] = [];
  if (!personalReview.isExtracted) unextractedSections.push('Personal Information');
  if (!summaryReview.isExtracted) unextractedSections.push('Professional Summary');
  if (!educationReview.isExtracted) unextractedSections.push('Education');
  if (!experienceReview.isExtracted) unextractedSections.push('Work Experience');
  if (!skillsReview.isExtracted) unextractedSections.push('Technical Skills');
  if (!projectsReview.isExtracted) unextractedSections.push('Projects');
  if (!certsReview.isExtracted) unextractedSections.push('Certifications');

  return {
    documentId: docMetadata.documentId,
    originalFilename: docMetadata.originalFilename,
    fileSize: docMetadata.fileSize,
    mimeType: docMetadata.mimeType,
    uploadedAt: new Date().toISOString(),
    rawText,
    charCount: rawText.length,
    unextractedSections,
    sections: {
      personal: personalReview,
      summary: summaryReview,
      education: educationReview,
      experience: experienceReview,
      skills: skillsReview,
      projects: projectsReview,
      certifications: certsReview,
    },
  };
}

// ========================================================
// Helper Extractors
// ========================================================

function extractPersonalInfo(
  lines: string[],
  fullText: string
): ExtractedSectionReview<PersonalInformation> {
  const emailMatch = fullText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  const email = emailMatch ? emailMatch[0] : '';

  const phoneMatch = fullText.match(
    /(?:(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})|(?:\+\d{1,4}\s?\d{2,4}\s?\d{3,4}\s?\d{3,4})/
  );
  const phone = phoneMatch ? phoneMatch[0].trim() : '';

  const linkedinMatch = fullText.match(
    /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/([a-zA-Z0-9_-]+)/i
  );
  const linkedInUrl = linkedinMatch
    ? linkedinMatch[0].startsWith('http')
      ? linkedinMatch[0]
      : `https://${linkedinMatch[0]}`
    : '';

  const portfolioMatch = fullText.match(
    /(?:https?:\/\/)?(?:www\.)?(?:github\.com\/[a-zA-Z0-9_-]+|[a-zA-Z0-9-]+\.(?:dev|me|io|com|org)(?:\/[^\s]*)?)/i
  );
  let portfolioUrl = '';
  if (portfolioMatch && !portfolioMatch[0].includes('linkedin.com')) {
    portfolioUrl = portfolioMatch[0].startsWith('http')
      ? portfolioMatch[0]
      : `https://${portfolioMatch[0]}`;
  }

  // Name extraction heuristic: usually line 0 or 1 before email/phone
  let fullName = '';
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const l = lines[i];
    if (
      l.length > 2 &&
      l.length < 50 &&
      !l.includes('@') &&
      !l.includes('http') &&
      !l.includes('linkedin') &&
      !/curriculum|resume|cv/i.test(l) &&
      !/\d{4}/.test(l)
    ) {
      fullName = l;
      break;
    }
  }

  // City / Country heuristic from top 5 lines
  let city = '';
  let country = '';
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const l = lines[i];
    const locationMatch = l.match(/([A-Z][a-zA-Z\s]+),\s*([A-Z]{2}|[A-Z][a-zA-Z\s]+)/);
    if (locationMatch && !locationMatch[0].includes('@')) {
      city = locationMatch[1].trim();
      country = locationMatch[2].trim();
      break;
    }
  }

  const missingFields: string[] = [];
  if (!fullName) missingFields.push('Full Name');
  if (!email) missingFields.push('Email');
  if (!phone) missingFields.push('Phone Number');
  if (!city) missingFields.push('City');
  if (!country) missingFields.push('Country');

  const isExtracted = Boolean(fullName || email || phone);
  const rawSnippet = lines.slice(0, 6).join('\n');

  const data: PersonalInformation = {
    fullName,
    email,
    phone,
    city,
    country,
    linkedInUrl,
    portfolioUrl,
  };

  return {
    sectionId: 'personal',
    sectionTitle: 'Personal Information',
    status: 'pending',
    isExtracted,
    extractedData: data,
    editedData: { ...data },
    rawSnippet,
    missingFields,
    confidence: email && fullName ? 'high' : isExtracted ? 'medium' : 'low',
    notes: isExtracted
      ? 'Extracted from document header. Review contact coordinates carefully.'
      : 'Could not reliably detect contact info in the document header.',
  };
}

function extractSummary(
  summaryBlock: string | undefined,
  lines: string[]
): ExtractedSectionReview<ProfessionalSummary> {
  let summaryText = summaryBlock ? summaryBlock.trim() : '';

  // Fallback: look for 2-4 sentence paragraph near top
  if (!summaryText) {
    for (let i = 1; i < Math.min(8, lines.length); i++) {
      const l = lines[i];
      if (l.length > 80 && !l.includes('@') && !l.includes('http')) {
        summaryText = l;
        break;
      }
    }
  }

  // Headline heuristic: first line of summary or job title in header
  let headline = '';
  if (lines.length > 1) {
    const candidateHeadline = lines[1];
    if (
      candidateHeadline.length < 80 &&
      !candidateHeadline.includes('@') &&
      !candidateHeadline.includes('http') &&
      /engineer|developer|architect|designer|manager|consultant|specialist|lead/i.test(
        candidateHeadline
      )
    ) {
      headline = candidateHeadline;
    }
  }

  const isExtracted = Boolean(summaryText || headline);
  const missingFields: string[] = [];
  if (!headline) missingFields.push('Professional Headline');
  if (!summaryText) missingFields.push('Summary Text');

  const data: ProfessionalSummary = {
    headline: headline || '',
    summary: summaryText || '',
  };

  return {
    sectionId: 'summary',
    sectionTitle: 'Professional Summary',
    status: 'pending',
    isExtracted,
    extractedData: data,
    editedData: { ...data },
    rawSnippet: summaryText,
    missingFields,
    confidence: summaryText.length > 50 ? 'high' : isExtracted ? 'medium' : 'low',
    notes: isExtracted
      ? 'Extracted summary text. Ensure the tone matches your goals.'
      : 'No explicit professional summary or bio block was found.',
  };
}

function extractEducation(
  educationBlock: string | undefined
): ExtractedSectionReview<EducationEntry[]> {
  if (!educationBlock) {
    return {
      sectionId: 'education',
      sectionTitle: 'Education',
      status: 'pending',
      isExtracted: false,
      extractedData: [],
      editedData: [],
      missingFields: ['Institution', 'Degree'],
      confidence: 'low',
      notes: 'No education section was identified in the document.',
    };
  }

  const entries: EducationEntry[] = [];
  const lines = educationBlock
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  let currentEntry: Partial<EducationEntry> | null = null;

  for (const line of lines) {
    const isDegree =
      /bachelor|master|phd|doctor|b\.s\.|m\.s\.|b\.a\.|m\.a\.|b\.sc|m\.sc|degree|diploma|associate/i.test(
        line
      );
    const isInstitution =
      /university|college|institute|polytechnic|academy|school of/i.test(line);
    const dateMatch = line.match(/\b(19\d{2}|20\d{2})\b(?:\s*[-–—to]+\s*\b(19\d{2}|20\d{2}|present)\b)?/i);

    if (isInstitution || (isDegree && !currentEntry)) {
      if (currentEntry && (currentEntry.institution || currentEntry.degree)) {
        entries.push(completeEducationEntry(currentEntry));
      }
      currentEntry = {
        institution: isInstitution ? line : '',
        degree: isDegree ? line : '',
        startDate: dateMatch ? dateMatch[1] : '',
        graduationDate: dateMatch ? (dateMatch[2] || dateMatch[1]) : '',
        academicDetails: '',
      };
    } else if (currentEntry) {
      if (!currentEntry.degree && isDegree) {
        currentEntry.degree = line;
      } else if (!currentEntry.institution && isInstitution) {
        currentEntry.institution = line;
      } else if (dateMatch && !currentEntry.graduationDate) {
        currentEntry.startDate = dateMatch[1];
        currentEntry.graduationDate = dateMatch[2] || dateMatch[1];
      } else {
        currentEntry.academicDetails = currentEntry.academicDetails
          ? `${currentEntry.academicDetails}; ${line}`
          : line;
      }
    }
  }

  if (currentEntry && (currentEntry.institution || currentEntry.degree)) {
    entries.push(completeEducationEntry(currentEntry));
  }

  const isExtracted = entries.length > 0;

  return {
    sectionId: 'education',
    sectionTitle: 'Education',
    status: 'pending',
    isExtracted,
    extractedData: entries,
    editedData: [...entries],
    rawSnippet: educationBlock.slice(0, 400),
    missingFields: isExtracted ? [] : ['Institution', 'Degree'],
    confidence: isExtracted ? 'high' : 'low',
    notes: isExtracted
      ? `Extracted ${entries.length} education record(s). Verify degree names and dates.`
      : 'Could not extract structured education entries.',
  };
}

function completeEducationEntry(partial: Partial<EducationEntry>): EducationEntry {
  return {
    id: generateId(),
    institution: partial.institution || 'Unknown Institution',
    degree: partial.degree || 'Degree',
    fieldOfStudy: partial.fieldOfStudy || '',
    startDate: partial.startDate || '',
    graduationDate: partial.graduationDate || '',
    academicDetails: partial.academicDetails || '',
  };
}

function extractExperience(
  experienceBlock: string | undefined
): ExtractedSectionReview<WorkExperienceEntry[]> {
  if (!experienceBlock) {
    return {
      sectionId: 'experience',
      sectionTitle: 'Work Experience',
      status: 'pending',
      isExtracted: false,
      extractedData: [],
      editedData: [],
      missingFields: ['Company', 'Position'],
      confidence: 'low',
      notes: 'No work experience section identified in the document.',
    };
  }

  const entries: WorkExperienceEntry[] = [];
  const lines = experienceBlock
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  let current: Partial<WorkExperienceEntry> | null = null;

  for (const line of lines) {
    // Check if line looks like a job header: contains a date range (e.g. 2021 - Present or Jan 2020 - Dec 2022)
    const dateMatch = line.match(
      /\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|\d{4})\b.*?(?:[-–—to]+)\s*\b(?:present|current|\d{4}|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/i
    );

    const isRoleTitle =
      /engineer|developer|architect|lead|manager|consultant|analyst|designer|specialist|director|intern/i.test(
        line
      );

    // If we hit a new role boundary
    if (dateMatch || (isRoleTitle && !line.startsWith('•') && !line.startsWith('-') && !line.startsWith('*'))) {
      if (current && (current.company || current.position)) {
        entries.push(completeExperienceEntry(current));
      }

      const isCurrent = /present|current/i.test(line);

      current = {
        company: '',
        position: '',
        employmentType: 'full-time',
        startDate: '',
        endDate: isCurrent ? '' : '',
        isCurrentRole: isCurrent,
        responsibilities: [],
        achievements: [],
      };

      if (dateMatch) {
        const parts = dateMatch[0].split(/[-–—to]+/i);
        current.startDate = parts[0]?.trim() || '';
        current.endDate = isCurrent ? '' : parts[1]?.trim() || '';
        const remainder = line.replace(dateMatch[0], '').replace(/[|•–—,-]/g, ' ').trim();
        if (remainder) {
          current.position = remainder;
        }
      } else {
        current.position = line;
      }
    } else if (current) {
      // Bullet points detection
      const isBullet = /^([•\-*▪>]|\d+\.)\s*/.test(line);
      const cleanText = line.replace(/^([•\-*▪>]|\d+\.)\s*/, '').trim();

      if (!current.company && !isBullet && line.length < 60) {
        current.company = line;
      } else if (!current.position && !isBullet && isRoleTitle) {
        current.position = line;
      } else if (cleanText) {
        // Classify as achievement if contains metrics, numbers, percentages, or verbs like increased/reduced
        const isAchievement =
          /(?:\d+%|\$\d+|\breduced\b|\bincreased\b|\bimproved\b|\boptimized\b|\bscaled\b|\blaunched\b)/i.test(
            cleanText
          );

        if (isAchievement) {
          current.achievements = [...(current.achievements || []), cleanText];
        } else {
          current.responsibilities = [...(current.responsibilities || []), cleanText];
        }
      }
    }
  }

  if (current && (current.company || current.position)) {
    entries.push(completeExperienceEntry(current));
  }

  const isExtracted = entries.length > 0;

  return {
    sectionId: 'experience',
    sectionTitle: 'Work Experience',
    status: 'pending',
    isExtracted,
    extractedData: entries,
    editedData: [...entries],
    rawSnippet: experienceBlock.slice(0, 500),
    missingFields: isExtracted ? [] : ['Company', 'Position'],
    confidence: isExtracted ? 'high' : 'low',
    notes: isExtracted
      ? `Extracted ${entries.length} work experience entries. Review positions, dates, and responsibilities.`
      : 'Could not extract individual roles. You can manually structure them in the review editor.',
  };
}

function completeExperienceEntry(partial: Partial<WorkExperienceEntry>): WorkExperienceEntry {
  return {
    id: generateId(),
    company: partial.company || 'Company',
    position: partial.position || 'Position',
    employmentType: partial.employmentType || 'full-time',
    startDate: partial.startDate || '',
    endDate: partial.endDate || '',
    isCurrentRole: Boolean(partial.isCurrentRole),
    responsibilities: partial.responsibilities || [],
    achievements: partial.achievements || [],
  };
}

function extractSkills(
  skillsBlock: string | undefined,
  fullText: string
): ExtractedSectionReview<TechnicalSkillEntry[]> {
  const textToSearch = skillsBlock || fullText;
  const foundSkillsMap = new Map<string, TechnicalSkillEntry>();

  // Check known catalog
  for (const [skillKey, meta] of Object.entries(SKILL_CATALOG)) {
    // Exact word boundary regex
    const regex = new RegExp(`\\b${escapeRegExp(skillKey)}\\b`, 'i');
    if (regex.test(textToSearch)) {
      // Capitalize properly
      const formattedName = skillKey
        .split(' ')
        .map((w) => (w === 'api' || w === 'sql' || w === 'css' || w === 'html' ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)))
        .join(' ');

      if (!foundSkillsMap.has(formattedName.toLowerCase())) {
        foundSkillsMap.set(formattedName.toLowerCase(), {
          id: generateId(),
          name: formattedName,
          category: meta.category,
          proficiency: meta.proficiency,
        });
      }
    }
  }

  // Also parse comma-separated skills in skillsBlock
  if (skillsBlock) {
    const rawItems = skillsBlock
      .replace(/skills|technical|technologies|tools/gi, '')
      .split(/[,•|;\n]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 1 && s.length < 30);

    for (const item of rawItems) {
      if (!foundSkillsMap.has(item.toLowerCase()) && !/^[•\-*]/.test(item)) {
        foundSkillsMap.set(item.toLowerCase(), {
          id: generateId(),
          name: item,
          category: 'Tools & Platforms',
          proficiency: 'Advanced',
        });
      }
    }
  }

  const skills = Array.from(foundSkillsMap.values());
  const isExtracted = skills.length > 0;

  return {
    sectionId: 'skills',
    sectionTitle: 'Technical Skills',
    status: 'pending',
    isExtracted,
    extractedData: skills,
    editedData: [...skills],
    rawSnippet: skillsBlock?.slice(0, 400) || '',
    missingFields: isExtracted ? [] : ['Technical Skills'],
    confidence: skills.length >= 3 ? 'high' : isExtracted ? 'medium' : 'low',
    notes: isExtracted
      ? `Extracted ${skills.length} technical skills. Adjust categories or proficiencies as needed.`
      : 'No skills section recognized.',
  };
}

function extractProjects(
  projectsBlock: string | undefined
): ExtractedSectionReview<ProjectEntry[]> {
  if (!projectsBlock) {
    return {
      sectionId: 'projects',
      sectionTitle: 'Projects',
      status: 'pending',
      isExtracted: false,
      extractedData: [],
      editedData: [],
      missingFields: ['Project Name', 'Description'],
      confidence: 'low',
      notes: 'No projects section identified in the document.',
    };
  }

  const entries: ProjectEntry[] = [];
  const lines = projectsBlock
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  let current: Partial<ProjectEntry> | null = null;

  for (const line of lines) {
    const isBullet = /^([•\-*▪>]|\d+\.)\s*/.test(line);
    const cleanText = line.replace(/^([•\-*▪>]|\d+\.)\s*/, '').trim();

    // Project title candidate: non-bullet line, length < 70
    if (!isBullet && line.length < 70 && !/projects|technical projects/i.test(line)) {
      if (current && current.name) {
        entries.push(completeProjectEntry(current));
      }
      current = {
        name: cleanText.replace(/[:\-–—|].*$/, '').trim(),
        description: '',
        technologies: [],
        projectUrl: '',
        keyResponsibilities: '',
      };

      const urlMatch = line.match(/https?:\/\/[^\s]+/);
      if (urlMatch) {
        current.projectUrl = urlMatch[0];
      }
    } else if (current) {
      if (!current.description) {
        current.description = cleanText;
      } else {
        current.keyResponsibilities = current.keyResponsibilities
          ? `${current.keyResponsibilities}; ${cleanText}`
          : cleanText;
      }
    }
  }

  if (current && current.name) {
    entries.push(completeProjectEntry(current));
  }

  const isExtracted = entries.length > 0;

  return {
    sectionId: 'projects',
    sectionTitle: 'Projects',
    status: 'pending',
    isExtracted,
    extractedData: entries,
    editedData: [...entries],
    rawSnippet: projectsBlock.slice(0, 400),
    missingFields: isExtracted ? [] : ['Project Name', 'Description'],
    confidence: isExtracted ? 'high' : 'low',
    notes: isExtracted
      ? `Extracted ${entries.length} project(s).`
      : 'No structured projects extracted.',
  };
}

function completeProjectEntry(partial: Partial<ProjectEntry>): ProjectEntry {
  return {
    id: generateId(),
    name: partial.name || 'Project',
    description: partial.description || '',
    technologies: partial.technologies || [],
    projectUrl: partial.projectUrl || '',
    keyResponsibilities: partial.keyResponsibilities || '',
  };
}

function extractCertifications(
  certsBlock: string | undefined
): ExtractedSectionReview<CertificationEntry[]> {
  if (!certsBlock) {
    return {
      sectionId: 'certifications',
      sectionTitle: 'Certifications',
      status: 'pending',
      isExtracted: false,
      extractedData: [],
      editedData: [],
      missingFields: ['Certification Name', 'Issuing Organization'],
      confidence: 'low',
      notes: 'No certifications section identified in the document.',
    };
  }

  const entries: CertificationEntry[] = [];
  const lines = certsBlock
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  for (const line of lines) {
    if (/certifications|licenses|courses/i.test(line) && line.length < 25) continue;

    const clean = line.replace(/^[•\-*▪>]\s*/, '').trim();
    if (!clean) continue;

    const dateMatch = clean.match(/\b(19\d{2}|20\d{2})\b/);
    const dateObtained = dateMatch ? dateMatch[0] : '';

    // Split "Name - Issuer" or "Name, Issuer"
    let name = clean;
    let issuer = 'Accredited Organization';

    if (clean.includes(' - ')) {
      const parts = clean.split(' - ');
      name = parts[0].trim();
      issuer = parts[1]?.trim() || issuer;
    } else if (clean.includes(' by ')) {
      const parts = clean.split(' by ');
      name = parts[0].trim();
      issuer = parts[1]?.trim() || issuer;
    }

    entries.push({
      id: generateId(),
      name,
      issuingOrganization: issuer,
      dateObtained,
      credentialUrl: '',
    });
  }

  const isExtracted = entries.length > 0;

  return {
    sectionId: 'certifications',
    sectionTitle: 'Certifications',
    status: 'pending',
    isExtracted,
    extractedData: entries,
    editedData: [...entries],
    rawSnippet: certsBlock.slice(0, 300),
    missingFields: isExtracted ? [] : ['Certification Name'],
    confidence: isExtracted ? 'high' : 'low',
    notes: isExtracted
      ? `Extracted ${entries.length} certification(s).`
      : 'No certifications extracted.',
  };
}

// Split document into major section blocks
function splitIntoMajorBlocks(text: string): {
  summary?: string;
  experience?: string;
  education?: string;
  skills?: string;
  projects?: string;
  certifications?: string;
} {
  const headings = [
    { key: 'summary', regex: /(?:^|\n)\s*(?:professional\s+summary|executive\s+summary|summary|about\s+me|profile|objective)\b[:\s]*/i },
    { key: 'experience', regex: /(?:^|\n)\s*(?:work\s+experience|professional\s+experience|employment\s+history|experience|career\s+history)\b[:\s]*/i },
    { key: 'education', regex: /(?:^|\n)\s*(?:education|academic\s+background|academic\s+history|qualifications)\b[:\s]*/i },
    { key: 'skills', regex: /(?:^|\n)\s*(?:technical\s+skills|core\s+competencies|technologies|skills\s*(?:&|and)\s*tools|skills)\b[:\s]*/i },
    { key: 'projects', regex: /(?:^|\n)\s*(?:key\s+projects|technical\s+projects|projects|portfolio\s+projects)\b[:\s]*/i },
    { key: 'certifications', regex: /(?:^|\n)\s*(?:certifications|licenses|certifications\s*(?:&|and)\s*courses|accreditations)\b[:\s]*/i },
  ];

  // Find occurrences and positions
  const matches: { key: string; index: number; length: number }[] = [];

  for (const h of headings) {
    const match = text.match(h.regex);
    if (match && match.index !== undefined) {
      matches.push({
        key: h.key,
        index: match.index,
        length: match[0].length,
      });
    }
  }

  matches.sort((a, b) => a.index - b.index);

  const blocks: Record<string, string> = {};

  for (let i = 0; i < matches.length; i++) {
    const curr = matches[i];
    const startIndex = curr.index + curr.length;
    const endIndex = i + 1 < matches.length ? matches[i + 1].index : text.length;
    blocks[curr.key] = text.slice(startIndex, endIndex).trim();
  }

  return blocks;
}

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
