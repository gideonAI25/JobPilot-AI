import { NextRequest, NextResponse } from 'next/server';
import {
  getApplicationById,
  transitionApplicationStatus,
} from '@/services/server/applicationService';
import { ApplicationStatusTransitionInput } from '@/types/application';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const application = await getApplicationById(id);

    if (!application) {
      return NextResponse.json(
        { success: false, error: 'Application not found.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      application,
    });
  } catch (error) {
    console.error('Failed to get application:', error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Database error fetching application details.',
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body: ApplicationStatusTransitionInput = await req.json();

    if (!body.targetStatus) {
      return NextResponse.json(
        { success: false, error: 'targetStatus is required for status transition.' },
        { status: 400 }
      );
    }

    const result = await transitionApplicationStatus(id, body);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      application: result.application,
    });
  } catch (error) {
    console.error('Failed to transition application status:', error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Database error updating application status.',
      },
      { status: 500 }
    );
  }
}
