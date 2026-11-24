import { NextRequest, NextResponse } from 'next/server';
import { selectOpportunitiesForPreparation } from '@/services/selection';

export async function POST(req: NextRequest) {
  try {
    let body: any = {};
    try {
      body = await req.json();
    } catch {}

    const result = await selectOpportunitiesForPreparation({
      config: {
        maxSelectionLimit: body.maxSelectionLimit,
        minMatchScore: body.minMatchScore,
      },
      trigger: body.trigger || 'MANUAL',
    });

    return NextResponse.json({
      success: true,
      selectionResult: result,
    });
  } catch (error) {
    console.error('Failed to run opportunity selection:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error selecting opportunities',
      },
      { status: 500 }
    );
  }
}
