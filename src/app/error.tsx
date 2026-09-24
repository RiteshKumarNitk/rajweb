"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/shared/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Global application error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <div className="mb-6 rounded-full bg-red-50 p-6">
        <AlertTriangle className="h-12 w-12 text-red-500" />
      </div>
      <h1 className="mb-2 text-3xl font-bold text-primary">Something went wrong!</h1>
      <p className="mb-8 max-w-md text-slate-500">
        We encountered an unexpected error. Please try again or contact support if the issue persists.
      </p>
      <div className="flex gap-4">
        <Button onClick={() => reset()}>Try again</Button>
        <Button variant="outline" onClick={() => window.location.href = "/"}>
          Go to Homepage
        </Button>
      </div>
    </div>
  );
}
