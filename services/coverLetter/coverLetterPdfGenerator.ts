import PDFDocument from 'pdfkit';
import { TailoredCoverLetterContent } from './types';

/**
 * Generates an executive, ATS-compliant vector PDF buffer from TailoredCoverLetterContent.
 */
export async function generateCoverLetterPdfBuffer(
  letter: TailoredCoverLetterContent
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'LETTER',
        margins: { top: 45, bottom: 45, left: 45, right: 45 },
        info: {
          Title: `Cover Letter - ${letter.senderInfo.fullName} for ${letter.recipientInfo.roleTitle} at ${letter.recipientInfo.company}`,
          Author: letter.senderInfo.fullName,
          Subject: `Cover Letter for ${letter.recipientInfo.roleTitle}`,
          Keywords: 'Cover Letter, JobPilot AI, Application',
          Creator: 'JobPilot AI Application Engine',
        },
        autoFirstPage: true,
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));

      const pageWidth = 612;
      const leftMargin = 45;
      const rightMargin = 45;
      const contentWidth = pageWidth - leftMargin - rightMargin; // 522 pt

      // -------------------------------------------------------------
      // 1. CANDIDATE LETTERHEAD HEADER
      // -------------------------------------------------------------
      doc
        .fontSize(18)
        .font('Helvetica-Bold')
        .fillColor('#0f172a')
        .text(letter.senderInfo.fullName, leftMargin, doc.y, {
          align: 'left',
          width: contentWidth,
        });

      const contactParts = [
        letter.senderInfo.email,
        letter.senderInfo.phone,
        letter.senderInfo.location,
      ].filter(Boolean);

      if (contactParts.length > 0) {
        doc.moveDown(0.2);
        doc
          .fontSize(9)
          .font('Helvetica')
          .fillColor('#64748b')
          .text(contactParts.join('  •  '), {
            align: 'left',
            width: contentWidth,
          });
      }

      // Horizontal separator rule
      doc.moveDown(0.3);
      const ruleY = doc.y;
      doc
        .moveTo(leftMargin, ruleY)
        .lineTo(pageWidth - rightMargin, ruleY)
        .strokeColor('#cbd5e1')
        .lineWidth(1)
        .stroke();
      doc.moveDown(0.6);

      // -------------------------------------------------------------
      // 2. DATE & RECIPIENT BLOCK
      // -------------------------------------------------------------
      doc
        .fontSize(9)
        .font('Helvetica')
        .fillColor('#64748b')
        .text(letter.senderInfo.date, leftMargin, doc.y);

      doc.moveDown(0.5);

      const recipient = letter.recipientInfo.hiringManager || 'Hiring Team';
      doc
        .fontSize(9.5)
        .font('Helvetica-Bold')
        .fillColor('#0f172a')
        .text(recipient);

      doc
        .font('Helvetica-Bold')
        .fillColor('#2563eb')
        .text(letter.recipientInfo.company);

      if (letter.recipientInfo.companyLocation) {
        doc
          .font('Helvetica')
          .fillColor('#64748b')
          .text(letter.recipientInfo.companyLocation);
      }

      doc
        .fontSize(9)
        .font('Helvetica-Oblique')
        .fillColor('#475569')
        .text(`Re: Application for ${letter.recipientInfo.roleTitle}`);

      doc.moveDown(0.8);

      // -------------------------------------------------------------
      // 3. SALUTATION
      // -------------------------------------------------------------
      doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .fillColor('#0f172a')
        .text(letter.salutation);

      doc.moveDown(0.5);

      // -------------------------------------------------------------
      // 4. OPENING PARAGRAPH
      // -------------------------------------------------------------
      doc
        .fontSize(9.5)
        .font('Helvetica')
        .fillColor('#334155')
        .text(letter.opening, leftMargin, doc.y, {
          width: contentWidth,
          align: 'left',
          lineGap: 3,
        });

      doc.moveDown(0.6);

      // -------------------------------------------------------------
      // 5. BODY PARAGRAPHS
      // -------------------------------------------------------------
      for (const para of letter.bodyParagraphs) {
        doc
          .fontSize(9.5)
          .font('Helvetica')
          .fillColor('#334155')
          .text(para, leftMargin, doc.y, {
            width: contentWidth,
            align: 'left',
            lineGap: 3,
          });

        doc.moveDown(0.6);
      }

      // -------------------------------------------------------------
      // 6. CALL TO ACTION / CLOSING
      // -------------------------------------------------------------
      doc
        .fontSize(9.5)
        .font('Helvetica')
        .fillColor('#334155')
        .text(letter.callToAction, leftMargin, doc.y, {
          width: contentWidth,
          align: 'left',
          lineGap: 3,
        });

      doc.moveDown(0.8);

      // -------------------------------------------------------------
      // 7. SIGN-OFF
      // -------------------------------------------------------------
      doc
        .fontSize(9.5)
        .font('Helvetica')
        .fillColor('#334155')
        .text('Sincerely,');

      doc.moveDown(0.4);

      doc
        .fontSize(11)
        .font('Helvetica-Bold')
        .fillColor('#0f172a')
        .text(letter.senderInfo.fullName);

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Renders structured Markdown Cover Letter content to a clean vector PDF buffer.
 * Synchronizes candidate edits from the markdown textarea.
 */
