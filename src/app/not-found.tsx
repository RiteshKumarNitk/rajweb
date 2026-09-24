"use client";

import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { Button } from "@/shared/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <div className="mb-6 rounded-full bg-slate-100 p-6">
        <FileQuestion className="h-12 w-12 text-slate-400" />
      </div>
      <h1 className="mb-2 text-3xl font-bold text-primary">Page Not Found</h1>
      <p className="mb-8 max-w-md text-slate-500">
        We couldn't find the page you were looking for. It might have been moved or deleted.
      </p>
      <Button asChild>
        <Link href="/">Return to Homepage</Link>
      </Button>
    </div>
  );
}
