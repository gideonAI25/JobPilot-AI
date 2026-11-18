import { getDashboardOverviewData } from '@/services/server/dashboardService';
import { getApplications, getApplicationMetrics } from '@/services/server/applicationService';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { ApplicationsWorkspace } from '@/components/applications/ApplicationsWorkspace';

export const instant = false;

export default async function ApplicationsPage() {
  const [dashboardData, initialApplications, metrics] = await Promise.all([
    getDashboardOverviewData(),
    getApplications(),
    getApplicationMetrics(),
  ]);

  return (
    <DashboardShell
      title="Applications"
      subtitle="Review tailored materials, manage approval stages, and track application submissions"
      profile={dashboardData.profile}
      stats={dashboardData.stats}
      notifications={dashboardData.notifications}
    >
      <ApplicationsWorkspace
        initialApplications={initialApplications}
        initialMetrics={metrics}
      />
    </DashboardShell>
  );
}
