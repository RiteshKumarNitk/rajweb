import { LoadingState } from "@/shared/components/ui/loading-state";

export default function ProfileLoading() {
  return <LoadingState text="Loading your profile..." className="min-h-[60vh]" />;
}
