import { z } from "zod";
import { withApiHandler, jsonSuccess, AppError } from "@/core/api/with-api-handler";
import { requireAuth } from "@/security/auth/session";
import prisma from "@/infrastructure/database/prisma";
import { createRequest } from "@/modules/requests/request.service";
import { createAuditLog } from "@/services/audit/audit-service";
import { REQUEST_TYPES } from "@/modules/requests/request-types";

const requestSchema = z.object({
  profileType: z.enum(["player", "coach"]),
  type: z.enum(REQUEST_TYPES),
  reason: z.string().min(10).max(1000),
  currentValue: z.string().max(500).optional(),
  requestedValue: z.string().max(500).optional(),
  requestedMobile: z.string().min(10).max(20).optional(),
  requestedEmail: z.string().email().max(254).optional(),
  requestedAddress: z.string().max(500).optional(),
  requestedDistrict: z.string().max(100).optional(),
});

export const POST = withApiHandler(
  async (request, { requestId }) => {
    const authUser = await requireAuth();
    const body = await request.json();
    const data = requestSchema.parse(body);

    // Ownership is derived from the session, never a client-supplied
    // playerId/coachId — the caller can only ever attach a request to
    // *their own* Player or Coach profile.
    const profile =
      data.profileType === "player"
        ? await prisma.player.findUnique({ where: { userId: authUser.id } })
        : await prisma.coach.findUnique({ where: { userId: authUser.id } });

    if (!profile) {
      throw AppError.notFound(
        data.profileType === "player"
          ? "You do not have a player registration to attach this request to"
          : "You do not have a coach registration to attach this request to"
      );
    }

    const created = await createRequest({
      userId: authUser.id,
      playerId: data.profileType === "player" ? profile.id : undefined,
      coachId: data.profileType === "coach" ? profile.id : undefined,
      type: data.type,
      reason: data.reason,
      currentValue: data.currentValue,
      requestedValue: data.requestedValue,
      requestedMobile: data.requestedMobile,
      requestedEmail: data.requestedEmail,
      requestedAddress: data.requestedAddress,
      requestedDistrictName: data.requestedDistrict,
    });

    await createAuditLog({
      userId: authUser.id,
      action: "CREATE",
      module: "requests",
      entityId: created.id,
      details: { event: "REQUEST_CREATED", type: data.type, profileType: data.profileType },
    });

    return jsonSuccess(
      { requestNumber: created.requestNumber, status: created.status },
      requestId,
      "Request submitted"
    );
  },
  { module: "requests-create", rateLimit: { limit: 20, windowMs: 60000 }, requireCsrf: true }
);
