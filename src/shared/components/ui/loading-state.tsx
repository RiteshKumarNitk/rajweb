import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function LoadingSpinner({ className }: { className?: string }) {
  return <Loader2 className={cn("h-6 w-6 animate-spin text-primary", className)} />;
}

export function LoadingState({ text = "Loading...", className }: { text?: string; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center p-12 text-slate-500", className)}>
      <LoadingSpinner className="mb-4 h-8 w-8 text-slate-400" />
      <p className="text-sm font-medium">{text}</p>
    </div>
  );
}
