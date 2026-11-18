import { getDashboardOverviewData } from '@/services/server/dashboardService';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { OverviewView } from '@/components/dashboard/OverviewView';

export const instant = false;

export default async function OverviewPage() {
  const data = await getDashboardOverviewData();

  return (
    <DashboardShell
      title="Overview"
      subtitle="Job discovery & application pipeline summary"
      profile={data.profile}
      stats={data.stats}
      notifications={data.notifications}
    >
      <OverviewView data={data} />
    </DashboardShell>
  );
}
