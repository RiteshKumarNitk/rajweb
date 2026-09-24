import prisma from "@/infrastructure/database/prisma";
import { withApiHandler, jsonSuccess, AppError } from "@/core/api/with-api-handler";
import { requireAuth } from "@/security/auth/session";

export const GET = withApiHandler(
  async (_request, { requestId }) => {
    const authUser = await requireAuth();

    // Indexed primary-key lookup — the only extra query this route makes,
    // for the display fields the JWT session deliberately doesn't carry.
    const user = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        authProvider: true,
        createdAt: true,
        lastLoginAt: true,
      },
    });

    if (!user) throw AppError.notFound("User not found");

    return jsonSuccess(user, requestId);
  },
  { module: "account-me" }
);
