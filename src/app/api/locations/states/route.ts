import prisma from "@/infrastructure/database/prisma";
import { withApiHandler, jsonSuccess } from "@/core/api/with-api-handler";

/** Active states that have at least one active district — for State pickers. */
export const GET = withApiHandler(
  async (_request, { requestId }) => {
    const states = await prisma.state.findMany({
      where: { isActive: true, districts: { some: { isActive: true } } },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    });
    return jsonSuccess(states, requestId);
  },
  { module: "locations", rateLimit: { limit: 120, windowMs: 60000 } }
);
