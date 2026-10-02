import prisma from "@/infrastructure/database/prisma";

export type MemberTypeValue = "PLAYER" | "COACH" | "SUPPORTER";

export const MEMBER_TYPE_LABELS: Record<MemberTypeValue, string> = {
  PLAYER: "Player",
  COACH: "Coach",
  SUPPORTER: "Supporter / Parent",
};

/** A member's home State/District — what their equipment catalog and orders are scoped to. */
export interface MemberHome {
  stateId: string | null;
  stateName: string | null;
  districtId: string | null;
  districtName: string | null;
  memberType: MemberTypeValue | null;
  /** Where the home district comes from: the Player or Coach application, or a legacy profile home. */
  source: "profile" | "player" | "coach" | null;
  /** Player/Coach ID when the member has one. */
  memberId: string | null;
  playerStatus: string | null;
  coachStatus: string | null;
  /** True once a home district is known; without one the member sees the central catalog only. */
  hasDistrict: boolean;
}

/**
 * Resolves the member's home scope server-side. Sign-in never asks for it:
 * the State/District comes from the member's Player application, else their
 * Coach application (both validated server-side when submitted), else a home
 * saved on the profile by the earlier onboarding step.
 */
export async function getMemberHome(userId?: string | null): Promise<MemberHome> {
  const emptyHome: MemberHome = {
    memberId: null,
    playerStatus: null,
    coachStatus: null,
    stateId: null,
    stateName: null,
    districtId: null,
    districtName: null,
    memberType: null,
    source: null,
    hasDistrict: false,
  };

  if (!userId) return emptyHome;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        profile: {
          select: {
            memberType: true,
            homeState: { select: { id: true, name: true } },
            homeDistrict: { select: { id: true, name: true } },
          },
        },
        player: { select: { playerId: true, status: true, district: { select: { id: true, name: true, state: { select: { id: true, name: true } } } } } },
        coach: { select: { coachId: true, status: true, district: { select: { id: true, name: true, state: { select: { id: true, name: true } } } } } },
      },
    });

    if (!user) return emptyHome;

    const profile = user.profile;
    const player = user.player;
    const coach = user.coach;
    const base = {
      memberId: player?.playerId ?? coach?.coachId ?? null,
      playerStatus: player?.status ?? null,
      coachStatus: coach?.status ?? null,
    };

    const registration = player?.district
      ? { kind: "player" as const, district: player.district }
      : coach?.district
      ? { kind: "coach" as const, district: coach.district }
      : null;

    if (registration && registration.district) {
      return {
        ...base,
        stateId: registration.district.state?.id ?? null,
        stateName: registration.district.state?.name ?? null,
        districtId: registration.district.id,
        districtName: registration.district.name,
        memberType: registration.kind === "player" ? "PLAYER" : "COACH",
        source: registration.kind,
        hasDistrict: true,
      };
    }

    if (profile?.homeDistrict) {
      return {
        ...base,
        stateId: profile.homeState?.id ?? null,
        stateName: profile.homeState?.name ?? null,
        districtId: profile.homeDistrict.id,
        districtName: profile.homeDistrict.name,
        memberType: (profile.memberType as MemberTypeValue | null) ?? null,
        source: "profile",
        hasDistrict: true,
      };
    }

    return { ...emptyHome, ...base, memberType: (profile?.memberType as MemberTypeValue | null) ?? null };
  } catch (err) {
    console.error("[getMemberHome] error loading member home:", err);
    return emptyHome;
  }
}
