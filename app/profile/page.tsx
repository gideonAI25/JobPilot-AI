import { getDashboardOverviewData } from '@/services/server/dashboardService';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { ProfileWorkspace } from '@/components/profile/ProfileWorkspace';

export const instant = false;

export default async function ProfilePage() {
  const data = await getDashboardOverviewData();

  return (
    <DashboardShell
      title="My Profile"
      subtitle="Verified professional source of truth for AI evaluation"
      profile={data.profile}
      stats={data.stats}
      notifications={data.notifications}
    >
      <ProfileWorkspace />
    </DashboardShell>
  );
}
