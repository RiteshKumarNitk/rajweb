import { withApiHandler, jsonSuccess } from "@/core/api/with-api-handler";
import { requireAuth } from "@/security/auth/session";
import { getOwnPlayer } from "@/modules/players/own-player.server";
import { listMyTournaments, parseMyTournamentQuery } from "@/modules/tournaments/my-tournaments.server";

/**
 * GET — the signed-in player's own tournament entries (search, filters,
 * pagination via the query string). The player comes from the session; any
 * userId/playerId in the query is ignored.
 */
export const GET = withApiHandler(
  async (request, { requestId }) => {
    const user = await requireAuth();
    const query = parseMyTournamentQuery(new URL(request.url).searchParams);
    const player = await getOwnPlayer(user.id);
    if (!player) {
      return jsonSuccess({ rows: [], total: 0, page: query.page, pageSize: query.pageSize, pages: 1 }, requestId);
    }
    const list = await listMyTournaments(player.id, query);
    return jsonSuccess(
      {
        rows: list.rows.map((r) => ({
          registrationId: r.registrationId,
          registrationStatus: r.registrationStatus,
          amount: r.amount,
          registeredAt: r.registeredAt,
          category: r.category?.name ?? null,
          registrationWindow: r.registrationWindow,
          tournament: {
            id: r.tournament.id,
            name: r.tournament.name,
            code: r.code,
            status: r.tournament.status,
            startDate: r.tournament.startDate,
            endDate: r.tournament.endDate,
            venue: [r.tournament.venue, r.tournament.city].filter(Boolean).join(", ") || null,
            state: r.tournament.state?.name ?? null,
            district: r.tournament.district?.name ?? null,
          },
          certificate: r.certificate,
        })),
        total: list.total,
        page: list.page,
        pageSize: list.pageSize,
        pages: list.pages,
      },
      requestId
    );
  },
  { module: "account-tournaments", rateLimit: { limit: 60, windowMs: 60000 } }
);
