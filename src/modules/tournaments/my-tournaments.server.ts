import type { Prisma } from "@prisma/client";
import prisma from "@/infrastructure/database/prisma";
import { registrationWindow } from "@/modules/tournaments/registration-eligibility";

/**
 * "My Tournaments": the session player's own tournament registrations, with
 * server-side search, filters and pagination — never the whole tournament
 * table, and never another player's entries (the player id always comes from
 * the session).
 */

export const PAGE_SIZES = [10, 20, 25] as const;

export const STATUS_FILTERS: Record<string, string> = {
  "": "All",
  "reg:PENDING": "Entry pending",
  "reg:APPROVED": "Entry approved",
  "reg:REJECTED": "Entry rejected",
  "t:UPCOMING": "Upcoming",
  "t:IN_PROGRESS": "In progress",
  "t:COMPLETED": "Completed",
  "t:CANCELLED": "Cancelled",
};

export interface MyTournamentQuery {
  q: string;
  status: string;
  year: string;
  state: string;
  district: string;
  certificate: "" | "yes" | "no";
  page: number;
  pageSize: number;
}

type Params = Record<string, string | string[] | undefined> | URLSearchParams;

function param(p: Params, key: string): string {
  const v = p instanceof URLSearchParams ? p.get(key) : p[key];
  return (Array.isArray(v) ? v[0] : (v ?? "")).toString().trim();
}

/** Untrusted query string → bounded, known values. */
export function parseMyTournamentQuery(p: Params): MyTournamentQuery {
  const status = param(p, "status");
  const year = param(p, "year");
  const certificate = param(p, "certificate");
  const pageSize = Number(param(p, "pageSize"));
  const page = Math.max(1, Math.min(10_000, Math.floor(Number(param(p, "page")) || 1)));
  return {
    q: param(p, "q").slice(0, 100),
    status: status in STATUS_FILTERS ? status : "",
    year: /^\d{4}$/.test(year) ? year : "",
    state: param(p, "state").slice(0, 40),
    district: param(p, "district").slice(0, 40),
    certificate: certificate === "yes" || certificate === "no" ? certificate : "",
    page,
    pageSize: (PAGE_SIZES as readonly number[]).includes(pageSize) ? pageSize : 10,
  };
}

export function hasFilters(q: MyTournamentQuery): boolean {
  return Boolean(q.q || q.status || q.year || q.state || q.district || q.certificate);
}

function buildWhere(playerId: string, q: MyTournamentQuery): Prisma.TournamentRegistrationWhereInput {
  const tournament: Prisma.TournamentWhereInput = {};
  if (q.q) tournament.OR = [{ name: { contains: q.q, mode: "insensitive" } }, { slug: { contains: q.q.toLowerCase(), mode: "insensitive" } }];
  if (q.status === "t:UPCOMING") tournament.status = { in: ["REGISTRATION_OPEN", "REGISTRATION_CLOSED"] };
  else if (q.status.startsWith("t:")) tournament.status = q.status.slice(2) as Prisma.EnumTournamentStatusFilter["equals"];
  if (q.year) {
    const y = Number(q.year);
    tournament.startDate = { gte: new Date(Date.UTC(y, 0, 1)), lt: new Date(Date.UTC(y + 1, 0, 1)) };
  }
  if (q.state) tournament.stateId = q.state;
  if (q.district) tournament.districtId = q.district;
  if (q.certificate === "yes") tournament.certificates = { some: { playerId, isRevoked: false } };
  if (q.certificate === "no") tournament.certificates = { none: { playerId, isRevoked: false } };

  return {
    playerId,
    ...(q.status.startsWith("reg:") ? { status: q.status.slice(4) as "PENDING" | "APPROVED" | "REJECTED" } : {}),
    tournament,
  };
}

export async function listMyTournaments(playerId: string, q: MyTournamentQuery) {
  const where = buildWhere(playerId, q);
  const [total, registrations, facetRows] = await Promise.all([
    prisma.tournamentRegistration.count({ where }),
    prisma.tournamentRegistration.findMany({
      where,
      select: {
        id: true,
        status: true,
        amount: true,
        registeredAt: true,
        category: { select: { name: true, type: true } },
        tournament: {
          select: {
            id: true,
            name: true,
            slug: true,
            status: true,
            startDate: true,
            endDate: true,
            venue: true,
            city: true,
            registrationStart: true,
            registrationDeadline: true,
            state: { select: { id: true, name: true } },
            district: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: [{ tournament: { startDate: "desc" } }, { registeredAt: "desc" }],
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
    }),
    // Filter options come from this player's own entries only.
    prisma.tournamentRegistration.findMany({
      where: { playerId },
      select: {
        tournament: {
          select: { startDate: true, state: { select: { id: true, name: true } }, district: { select: { id: true, name: true } } },
        },
      },
    }),
  ]);

  const certificates = registrations.length
    ? await prisma.playerCertificate.findMany({
        where: { playerId, isRevoked: false, tournamentId: { in: registrations.map((r) => r.tournament.id) } },
        select: { id: true, tournamentId: true, certificateNumber: true },
      })
    : [];
  const certificateByTournament = new Map(certificates.map((c) => [c.tournamentId, c]));
  const now = new Date();

  const rows = registrations.map((r) => {
    const { opensAt, closesAt } = registrationWindow(r.tournament);
    const registrationWindowLabel =
      r.tournament.status !== "REGISTRATION_OPEN"
        ? "Closed"
        : opensAt && now < opensAt
          ? "Not open yet"
          : closesAt && now >= closesAt
            ? "Closed"
            : "Open";
    const certificate = certificateByTournament.get(r.tournament.id) ?? null;
    return {
      registrationId: r.id,
      registrationStatus: r.status,
      amount: r.amount,
      registeredAt: r.registeredAt,
      category: r.category,
      registrationWindow: registrationWindowLabel,
      tournament: r.tournament,
      code: r.tournament.slug,
      certificate: certificate ? { id: certificate.id, certificateNumber: certificate.certificateNumber } : null,
    };
  });

  const years = [...new Set(facetRows.map((f) => f.tournament.startDate.getUTCFullYear()))].sort((a, b) => b - a);
  type Place = { id: string; name: string };
  const uniq = (items: (Place | null)[]) =>
    [...new Map(items.filter((x): x is Place => Boolean(x)).map((x) => [x.id, x])).values()].sort((a, b) => a.name.localeCompare(b.name));

  return {
    rows,
    total,
    page: q.page,
    pageSize: q.pageSize,
    pages: Math.max(1, Math.ceil(total / q.pageSize)),
    facets: {
      years,
      states: uniq(facetRows.map((f) => f.tournament.state)),
      districts: uniq(facetRows.map((f) => f.tournament.district)),
      registeredCount: facetRows.length,
    },
  };
}

export type MyTournamentList = Awaited<ReturnType<typeof listMyTournaments>>;
