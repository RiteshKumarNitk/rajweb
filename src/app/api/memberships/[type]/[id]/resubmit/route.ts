import { z } from "zod";
import { withApiHandler, jsonSuccess, AppError } from "@/core/api/with-api-handler";
import { requireAuth } from "@/security/auth/session";
import {
  findMembership,
  isMembershipReviewType,
  resubmitClubMembership,
  resubmitSchoolMembership,
  resubmitAcademyMembership,
} from "@/modules/memberships/membership-review.server";
import { createAuditLog } from "@/services/audit/audit-service";

const clubSchema = z.object({
  clubName: z.string().min(2).max(200),
  contactPerson: z.string().min(2).max(100),
  email: z.string().email().max(254),
  phone: z.string().min(10).max(20),
  district: z.string().min(1).max(100),
  address: z.string().min(10).max(500),
  courts: z.coerce.number().int().positive().max(100),
});

const schoolSchema = z.object({
  schoolName: z.string().min(2).max(200),
  principalName: z.string().min(2).max(100),
  email: z.string().email().max(254),
  phone: z.string().min(10).max(20),
  district: z.string().min(1).max(100),
  address: z.string().min(10).max(500),
  studentCount: z.coerce.number().int().positive().max(100000).optional(),
});

const academySchema = z.object({
  academyName: z.string().min(2).max(200),
  directorName: z.string().min(2).max(100),
  email: z.string().email().max(254),
  phone: z.string().min(10).max(20),
  district: z.string().min(1).max(100),
  address: z.string().min(10).max(500),
  coachCount: z.coerce.number().int().positive().max(1000).optional(),
});

export const POST = withApiHandler(
  async (request, { requestId, params }) => {
    const authUser = await requireAuth();
    const type = params?.type as string | undefined;
    const id = params?.id as string | undefined;
    if (!type || !id || !isMembershipReviewType(type)) {
      throw AppError.badRequest("Membership type and ID are required");
    }

    const membership = await findMembership(type, id);
    if (!membership || membership.userId !== authUser.id) {
      throw AppError.notFound("Membership application not found");
    }

    const body = await request.json();

    if (type === "club") {
      const data = clubSchema.parse(body);
      const updated = await resubmitClubMembership(id, data);
      await createAuditLog({
        userId: authUser.id,
        action: "UPDATE",
        module: "memberships",
        entityId: id,
        details: { event: "APPLICATION_RESUBMITTED", type },
      });
      return jsonSuccess(
        { membershipId: updated?.membershipId, status: updated?.status },
        requestId,
        "Application resubmitted for approval"
      );
    }

    if (type === "school") {
      const data = schoolSchema.parse(body);
      const updated = await resubmitSchoolMembership(id, data);
      await createAuditLog({
        userId: authUser.id,
        action: "UPDATE",
        module: "memberships",
        entityId: id,
        details: { event: "APPLICATION_RESUBMITTED", type },
      });
      return jsonSuccess(
        { membershipId: updated?.membershipId, status: updated?.status },
        requestId,
        "Application resubmitted for approval"
      );
    }

    const data = academySchema.parse(body);
    const updated = await resubmitAcademyMembership(id, data);
    await createAuditLog({
      userId: authUser.id,
      action: "UPDATE",
      module: "memberships",
      entityId: id,
      details: { event: "APPLICATION_RESUBMITTED", type },
    });
    return jsonSuccess(
      { membershipId: updated?.membershipId, status: updated?.status },
      requestId,
      "Application resubmitted for approval"
    );
  },
  { module: "memberships-resubmit", rateLimit: { limit: 10, windowMs: 60000 }, requireCsrf: true }
);