export async function renderCoverLetterMarkdownToPdfBuffer(
  markdown: string
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'LETTER',
        margins: { top: 45, bottom: 45, left: 45, right: 45 },
        info: {
          Title: 'Cover Letter',
          Creator: 'JobPilot AI Application Engine',
        },
        autoFirstPage: true,
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));

      const pageWidth = 612;
      const leftMargin = 45;
      const rightMargin = 45;
      const contentWidth = pageWidth - leftMargin - rightMargin;

      const lines = markdown.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) {
          doc.moveDown(0.3);
          continue;
        }

        if (line.startsWith('# ')) {
          // Candidate Name
          const text = line.replace(/^#\s+/, '');
          doc.fontSize(18).font('Helvetica-Bold').fillColor('#0f172a').text(text, leftMargin, doc.y);
          doc.moveDown(0.15);
        } else if (line.startsWith('---')) {
          // Horizontal divider
          doc.moveDown(0.2);
          const y = doc.y;
          doc.moveTo(leftMargin, y).lineTo(pageWidth - rightMargin, y).strokeColor('#cbd5e1').lineWidth(1).stroke();
          doc.moveDown(0.4);
        } else if (line.startsWith('**Date:**')) {
          doc.fontSize(9).font('Helvetica').fillColor('#64748b').text(line.replace(/\*\*/g, ''));
        } else if (line.startsWith('**To:**') || line.startsWith('**Company:**') || line.startsWith('**Position:**') || line.startsWith('**Location:**')) {
          doc.fontSize(9.5).font('Helvetica-Bold').fillColor('#0f172a').text(line.replace(/\*\*/g, ''));
        } else if (line.startsWith('Dear ') || line.startsWith('To Whom')) {
          doc.moveDown(0.2);
          doc.fontSize(10).font('Helvetica-Bold').fillColor('#0f172a').text(line);
          doc.moveDown(0.3);
        } else if (line.startsWith('Sincerely,') || line.startsWith('Best regards,')) {
          doc.moveDown(0.4);
          doc.fontSize(9.5).font('Helvetica').fillColor('#334155').text(line);
          doc.moveDown(0.3);
        } else if (line.startsWith('- ') || line.startsWith('* ')) {
          // Bullet point (e.g. for flagged gaps)
          const text = line.replace(/^[-*]\s+/, '');
          doc.fontSize(9).font('Helvetica').fillColor('#2563eb').text('•', leftMargin + 6, doc.y, { width: 10, continued: true });
          doc.fontSize(9).font('Helvetica').fillColor('#475569').text(` ${text}`, { width: contentWidth - 16, lineGap: 2 });
          doc.moveDown(0.1);
        } else if (line.startsWith('### ')) {
          doc.moveDown(0.3);
          doc.fontSize(10).font('Helvetica-Bold').fillColor('#b45309').text(line.replace(/^###\s+/, ''));
          doc.moveDown(0.2);
        } else {
          // Standard Paragraph
          doc.fontSize(9.5).font('Helvetica').fillColor('#334155').text(line, leftMargin, doc.y, {
            width: contentWidth,
            align: 'left',
            lineGap: 3,
          });
          doc.moveDown(0.3);
        }
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
