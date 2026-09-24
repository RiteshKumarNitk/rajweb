import prisma from "@/infrastructure/database/prisma";
import { AppError } from "@/core/errors/app-error";
import { sanitizeEmail, sanitizePhone, sanitizeText } from "@/security/sanitize";
import { createModuleLogger } from "@/core/logger";

const log = createModuleLogger("memberships");

export type MembershipReviewType = "club" | "school" | "academy";

async function resolveDistrictId(districtName: string) {
  const district = await prisma.district.findFirst({
    where: { name: { equals: districtName, mode: "insensitive" } },
  });
  if (!district) throw AppError.validation("Invalid district selected");
  return district.id;
}

export interface ResubmitClubInput {
  clubName: string;
  contactPerson: string;
  email: string;
  phone: string;
  district: string;
  address: string;
  courts: number;
}

export interface ResubmitSchoolInput {
  schoolName: string;
  principalName: string;
  email: string;
  phone: string;
  district: string;
  address: string;
  studentCount?: number;
}

export interface ResubmitAcademyInput {
  academyName: string;
  directorName: string;
  email: string;
  phone: string;
  district: string;
  address: string;
  coachCount?: number;
}

export function isMembershipReviewType(value: string): value is MembershipReviewType {
  return value === "club" || value === "school" || value === "academy";
}

export async function findMembership(type: MembershipReviewType, id: string) {
  switch (type) {
    case "club":
      return prisma.clubMembership.findUnique({ where: { id }, include: { district: true } });
    case "school":
      return prisma.schoolMembership.findUnique({ where: { id }, include: { district: true } });
    case "academy":
      return prisma.academyMembership.findUnique({ where: { id }, include: { district: true } });
  }
}

export async function approveMembership(type: MembershipReviewType, id: string, approvedBy: string) {
  const data = { status: "APPROVED" as const, approvedAt: new Date(), approvedBy, rejectionReason: null };
  const where = { id, status: "PENDING" as const };

  const count =
    type === "club"
      ? (await prisma.clubMembership.updateMany({ where, data })).count
      : type === "school"
        ? (await prisma.schoolMembership.updateMany({ where, data })).count
        : (await prisma.academyMembership.updateMany({ where, data })).count;

  if (count === 0) {
    throw AppError.conflict("This application has already been processed.");
  }
  log.info({ type, id, approvedBy }, "Membership approved");
  return findMembership(type, id);
}

export async function rejectMembership(type: MembershipReviewType, id: string, reason: string) {
  const data = { status: "REJECTED" as const, rejectionReason: reason };
  const where = { id, status: "PENDING" as const };

  const count =
    type === "club"
      ? (await prisma.clubMembership.updateMany({ where, data })).count
      : type === "school"
        ? (await prisma.schoolMembership.updateMany({ where, data })).count
        : (await prisma.academyMembership.updateMany({ where, data })).count;

  if (count === 0) {
    throw AppError.conflict("This application has already been processed.");
  }
  log.info({ type, id }, "Membership rejected");
  return findMembership(type, id);
}

export async function resubmitClubMembership(id: string, input: ResubmitClubInput) {
  const districtId = await resolveDistrictId(input.district);
  const result = await prisma.clubMembership.updateMany({
    where: { id, status: "REJECTED" },
    data: {
      clubName: sanitizeText(input.clubName),
      contactPerson: sanitizeText(input.contactPerson),
      email: sanitizeEmail(input.email),
      mobile: sanitizePhone(input.phone),
      address: sanitizeText(input.address),
      districtId,
      numberOfCourts: input.courts,
      status: "PENDING",
      rejectionReason: null,
      approvedAt: null,
      approvedBy: null,
    },
  });
  if (result.count === 0) {
    throw AppError.conflict("This application is not in a rejected state and cannot be resubmitted.");
  }
  log.info({ id }, "Club membership resubmitted");
  return findMembership("club", id);
}

export async function resubmitSchoolMembership(id: string, input: ResubmitSchoolInput) {
  const districtId = await resolveDistrictId(input.district);
  const result = await prisma.schoolMembership.updateMany({
    where: { id, status: "REJECTED" },
    data: {
      schoolName: sanitizeText(input.schoolName),
      principalName: sanitizeText(input.principalName),
      email: sanitizeEmail(input.email),
      mobile: sanitizePhone(input.phone),
      address: sanitizeText(input.address),
      districtId,
      studentCount: input.studentCount,
      status: "PENDING",
      rejectionReason: null,
      approvedAt: null,
      approvedBy: null,
    },
  });
  if (result.count === 0) {
    throw AppError.conflict("This application is not in a rejected state and cannot be resubmitted.");
  }
  log.info({ id }, "School membership resubmitted");
  return findMembership("school", id);
}

export async function resubmitAcademyMembership(id: string, input: ResubmitAcademyInput) {
  const districtId = await resolveDistrictId(input.district);
  const result = await prisma.academyMembership.updateMany({
    where: { id, status: "REJECTED" },
    data: {
      academyName: sanitizeText(input.academyName),
      directorName: sanitizeText(input.directorName),
      email: sanitizeEmail(input.email),
      mobile: sanitizePhone(input.phone),
      address: sanitizeText(input.address),
      districtId,
      coachCount: input.coachCount,
      status: "PENDING",
      rejectionReason: null,
      approvedAt: null,
      approvedBy: null,
    },
  });
  if (result.count === 0) {
    throw AppError.conflict("This application is not in a rejected state and cannot be resubmitted.");
  }
  log.info({ id }, "Academy membership resubmitted");
  return findMembership("academy", id);
}
