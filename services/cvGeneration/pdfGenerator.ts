import PDFDocument from 'pdfkit';
import { TailoredCVContent } from './types';

/**
 * Generates an ATS-compliant, professionally formatted PDF buffer from TailoredCVContent.
 *
 * ATS Best Practices Enforced:
 * - Clean standard typography (Helvetica / Helvetica-Bold / Helvetica-Oblique)
 * - Single-column hierarchical layout ensuring reliable text extraction
 * - Standard section headings matching ATS parsing taxonomies
 * - Strict vector text with standard letter dimensions (612 x 792 pt)
 * - High contrast dark slate palette (#0f172a, #334155) for crisp rendering & printing
 */
export async function generateCVPdfBuffer(cv: TailoredCVContent): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'LETTER',
        margins: { top: 36, bottom: 36, left: 40, right: 40 },
        info: {
          Title: `${cv.personalInfo.fullName} - ${cv.personalInfo.targetTitle}`,
          Author: cv.personalInfo.fullName,
          Subject: `Tailored CV for ${cv.personalInfo.targetTitle}`,
          Keywords: 'Resume, CV, JobPilot AI, ATS Compliant',
          Creator: 'JobPilot AI Application Engine',
        },
        autoFirstPage: true,
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));

      const pageWidth = 612;
      const leftMargin = 40;
      const rightMargin = 40;
      const contentWidth = pageWidth - leftMargin - rightMargin; // 532 pt

      // Helper: Check for bottom overflow before section
      const ensureSpace = (neededHeight: number) => {
        if (doc.y + neededHeight > 740) {
          doc.addPage();
        }
      };

      // Helper: Render section heading with clean rule
      const renderSectionHeading = (title: string) => {
        ensureSpace(40);
        doc.moveDown(0.5);
        doc
          .fontSize(10.5)
          .font('Helvetica-Bold')
          .fillColor('#0f172a')
          .text(title.toUpperCase(), leftMargin, doc.y, { characterSpacing: 0.5 });

        const ruleY = doc.y + 2;
        doc
          .moveTo(leftMargin, ruleY)
          .lineTo(pageWidth - rightMargin, ruleY)
          .strokeColor('#cbd5e1')
          .lineWidth(0.75)
          .stroke();

        doc.moveDown(0.35);
      };

      // -------------------------------------------------------------
      // 1. HEADER (Candidate Info)
      // -------------------------------------------------------------
      doc
        .fontSize(20)
        .font('Helvetica-Bold')
        .fillColor('#0f172a')
        .text(cv.personalInfo.fullName, leftMargin, doc.y, {
          align: 'center',
          width: contentWidth,
        });

      if (cv.personalInfo.targetTitle) {
        doc.moveDown(0.15);
        doc
          .fontSize(11)
          .font('Helvetica-Bold')
          .fillColor('#2563eb')
          .text(cv.personalInfo.targetTitle, {
            align: 'center',
            width: contentWidth,
          });
      }

      // Contact Line: Email • Phone • Location • LinkedIn • Portfolio
      const contactParts = [
        cv.personalInfo.email,
        cv.personalInfo.phone,
        cv.personalInfo.location,
        cv.personalInfo.linkedInUrl ? `LinkedIn: ${cv.personalInfo.linkedInUrl.replace(/^https?:\/\/(www\.)?/, '')}` : '',
        cv.personalInfo.portfolioUrl ? `Portfolio: ${cv.personalInfo.portfolioUrl.replace(/^https?:\/\/(www\.)?/, '')}` : '',
      ].filter(Boolean);

      if (contactParts.length > 0) {
        doc.moveDown(0.2);
        doc
          .fontSize(8.5)
          .font('Helvetica')
          .fillColor('#475569')
          .text(contactParts.join('  •  '), {
            align: 'center',
            width: contentWidth,
          });
      }

      // Divider below header
      doc.moveDown(0.3);
      const headerRuleY = doc.y;
      doc
        .moveTo(leftMargin, headerRuleY)
        .lineTo(pageWidth - rightMargin, headerRuleY)
        .strokeColor('#94a3b8')
        .lineWidth(1)
        .stroke();
      doc.moveDown(0.2);

      // -------------------------------------------------------------
      // 2. PROFESSIONAL SUMMARY
      // -------------------------------------------------------------
      if (cv.professionalSummary && cv.professionalSummary.trim().length > 0) {
        renderSectionHeading('Professional Summary');
        doc
          .fontSize(9.5)
          .font('Helvetica')
          .fillColor('#334155')
          .text(cv.professionalSummary.trim(), leftMargin, doc.y, {
            width: contentWidth,
            align: 'left',
            lineGap: 2.5,
          });
      }

      // -------------------------------------------------------------
      // 3. TECHNICAL SKILLS
      // -------------------------------------------------------------
      if (cv.skills && cv.skills.length > 0) {
        renderSectionHeading('Technical Skills');
        for (const cat of cv.skills) {
          if (!cat.skills || cat.skills.length === 0) continue;
          ensureSpace(18);
          const currentY = doc.y;

          doc
            .fontSize(9)
            .font('Helvetica-Bold')
            .fillColor('#0f172a')
            .text(`${cat.category}: `, leftMargin, currentY, {
              continued: true,
            });

          doc
            .font('Helvetica')
            .fillColor('#334155')
            .text(cat.skills.join(', '), {
              lineGap: 2,
            });
        }
      }

      // -------------------------------------------------------------
      // 4. PROFESSIONAL EXPERIENCE
      // -------------------------------------------------------------
      if (cv.workExperience && cv.workExperience.length > 0) {
        renderSectionHeading('Professional Experience');

        for (const exp of cv.workExperience) {
          ensureSpace(50);
          const headerY = doc.y;
          const dateRange = `${exp.startDate} – ${exp.isCurrentRole ? 'Present' : exp.endDate}`;

          // Role and Company on the left
          doc
            .fontSize(9.5)
            .font('Helvetica-Bold')
            .fillColor('#0f172a')
            .text(exp.position, leftMargin, headerY, { continued: true });

          doc
            .font('Helvetica-Bold')
            .fillColor('#2563eb')
            .text(` | ${exp.company}`, { continued: true });

          if (exp.location) {
            doc
              .font('Helvetica')
              .fillColor('#64748b')
              .text(` (${exp.location})`, { continued: false });
          } else {
            doc.text('', { continued: false });
          }

          // Date right-aligned on the same baseline
          doc
            .fontSize(8.5)
            .font('Helvetica-Oblique')
            .fillColor('#475569')
            .text(dateRange, pageWidth - rightMargin - 150, headerY, {
              width: 150,
              align: 'right',
            });

          doc.moveDown(0.2);

          // Bullet points
          for (const bullet of exp.highlights) {
            ensureSpace(20);
            const bulletY = doc.y;
            doc
              .fontSize(9)
              .font('Helvetica')
              .fillColor('#2563eb')
              .text('•', leftMargin + 6, bulletY, { width: 10 });

            doc
              .fontSize(9)
              .font('Helvetica')
              .fillColor('#334155')
              .text(bullet, leftMargin + 18, bulletY, {
                width: contentWidth - 18,
                lineGap: 2,
              });

            doc.moveDown(0.15);
          }
          doc.moveDown(0.25);
        }
      }

      // -------------------------------------------------------------
      // 5. KEY PROJECTS
      // -------------------------------------------------------------
      if (cv.projects && cv.projects.length > 0) {
        renderSectionHeading('Key Projects');

        for (const proj of cv.projects) {
          ensureSpace(40);
          const projY = doc.y;

          doc
            .fontSize(9.5)
            .font('Helvetica-Bold')
            .fillColor('#0f172a')
            .text(proj.name, leftMargin, projY, { continued: true });

          if (proj.technologies && proj.technologies.length > 0) {
            doc
              .font('Helvetica-Oblique')
              .fillColor('#64748b')
              .text(` (${proj.technologies.join(', ')})`, { continued: true });
          }

          if (proj.projectUrl) {
            doc
              .font('Helvetica')
              .fillColor('#2563eb')
              .text(` [${proj.projectUrl}]`, { continued: false });
          } else {
            doc.text('', { continued: false });
          }

          doc.moveDown(0.15);

          if (proj.description) {
            ensureSpace(16);
            doc
              .fontSize(9)
              .font('Helvetica')
              .fillColor('#334155')
              .text(proj.description, leftMargin + 12, doc.y, {
                width: contentWidth - 12,
                lineGap: 2,
              });
            doc.moveDown(0.15);
          }

          if (proj.highlights && proj.highlights.length > 0) {
            for (const bullet of proj.highlights) {
              ensureSpace(16);
              const bY = doc.y;
              doc
                .fontSize(9)
                .font('Helvetica')
                .fillColor('#2563eb')
                .text('•', leftMargin + 12, bY, { width: 10 });

              doc
                .fontSize(9)
                .font('Helvetica')
                .fillColor('#334155')
                .text(bullet, leftMargin + 24, bY, {
                  width: contentWidth - 24,
                  lineGap: 2,
                });
              doc.moveDown(0.1);
            }
          }
          doc.moveDown(0.2);
        }
      }

      // -------------------------------------------------------------
      // 6. EDUCATION
      // -------------------------------------------------------------
      if (cv.education && cv.education.length > 0) {
        renderSectionHeading('Education');

        for (const edu of cv.education) {
          ensureSpace(35);
          const eduY = doc.y;
          const eduDate = `${edu.startDate} – ${edu.graduationDate}`;

          doc
            .fontSize(9.5)
            .font('Helvetica-Bold')
            .fillColor('#0f172a')
            .text(`${edu.degree} in ${edu.fieldOfStudy}`, leftMargin, eduY, {
              continued: true,
            });

          doc
            .font('Helvetica')
            .fillColor('#475569')
            .text(` | ${edu.institution}`, { continued: false });

          // Date right aligned
          doc
            .fontSize(8.5)
            .font('Helvetica-Oblique')
            .fillColor('#64748b')
            .text(eduDate, pageWidth - rightMargin - 150, eduY, {
              width: 150,
              align: 'right',
            });

          if (edu.academicDetails) {
            doc.moveDown(0.1);
            doc
              .fontSize(8.5)
              .font('Helvetica')
              .fillColor('#475569')
              .text(edu.academicDetails, leftMargin + 12, doc.y, {
                width: contentWidth - 12,
              });
          }
          doc.moveDown(0.2);
        }
      }

      // -------------------------------------------------------------
      // 7. CERTIFICATIONS
      // -------------------------------------------------------------
      if (cv.certifications && cv.certifications.length > 0) {
        renderSectionHeading('Certifications');

        for (const cert of cv.certifications) {
          ensureSpace(18);
          const certY = doc.y;

          doc
            .fontSize(9)
            .font('Helvetica-Bold')
            .fillColor('#0f172a')
            .text('• ', leftMargin + 6, certY, { continued: true });

          doc.text(cert.name, { continued: true });

          doc
            .font('Helvetica')
            .fillColor('#475569')
            .text(` — ${cert.issuingOrganization} (${cert.dateObtained})`, {
              continued: false,
            });

          doc.moveDown(0.1);
        }
      }

      // Finalize document
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Renders structured Markdown CV content to an ATS-compliant PDF buffer.
 * Allows candidates to edit their CV in markdown format and immediately obtain a synchronized PDF.
 */
