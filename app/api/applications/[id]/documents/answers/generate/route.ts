import { NextRequest, NextResponse } from 'next/server';
import { generateApplicationScreeningAnswers } from '@/services/screeningAnswers';

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

    const result = await generateApplicationScreeningAnswers(id, {
      customInstructions: body.customInstructions,
      providerId: body.providerId,
    });

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Failed to generate screening answers.',
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      documentId: result.documentId,
      version: result.version,
      content: result.content,
      flaggedCount: result.flaggedCount,
      requiresManualConfirmation: Boolean(result.requiresManualConfirmation),
    });
  } catch (error) {
    console.error('Error generating screening answers:', error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Server error generating screening answers.',
      },
      { status: 500 }
    );
  }
}
