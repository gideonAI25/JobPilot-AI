import { getDashboardOverviewData } from '@/services/server/dashboardService';
import { getJobs, getDistinctFilterOptions } from '@/services/server/jobService';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { JobsWorkspace } from '@/components/jobs/JobsWorkspace';

export const instant = false;

export default async function FindJobsPage() {
  const [dashboardData, initialJobs, filterOptions] = await Promise.all([
    getDashboardOverviewData(),
    getJobs(),
    getDistinctFilterOptions(),
  ]);

  return (
    <DashboardShell
      title="Find Jobs"
      subtitle="Browse, filter, inspect and manually track discovered opportunities"
      profile={dashboardData.profile}
      stats={dashboardData.stats}
      notifications={dashboardData.notifications}
    >
      <JobsWorkspace
        initialJobs={initialJobs}
        initialCompanies={filterOptions.companies}
      />
    </DashboardShell>
  );
}
