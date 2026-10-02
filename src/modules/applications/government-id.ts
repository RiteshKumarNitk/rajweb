import { z } from "zod";
import type { GovernmentIdType, Prisma } from "@prisma/client";
import { AppError } from "@/core/errors/app-error";

export const GOVERNMENT_ID_TYPES = ["AADHAAR", "PAN", "PASSPORT", "VOTER_ID", "DRIVING_LICENCE"] as const;

export const GOVERNMENT_ID_LABELS: Record<GovernmentIdType, string> = {
  AADHAAR: "Aadhaar Card",
  PAN: "PAN Card",
  PASSPORT: "Passport",
  VOTER_ID: "Voter ID",
  DRIVING_LICENCE: "Driving Licence",
};

/** Number format per document type, checked after removing spaces/hyphens and upper-casing. */
const FORMATS: Record<GovernmentIdType, { pattern: RegExp; hint: string }> = {
  AADHAAR: { pattern: /^[2-9]\d{11}$/, hint: "12 digits" },
  PAN: { pattern: /^[A-Z]{5}\d{4}[A-Z]$/, hint: "e.g. ABCDE1234F" },
  PASSPORT: { pattern: /^[A-Z]\d{7}$/, hint: "a letter followed by 7 digits" },
  VOTER_ID: { pattern: /^[A-Z]{3}\d{7}$/, hint: "3 letters followed by 7 digits" },
  DRIVING_LICENCE: { pattern: /^[A-Z]{2}\d{2}[A-Z0-9]{9,14}$/, hint: "state code, RTO code and number, e.g. RJ14 20110012345" },
};

export function normalizeGovernmentIdNumber(value: string): string {
  return value.replace(/[\s-]+/g, "").toUpperCase();
}

/** "XXXX XXXX 1234" style: only the last four characters are ever shown. */
export function maskGovernmentIdNumber(value: string | null | undefined): string | null {
  if (!value) return null;
  return `${"•".repeat(Math.max(0, value.length - 4))}${value.slice(-4)}`;
}

/** For admin tables: label, masked number and document URL — never the full number. */
export function governmentIdCell(record: {
  governmentIdType: GovernmentIdType | null;
  governmentIdNumber: string | null;
  governmentIdDocumentId: string | null;
}) {
  if (!record.governmentIdType) return null;
  return {
    label: GOVERNMENT_ID_LABELS[record.governmentIdType],
    masked: maskGovernmentIdNumber(record.governmentIdNumber),
    url: record.governmentIdDocumentId ? `/api/media/${record.governmentIdDocumentId}` : null,
  };
}

/** Fields an application form sends. All three are required on a new account application. */
export const governmentIdFields = {
  governmentIdType: z.enum(GOVERNMENT_ID_TYPES).optional(),
  governmentIdNumber: z.string().max(40).optional(),
  governmentIdDocumentId: z.string().min(10).max(40).optional(),
};

export interface GovernmentIdInput {
  governmentIdType?: GovernmentIdType;
  governmentIdNumber?: string;
  governmentIdDocumentId?: string;
}

export interface GovernmentIdValues {
  governmentIdType: GovernmentIdType;
  governmentIdNumber: string;
  governmentIdDocumentId: string;
}

/**
 * Validates the submitted Government ID, falling back to the values already
 * on the record (a resubmission may keep the number or the document). The
 * result must be complete. A new document must be a GOVERNMENT_ID file the
 * same account uploaded and not attached to any other application.
 */
export async function resolveGovernmentId(
  tx: Prisma.TransactionClient,
  input: GovernmentIdInput,
  opts: { userId: string; existing?: Partial<Record<keyof GovernmentIdValues, string | null>> | null }
): Promise<GovernmentIdValues> {
  const type = (input.governmentIdType ?? opts.existing?.governmentIdType ?? null) as GovernmentIdType | null;
  const typeChanged = Boolean(input.governmentIdType && input.governmentIdType !== opts.existing?.governmentIdType);
  const rawNumber = input.governmentIdNumber?.trim()
    ? input.governmentIdNumber
    : typeChanged
      ? null
      : (opts.existing?.governmentIdNumber ?? null);
  const documentId = input.governmentIdDocumentId ?? opts.existing?.governmentIdDocumentId ?? null;

  if (!type) throw AppError.validation("Select your Government ID type");
  if (!rawNumber) throw AppError.validation("Enter your Government ID number");
  if (!documentId) throw AppError.validation("Upload your Government ID document");

  const number = normalizeGovernmentIdNumber(rawNumber);
  const format = FORMATS[type];
  if (!format.pattern.test(number)) {
    throw AppError.validation(`Enter a valid ${GOVERNMENT_ID_LABELS[type]} number (${format.hint})`);
  }

  if (input.governmentIdDocumentId && input.governmentIdDocumentId !== opts.existing?.governmentIdDocumentId) {
    const asset = await tx.mediaAsset.findUnique({
      where: { id: input.governmentIdDocumentId },
      select: {
        kind: true,
        uploadedById: true,
        playerGovernmentIds: { select: { id: true }, take: 1 },
        coachGovernmentIds: { select: { id: true }, take: 1 },
      },
    });
    // Someone else's file, another kind of file, or one already in use: same answer as missing.
    if (!asset || asset.kind !== "GOVERNMENT_ID" || asset.uploadedById !== opts.userId || asset.playerGovernmentIds.length || asset.coachGovernmentIds.length) {
      throw AppError.validation("Upload your Government ID document again");
    }
  }

  return { governmentIdType: type, governmentIdNumber: number, governmentIdDocumentId: documentId };
}

/** Puts the attached document in the application's district scope (who may review it). */
export async function scopeGovernmentIdDocument(
  tx: Prisma.TransactionClient,
  documentId: string,
  owner: { stateId: string; districtId: string }
) {
  await tx.mediaAsset.update({ where: { id: documentId }, data: { stateId: owner.stateId, districtId: owner.districtId } });
}
