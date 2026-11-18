import { notFound } from 'next/navigation';
import { getDashboardOverviewData } from '@/services/server/dashboardService';
import { getApplicationById } from '@/services/server/applicationService';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { ApplicationDetailView } from '@/components/applications/ApplicationDetailView';

export const instant = false;

export default async function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [dashboardData, application] = await Promise.all([
    getDashboardOverviewData(),
    getApplicationById(id),
  ]);

  if (!application) {
    notFound();
  }

  return (
    <DashboardShell
      title="Application Detail"
      subtitle={`${application.jobTitle} at ${application.company}`}
      profile={dashboardData.profile}
      stats={dashboardData.stats}
      notifications={dashboardData.notifications}
    >
      <ApplicationDetailView initialApplication={application} />
    </DashboardShell>
  );
}
