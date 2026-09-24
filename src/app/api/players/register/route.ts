import { z } from "zod";
import { withApiHandler, jsonSuccess } from "@/core/api/with-api-handler";
import { registerPlayer } from "@/modules/players/player.service";
import { getCurrentUser } from "@/security/auth/session";

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
  async (request, { requestId }) => {
    const body = await request.json();
    const data = playerSchema.parse(body);
    // Optional — null for anonymous public submissions, unchanged from today.
    const authUser = await getCurrentUser();
    const player = await registerPlayer({ ...data, userId: authUser?.id });
    return jsonSuccess(
      { playerId: player.playerId, status: player.status },
      requestId,
      "Player registration submitted for approval"
    );
  },
  { module: "players", rateLimit: { limit: 20, windowMs: 60000 }, requireCsrf: true }
);
