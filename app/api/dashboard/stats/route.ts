import { NextResponse } from 'next/server';
import { getDashboardOverviewData } from '@/services/server/dashboardService';

export async function GET() {
  try {
    const data = await getDashboardOverviewData();
    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Failed to load dashboard overview data:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Database error loading dashboard stats',
      },
      { status: 500 }
    );
  }
}
