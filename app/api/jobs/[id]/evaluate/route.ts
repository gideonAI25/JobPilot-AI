import { NextRequest, NextResponse } from 'next/server';
import { evaluateJob, getJobEvaluation } from '@/services/evaluation';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const evaluation = await getJobEvaluation(id);

    if (!evaluation) {
      return NextResponse.json(
        { success: false, error: 'No evaluation found for this job.' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, evaluation });
  } catch (error) {
    console.error('Failed to get job evaluation:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error fetching evaluation',
      },
      { status: 500 }
    );
  }
}

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

    const result = await evaluateJob(id, {
      weights: body.weights,
      forceReevaluate: Boolean(body.forceReevaluate),
      aiProviderId: body.aiProviderId,
    });

    return NextResponse.json({
      success: true,
      evaluation: result,
    });
  } catch (error) {
    console.error('Failed to evaluate job:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error evaluating job',
      },
      { status: 500 }
    );
  }
}
