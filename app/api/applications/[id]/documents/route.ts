import { NextRequest, NextResponse } from 'next/server';
import { saveOrUpdateDocument } from '@/services/server/applicationService';
import { DocumentType } from '@/types/application';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    if (!body.documentType || !body.content) {
      return NextResponse.json(
        {
          success: false,
          error: 'documentType and content are required.',
        },
        { status: 400 }
      );
    }

    const result = await saveOrUpdateDocument(id, {
      id: body.id,
      documentType: body.documentType as DocumentType,
      originalFilename: body.originalFilename || `${body.documentType}.md`,
      content: body.content,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      document: result.document,
    });
  } catch (error) {
    console.error('Failed to save document:', error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Database error saving application document.',
      },
      { status: 500 }
    );
  }
}
