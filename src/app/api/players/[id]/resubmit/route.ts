import { z } from "zod";
import { withApiHandler, jsonSuccess, AppError } from "@/core/api/with-api-handler";
import { requireAuth } from "@/security/auth/session";
import { resubmitPlayer } from "@/modules/players/player.service";
import { createAuditLog } from "@/services/audit/audit-service";
import prisma from "@/infrastructure/database/prisma";

const playerSchema = z.object({
  name: z.string().min(2).max(100),
  dateOfBirth: z.string(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]),
  email: z.string().email().max(254),
  mobile: z.string().min(10).max(20),
  district: z.string().min(1).max(100),
  category: z.string().max(50).optional(),
});

export const POST = withApiHandler(
  async (request, { requestId, params }) => {
    const authUser = await requireAuth();
    const id = params?.id as string | undefined;
    if (!id) throw AppError.badRequest("Player ID is required");

    // Ownership is verified against the session, never a client-supplied
    // userId — the record must belong to the caller and only a REJECTED
    // application may be corrected and resubmitted.
    const player = await prisma.player.findUnique({ where: { id } });
    if (!player || player.userId !== authUser.id) {
      throw AppError.notFound("Player application not found");
    }

    const body = await request.json();
    const data = playerSchema.parse(body);

    const updated = await resubmitPlayer(id, data);

    await createAuditLog({
      userId: authUser.id,
      action: "UPDATE",
      module: "players",
      entityId: id,
      details: { event: "APPLICATION_RESUBMITTED" },
    });

    return jsonSuccess(
      { playerId: updated.playerId, status: updated.status },
      requestId,
      "Application resubmitted for approval"
    );
  },
  { module: "players-resubmit", rateLimit: { limit: 10, windowMs: 60000 }, requireCsrf: true }
);
