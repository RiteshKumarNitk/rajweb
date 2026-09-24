import { LoadingState } from "@/shared/components/ui/loading-state";

export default function DashboardLoading() {
  return <LoadingState text="Loading your dashboard..." className="min-h-[60vh]" />;
}
