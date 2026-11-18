import { NextRequest, NextResponse } from 'next/server';
import { getCVDocuments, deleteCVDocumentRecord } from '@/services/server/profileDbService';
import fs from 'fs/promises';
import path from 'path';

export async function GET() {
  try {
    const documents = await getCVDocuments();
    return NextResponse.json({
      success: true,
      documents,
    });
  } catch (error) {
    console.error('Failed to retrieve CV documents:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Database error fetching CV documents',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Document ID is required.' },
        { status: 400 }
      );
    }

    const docs = await getCVDocuments();
    const targetDoc = docs.find((d) => d.id === id);

    const deleted = await deleteCVDocumentRecord(id);

    if (deleted && targetDoc?.filePath) {
      try {
        const fullPath = path.isAbsolute(targetDoc.filePath)
          ? targetDoc.filePath
          : path.join(process.cwd(), 'uploads', 'cv', path.basename(targetDoc.filePath));
        await fs.unlink(fullPath).catch(() => {});
      } catch {}
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error('Failed to delete CV document:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Database error deleting CV document',
      },
      { status: 500 }
    );
  }
}
