export const REQUIRED_PROFILE_FIELDS = ["name", "phone", "address", "city", "state", "pincode"] as const;

export type RequiredProfileField = (typeof REQUIRED_PROFILE_FIELDS)[number];

export const PROFILE_FIELD_LABELS: Record<RequiredProfileField, string> = {
  name: "Name",
  phone: "Mobile Number",
  address: "Address",
  city: "City",
  state: "State",
  pincode: "Pincode",
};

interface CompletionInput {
  name: string;
  phone?: string | null;
  profile?: {
    address?: string | null;
    city?: string | null;
    state?: string | null;
    pincode?: string | null;
  } | null;
}

export interface ProfileCompletion {
  percent: number;
  missing: RequiredProfileField[];
}

/**
 * Completion is always computed from the actual data, never stored as an
 * editable number — this is the single place that definition lives, reused
 * by the dashboard, the profile page, and GET /api/account/profile.
 */
export function calculateProfileCompletion(input: CompletionInput): ProfileCompletion {
  const values: Record<RequiredProfileField, string | null | undefined> = {
    name: input.name,
    phone: input.phone,
    address: input.profile?.address,
    city: input.profile?.city,
    state: input.profile?.state,
    pincode: input.profile?.pincode,
  };

  const missing = REQUIRED_PROFILE_FIELDS.filter((field) => !values[field]?.trim());
  const percent = Math.round(
    ((REQUIRED_PROFILE_FIELDS.length - missing.length) / REQUIRED_PROFILE_FIELDS.length) * 100
  );

  return { percent, missing };
}
