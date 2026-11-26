import { NextRequest, NextResponse } from 'next/server';
import { generateTailoredCV } from '@/services/cvGeneration';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    let body: any = {};
    try {
      body = await req.json();
    } catch {}

    const result = await generateTailoredCV(id, {
      customInstructions: body.customInstructions,
      providerId: body.providerId,
    });

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Failed to generate tailored CV.',
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      documentId: result.documentId,
      version: result.version,
      originalFilename: result.originalFilename,
      filePath: result.filePath,
      flaggedGaps: result.flaggedGaps || [],
      requiresManualConfirmation: Boolean(result.requiresManualConfirmation),
    });
  } catch (error) {
    console.error('Error in CV generation route:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Server error generating CV.',
      },
      { status: 500 }
    );
  }
}
