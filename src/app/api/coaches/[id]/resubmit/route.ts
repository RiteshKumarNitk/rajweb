import { z } from "zod";
import { withApiHandler, jsonSuccess, AppError } from "@/core/api/with-api-handler";
import { requireAuth } from "@/security/auth/session";
import { resubmitCoach } from "@/modules/coaches/coach.service";
import { createAuditLog } from "@/services/audit/audit-service";
import prisma from "@/infrastructure/database/prisma";

const coachSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email().max(254),
  mobile: z.string().min(10).max(20),
  qualification: z.string().min(2).max(500),
  certificationLevel: z.enum(["LEVEL_1", "LEVEL_2", "LEVEL_3", "INTERNATIONAL"]),
  district: z.string().min(1).max(100),
});

export const POST = withApiHandler(
  async (request, { requestId, params }) => {
    const authUser = await requireAuth();
    const id = params?.id as string | undefined;
    if (!id) throw AppError.badRequest("Coach ID is required");

    const coach = await prisma.coach.findUnique({ where: { id } });
    if (!coach || coach.userId !== authUser.id) {
      throw AppError.notFound("Coach application not found");
    }

    const body = await request.json();
    const data = coachSchema.parse(body);

    const updated = await resubmitCoach(id, data);

    await createAuditLog({
      userId: authUser.id,
      action: "UPDATE",
      module: "coaches",
      entityId: id,
      details: { event: "APPLICATION_RESUBMITTED" },
    });

    return jsonSuccess(
      { coachId: updated.coachId, status: updated.status },
      requestId,
      "Application resubmitted for approval"
    );
  },
  { module: "coaches-resubmit", rateLimit: { limit: 10, windowMs: 60000 }, requireCsrf: true }
);
