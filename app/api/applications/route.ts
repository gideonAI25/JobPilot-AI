import { NextRequest, NextResponse } from 'next/server';
import {
  getApplications,
  createApplicationForJob,
  getApplicationMetrics,
} from '@/services/server/applicationService';
import { ApplicationFilterParams, ApplicationStatus } from '@/types/application';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    // If caller wants metrics overview only
    if (searchParams.get('metricsOnly') === 'true') {
      const metrics = await getApplicationMetrics();
      return NextResponse.json({ success: true, metrics });
    }

    const filters: ApplicationFilterParams = {
      search: searchParams.get('search') || undefined,
      status: (searchParams.get('status') as ApplicationStatus | 'ALL') || undefined,
      eligibility: searchParams.get('eligibility') || undefined,
      minScore: searchParams.get('minScore')
        ? parseInt(searchParams.get('minScore')!, 10)
        : undefined,
    };

    const [applications, metrics] = await Promise.all([
      getApplications(filters),
      getApplicationMetrics(),
    ]);

    return NextResponse.json({
      success: true,
      applications,
      count: applications.length,
      metrics,
    });
  } catch (error) {
    console.error('Failed to get applications:', error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Database error fetching applications.',
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.jobId) {
      return NextResponse.json(
        { success: false, error: 'Job ID is required.' },
        { status: 400 }
      );
    }

    const result = await createApplicationForJob({
      jobId: body.jobId,
      status: body.status,
      notes: body.notes,
    });

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
    console.error('Failed to create application:', error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Database error creating application.',
      },
      { status: 500 }
    );
  }
}