export async function renderMarkdownToPdfBuffer(markdown: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'LETTER',
        margins: { top: 36, bottom: 36, left: 40, right: 40 },
        info: {
          Title: 'Tailored Candidate CV',
          Keywords: 'Resume, CV, JobPilot AI, ATS Compliant',
          Creator: 'JobPilot AI Application Engine',
        },
        autoFirstPage: true,
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));

      const pageWidth = 612;
      const leftMargin = 40;
      const rightMargin = 40;
      const contentWidth = pageWidth - leftMargin - rightMargin;

      const ensureSpace = (neededHeight: number) => {
        if (doc.y + neededHeight > 740) {
          doc.addPage();
        }
      };

      const lines = markdown.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) {
          doc.moveDown(0.2);
          continue;
        }

        if (line.startsWith('# ')) {
          // Main Title / Candidate Name
          const text = line.replace(/^#\s+/, '');
          doc.fontSize(20).font('Helvetica-Bold').fillColor('#0f172a').text(text, leftMargin, doc.y, {
            align: 'center',
            width: contentWidth,
          });
          doc.moveDown(0.15);
        } else if (line.startsWith('## ')) {
          // Major Section Header
          ensureSpace(35);
          doc.moveDown(0.4);
          const text = line.replace(/^##\s+/, '');
          doc.fontSize(10.5).font('Helvetica-Bold').fillColor('#0f172a').text(text.toUpperCase(), leftMargin, doc.y);
          const ruleY = doc.y + 2;
          doc.moveTo(leftMargin, ruleY).lineTo(pageWidth - rightMargin, ruleY).strokeColor('#cbd5e1').lineWidth(0.75).stroke();
          doc.moveDown(0.35);
        } else if (line.startsWith('### ')) {
          // Subheader (Role/Company or Degree)
          ensureSpace(25);
          const text = line.replace(/^###\s+/, '');
          doc.fontSize(9.5).font('Helvetica-Bold').fillColor('#0f172a').text(text, leftMargin, doc.y, {
            width: contentWidth,
          });
          doc.moveDown(0.1);
        } else if (line.startsWith('- ') || line.startsWith('* ')) {
          // Bullet point
          ensureSpace(16);
          const text = line.replace(/^[-*]\s+/, '');
          const bulletY = doc.y;
          doc.fontSize(9).font('Helvetica').fillColor('#2563eb').text('•', leftMargin + 6, bulletY, { width: 10 });
          doc.fontSize(9).font('Helvetica').fillColor('#334155').text(text, leftMargin + 18, bulletY, {
            width: contentWidth - 18,
            lineGap: 2,
          });
          doc.moveDown(0.15);
        } else if (line.startsWith('---')) {
          // Divider
          ensureSpace(15);
          doc.moveDown(0.3);
          const y = doc.y;
          doc.moveTo(leftMargin, y).lineTo(pageWidth - rightMargin, y).strokeColor('#94a3b8').lineWidth(1).stroke();
          doc.moveDown(0.3);
        } else {
          // Regular text / Contact info line
          const isCentered = i < 4; // Top lines (headline, contact)
          doc.fontSize(9).font('Helvetica').fillColor('#475569').text(line, leftMargin, doc.y, {
            width: contentWidth,
            align: isCentered ? 'center' : 'left',
            lineGap: 2,
          });
          doc.moveDown(0.1);
        }
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

