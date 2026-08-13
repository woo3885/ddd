import F1_Dashboard from '@/features/F1_Dashboard/ui/F1_Dashboard';
import { defaultDashboardSessionClient } from '@/features/F1_Dashboard/api/dashboard-session-client';
import { createDashboardSessionRequest } from '@/features/F1_Dashboard/model/create-dashboard-session-request';
import type { DashboardStartSelection } from '@/features/F1_Dashboard/model/dashboard-session';
import SessionFramePreview from '@/features/Integration/ui/SessionFramePreview';

export function shouldRenderSessionFramePreview(
  search: string,
  isDevelopment: boolean
): boolean {
  return isDevelopment && search === '?preview=session-frame';
}

export default function App() {
  if (
    shouldRenderSessionFramePreview(
      window.location.search,
      import.meta.env.DEV
    )
  ) {
    return <SessionFramePreview />;
  }

  const handleStart = (selection: DashboardStartSelection) => {
    const request = createDashboardSessionRequest(selection);

    return defaultDashboardSessionClient.createSession(request);
  };

  return (
    <div className="min-h-screen bg-slate-200 p-3 sm:p-6">
      <div className="mx-auto max-w-[1280px]">
        <F1_Dashboard onStart={handleStart} />
      </div>
    </div>
  );
}
