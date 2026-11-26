import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  try {
    const { id, docId } = await params;

    const doc = await prisma.generatedDocument.findFirst({
      where: {
        id: docId,
        applicationId: id,
      },
    });

    if (!doc) {
      return NextResponse.json(
        { success: false, error: 'Document not found.' },
        { status: 404 }
      );
    }

    const absolutePath = path.isAbsolute(doc.filePath)
      ? doc.filePath
      : path.join(/*turbopackIgnore: true*/ process.cwd(), doc.filePath);

    if (!fs.existsSync(absolutePath)) {
      return NextResponse.json(
        { success: false, error: 'Document file not found on disk.' },
        { status: 404 }
      );
    }

    const fileBuffer = fs.readFileSync(absolutePath);

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': doc.mimeType || 'application/pdf',
        'Content-Disposition': `inline; filename="${encodeURIComponent(doc.originalFilename)}"`,
        'Content-Length': fileBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('Error previewing document:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to preview document.',
      },
      { status: 500 }
    );
  }
}
