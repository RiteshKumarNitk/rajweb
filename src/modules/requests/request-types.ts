export const REQUEST_TYPES = [
  "PROFILE_CORRECTION",
  "CONTACT_UPDATE",
  "ADDRESS_UPDATE",
  "DISTRICT_CHANGE",
  "CERTIFICATE_REQUEST",
  "CERTIFICATE_CORRECTION",
  "DOCUMENT_UPDATE",
  "OTHER",
] as const;

export type RequestTypeValue = (typeof REQUEST_TYPES)[number];

export const REQUEST_TYPE_LABELS: Record<RequestTypeValue, string> = {
  PROFILE_CORRECTION: "Profile Correction",
  CONTACT_UPDATE: "Contact Update",
  ADDRESS_UPDATE: "Address Update",
  DISTRICT_CHANGE: "District Change",
  CERTIFICATE_REQUEST: "Certificate Request",
  CERTIFICATE_CORRECTION: "Certificate Correction",
  DOCUMENT_UPDATE: "Document Update",
  OTHER: "Other",
};

export const REQUEST_TYPE_DESCRIPTIONS: Record<RequestTypeValue, string> = {
  PROFILE_CORRECTION: "Fix an error in your name, date of birth, gender, or playing category.",
  CONTACT_UPDATE: "Update your registered mobile number or email address.",
  ADDRESS_UPDATE: "Update your residential address on file.",
  DISTRICT_CHANGE: "Request to move your registration to a different district.",
  CERTIFICATE_REQUEST: "Request a certificate for your approved registration.",
  CERTIFICATE_CORRECTION: "Report an error on an already-issued certificate.",
  DOCUMENT_UPDATE: "Submit or update a supporting document.",
  OTHER: "Anything else RRA administration needs to help with.",
};

/**
 * Types whose approval safely auto-applies to the underlying record because
 * the target field genuinely exists and the change is unambiguous once an
 * admin has reviewed it. Everything else is informational-only on approval —
 * see request.service.ts for the exact per-type behavior this drives.
 */
export const AUTO_APPLY_REQUEST_TYPES: RequestTypeValue[] = ["CONTACT_UPDATE", "DISTRICT_CHANGE", "ADDRESS_UPDATE"];
