import { toast } from "sonner";

/** Public site is static-only until admin portal is delivered to the client. */
export const STATIC_RELEASE = {
  badge: "Coming Soon",
  title: "Website Under Development",
  summary:
    "This feature is not available in the current static release. The admin portal and backend workflows are still in development.",
  detail:
    "Rajasthan Racquetball Association is launching an informational website first. Online registrations, verifications, donations, and admin access will be enabled in a future update once the full platform is deployed. Please use Contact Us for inquiries in the meantime.",
} as const;

export function notifyFeatureComingSoon(featureLabel: string) {
  toast.info(STATIC_RELEASE.title, {
    description: `${featureLabel} — ${STATIC_RELEASE.detail}`,
    duration: 9000,
  });
}

/** Returns true when submit should be blocked (static release mode). */
export function blockSubmitForStaticRelease(featureLabel: string): boolean {
  if (!isStaticReleaseMode()) return false;
  notifyFeatureComingSoon(featureLabel);
  return true;
}

export function isStaticReleaseMode(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_LIVE_FORMS !== "true";
}

/** Server-side: skip DB/API work for static public release. */
export function isStaticSiteRelease(): boolean {
  return isStaticReleaseMode();
}
