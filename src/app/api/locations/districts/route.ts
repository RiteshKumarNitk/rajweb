import prisma from "@/infrastructure/database/prisma";
import { withApiHandler, jsonSuccess, AppError } from "@/core/api/with-api-handler";

/** Active districts of ONE state (`?stateId=`). The relationship is enforced here, not in the browser. */
export const GET = withApiHandler(
  async (request, { requestId }) => {
    const stateId = request.nextUrl.searchParams.get("stateId")?.trim();
    if (!stateId) throw AppError.badRequest("stateId is required");

    const state = await prisma.state.findFirst({ where: { id: stateId, isActive: true }, select: { id: true } });
    if (!state) throw AppError.notFound("State not found");

    const districts = await prisma.district.findMany({
      where: { stateId: state.id, isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    });
    return jsonSuccess(districts, requestId);
  },
  { module: "locations", rateLimit: { limit: 120, windowMs: 60000 } }
);
