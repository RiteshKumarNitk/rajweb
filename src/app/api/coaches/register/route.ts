import { z } from "zod";
import { withApiHandler, jsonSuccess } from "@/core/api/with-api-handler";
import { generateId } from "@/lib/utils";
import { sanitizeEmail, sanitizePhone, sanitizeText } from "@/security/sanitize";
import prisma from "@/infrastructure/database/prisma";
import { getCurrentUser } from "@/security/auth/session";
import type { CertificationLevel } from "@prisma/client";
import {
  applicationLocationFields,
  hasApplicationDistrict,
  resolveApplicationDistrict,
} from "@/modules/districts/registration-locations.server";
import { duplicateApplicationError } from "@/modules/applications/duplicate-application";
import { withRegistrationChoice } from "@/modules/applications/registration-choice.server";
import { governmentIdFields, resolveGovernmentId, scopeGovernmentIdDocument } from "@/modules/applications/government-id";

const coachSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email().max(254),
  mobile: z.string().min(10).max(20),
  qualification: z.string().min(2).max(500),
  certificationLevel: z.enum(["LEVEL_1", "LEVEL_2", "LEVEL_3", "INTERNATIONAL"]),
  ...applicationLocationFields,
  ...governmentIdFields,
}).refine(hasApplicationDistrict, { message: "Select your district", path: ["districtId"] });

export const POST = withApiHandler(
  async (request, { requestId }) => {
    const body = await request.json();
    const data = coachSchema.parse(body);

    // Owning state is decided by the district, validated server-side against the submitted state.
    const { districtId, stateId } = await resolveApplicationDistrict(data);
    const record = {
      coachId: generateId("CCH"),
      name: sanitizeText(data.name),
      email: sanitizeEmail(data.email),
      mobile: sanitizePhone(data.mobile),
      qualification: sanitizeText(data.qualification),
      certificationLevel: data.certificationLevel as CertificationLevel,
      districtId,
      status: "PENDING" as const,
    };

    // Account applications: one registration per account, Government ID required.
    const userId = (await getCurrentUser())?.id || null;
    const coach = userId
      ? await withRegistrationChoice(userId, "coach", async (tx) => {
          const existing = await tx.coach.findUnique({ where: { userId }, select: { status: true } });
          if (existing) throw duplicateApplicationError("coach", existing.status);
          const governmentId = await resolveGovernmentId(tx, data, { userId });
          const created = await tx.coach.create({ data: { ...record, ...governmentId, userId } });
          await scopeGovernmentIdDocument(tx, governmentId.governmentIdDocumentId, { stateId, districtId });
          return created;
        })
      : await prisma.coach.create({ data: record });

    return jsonSuccess(
      { coachId: coach.coachId },
      requestId,
      "Coach registration submitted for approval"
    );
  },
  { module: "coaches", rateLimit: { limit: 20, windowMs: 60000 }, requireCsrf: true }
);
