import { NextRequest, NextResponse } from 'next/server';
import { getJobs, createManualJob, getDistinctFilterOptions } from '@/services/server/jobService';
import { JobFilterParams } from '@/types/job';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    // If options query requested
    if (searchParams.get('options') === 'true') {
      const options = await getDistinctFilterOptions();
      return NextResponse.json({ success: true, options });
    }

    const filters: JobFilterParams = {
      search: searchParams.get('search') || undefined,
      company: searchParams.get('company') || undefined,
      workArrangement: searchParams.get('workArrangement') || undefined,
      employmentType: searchParams.get('employmentType') || undefined,
      experienceLevel: searchParams.get('experienceLevel') || undefined,
      minScore: searchParams.get('minScore') ? parseInt(searchParams.get('minScore')!, 10) : undefined,
      eligibility: searchParams.get('eligibility') || undefined,
    };

    const jobs = await getJobs(filters);
    return NextResponse.json({
      success: true,
      jobs,
      count: jobs.length,
    });
  } catch (error) {
    console.error('Failed to get jobs:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Database error fetching jobs',
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const result = await createManualJob(body);
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      job: result.job,
      isIncomplete: result.isIncomplete,
    });
  } catch (error) {
    console.error('Failed to add job:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Database error creating job',
      },
      { status: 500 }
    );
  }
}
