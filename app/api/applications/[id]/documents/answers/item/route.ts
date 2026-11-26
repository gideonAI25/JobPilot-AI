import { NextRequest, NextResponse } from 'next/server';
import {
  updateScreeningAnswerItem,
  regenerateSingleScreeningAnswer,
} from '@/services/screeningAnswers';

/**
 * Updates a specific question answer (edit text, mark verified, save to profile).
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    if (!body.questionId) {
      return NextResponse.json(
        { success: false, error: 'questionId is required.' },
        { status: 400 }
      );
    }

    const result = await updateScreeningAnswerItem(id, body.questionId, {
      answer: body.answer,
      isVerified: body.isVerified,
      saveToProfileStandardAnswers: body.saveToProfileStandardAnswers,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to update answer.' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      content: result.content,
    });
  } catch (error) {
    console.error('Error updating screening answer item:', error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Server error updating answer item.',
      },
      { status: 500 }
    );
  }
}

/**
 * Regenerates an individual answer using AI.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    if (!body.questionId) {
      return NextResponse.json(
        { success: false, error: 'questionId is required.' },
        { status: 400 }
      );
    }

    const result = await regenerateSingleScreeningAnswer(id, body.questionId, {
      customInstructions: body.customInstructions,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to regenerate answer.' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      item: result.item,
    });
  } catch (error) {
    console.error('Error regenerating answer:', error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Server error regenerating answer.',
      },
      { status: 500 }
    );
  }
}
