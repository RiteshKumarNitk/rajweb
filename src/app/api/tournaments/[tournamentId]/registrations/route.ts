import { z } from "zod";
import { withApiHandler, jsonSuccess, AppError } from "@/core/api/with-api-handler";
import { requireAuth } from "@/security/auth/session";
import { registerForTournament } from "@/modules/tournaments/registration.service";

const registrationSchema = z.object({
  categoryId: z.string().min(1),
});

export const POST = withApiHandler(
  async (request, { requestId, params }) => {
    const user = await requireAuth();
    const tournamentId = params?.tournamentId as string | undefined;
    if (!tournamentId) throw AppError.badRequest("Tournament ID is required");

    const body = registrationSchema.parse(await request.json());
    const registration = await registerForTournament(user.id, tournamentId, body.categoryId);

    return jsonSuccess(
      { registration },
      requestId,
      `Registered for ${registration.tournamentName}`
    );
  },
  { module: "tournament-registrations", requireCsrf: true, rateLimit: { limit: 20, windowMs: 60000 } }
);
