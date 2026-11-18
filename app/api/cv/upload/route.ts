import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { parseDocumentBuffer } from '@/services/cvExtraction/documentParser';
import { extractCVSections } from '@/services/cvExtraction/sectionExtractor';
import { generateId } from '@/services/profileService';
import { DocumentUploadResponse } from '@/types/cvExtraction';
import { recordUploadedCV } from '@/services/server/profileDbService';

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB
const ALLOWED_EXTENSIONS = ['pdf', 'docx'];

export async function POST(req: NextRequest): Promise<NextResponse<DocumentUploadResponse>> {
  try {
    const formData = await req.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { success: false, error: 'No document file provided in upload request.' },
        { status: 400 }
      );
    }

    const filename = file.name || 'document';
    const ext = filename.split('.').pop()?.toLowerCase() || '';

    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid file type (.${ext}). Only PDF (.pdf) and DOCX (.docx) documents are supported.`,
        },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          success: false,
          error: `File size exceeds the 15MB limit. (Uploaded: ${(file.size / (1024 * 1024)).toFixed(1)}MB)`,
        },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 1. Preserve original CV document locally
    const documentId = generateId();
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storageFilename = `${Date.now()}_${documentId}_${sanitizedFilename}`;
    const uploadDir = path.join(process.cwd(), 'uploads', 'cv');

    await fs.mkdir(uploadDir, { recursive: true });
    const localFilePath = path.join(uploadDir, storageFilename);
    await fs.writeFile(localFilePath, buffer);

    // 2. Parse textual content using server-side document processor
    const parsedDoc = await parseDocumentBuffer(buffer, filename, file.type);

    // 3. Persist CV Document record in SQLite database
    await recordUploadedCV({
      filename: storageFilename,
      originalFilename: filename,
      filePath: path.join('uploads', 'cv', storageFilename),
      fileSize: file.size,
      mimeType: parsedDoc.mimeType,
      rawText: parsedDoc.rawText,
    });

    // 4. Extract candidate information into structured review sections
    const extraction = extractCVSections(parsedDoc.rawText, {
      documentId,
      originalFilename: filename,
      fileSize: file.size,
      mimeType: parsedDoc.mimeType,
    });

    return NextResponse.json({
      success: true,
      extraction,
    });
  } catch (error) {
    console.error('CV upload extraction error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'An error occurred during CV processing.',
      },
      { status: 500 }
    );
  }
}
