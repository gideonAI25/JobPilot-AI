import { NextRequest, NextResponse } from 'next/server';
import { executeDiscovery, adapterRegistry } from '@/services/discovery';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const [latestRuns, sources] = await Promise.all([
      prisma.automationRun.findMany({
        where: { runType: 'DISCOVERY' },
        orderBy: { startTime: 'desc' },
        take: 10,
        include: {
          activityLogs: {
            take: 5,
            orderBy: { createdAt: 'desc' },
          },
        },
      }),
      prisma.jobSource.findMany({
        orderBy: { name: 'asc' },
      }),
    ]);

    const registeredAdapters = adapterRegistry.getAll().map((a) => a.metadata);

    return NextResponse.json({
      success: true,
      latestRuns,
      sources,
      registeredAdapters,
    });
  } catch (error) {
    console.error('Failed to retrieve discovery status:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Database error fetching discovery status',
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const report = await executeDiscovery(undefined, body.options);

    return NextResponse.json({
      success: true,
      report,
    });
  } catch (error) {
    console.error('Failed to execute job discovery:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error executing discovery run',
      },
      { status: 500 }
    );
  }
}
