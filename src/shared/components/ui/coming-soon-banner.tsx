import { Construction } from "lucide-react";
import { STATIC_RELEASE } from "@/shared/lib/static-release";

type ComingSoonBannerProps = {
  feature?: string;
};

export function ComingSoonBanner({ feature }: ComingSoonBannerProps) {
  return (
    <div
      role="status"
      className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 sm:px-5"
    >
      <div className="flex gap-3">
        <Construction className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden />
        <div className="space-y-1.5 text-sm text-amber-950">
          <p className="font-semibold">
            <span className="mr-2 inline-flex rounded-full bg-amber-200/80 px-2 py-0.5 text-xs uppercase tracking-wide text-amber-900">
              {STATIC_RELEASE.badge}
            </span>
            {feature ? `${feature} — ` : ""}
            {STATIC_RELEASE.summary}
          </p>
          <p className="leading-relaxed text-amber-900/85">{STATIC_RELEASE.detail}</p>
        </div>
      </div>
    </div>
  );
}
