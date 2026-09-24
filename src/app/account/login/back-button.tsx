"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export function BackButton({ inline }: { inline?: boolean }) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.push("/")}
      aria-label="Back to website"
      className={cn(
        "flex h-10 w-10 items-center justify-center rounded-full transition-all",
        inline
          ? "text-primary hover:bg-slate-100"
          : "absolute left-6 top-6 z-10 bg-black/20 text-white backdrop-blur-sm hover:bg-black/30"
      )}
    >
      <ArrowLeft className="h-5 w-5" />
    </button>
  );
}
