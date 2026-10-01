import { z } from "zod";
import { hash } from "bcryptjs";
import prisma from "@/infrastructure/database/prisma";
import { withApiHandler, jsonSuccess, AppError } from "@/core/api/with-api-handler";
import { requirePermission } from "@/security/auth/session";
import { PERMISSIONS, ROLES } from "@/security/rbac/permissions";
import { checkRateLimit } from "@/security/rate-limit";
import { createAuditLog } from "@/services/audit/audit-service";
import { getOrgScope, isInScope } from "@/security/rbac/org-scope";

const assignRoleSchema = z.object({ roleId: z.string().min(1) });
const assignDistrictSchema = z.object({ districtId: z.string().min(1) });
const assignStateSchema = z.object({ stateId: z.string().min(1) });
const resetPasswordSchema = z.object({
  password: z
    .string()
    .min(12, "Use at least 12 characters")
    .max(128)
    .regex(/[a-z]/, "Add a lower-case letter")
    .regex(/[A-Z]/, "Add an upper-case letter")
    .regex(/[0-9]/, "Add a digit")
    .regex(/[^A-Za-z0-9]/, "Add a symbol")
    // The seed/demo passwords are published in the repository.
    .refine(
      (p) => !["admin@123", "state@123", "district@123", "tournament@123", "content@123", "player@123", "test@12345"].includes(p.toLowerCase()),
      "This is a published demo password — choose another"
    ),
});

// Actions that change *whose data* a user can see. Only GLOBAL admins may
// perform them, so a scoped custom role holding users:update can never widen
// anyone's (including its own) organisational scope.
const SCOPE_ACTIONS = new Set(["assign-state", "remove-state", "assign-district", "remove-district", "toggle-federation-wide"]);

export const POST = withApiHandler(
  async (request, { requestId, params }) => {
    const actor = await requirePermission(PERMISSIONS.USERS_UPDATE);
    const id = params?.id as string | undefined;
    const action = params?.action as string | undefined;

    if (!id || !action) {
      throw AppError.badRequest("User ID and action are required");
    }

    if (action === "reset-password" && actor.role !== ROLES.SUPER_ADMIN) {
      throw AppError.forbidden("Only the Super Admin can reset passwords");
    }

    if (SCOPE_ACTIONS.has(action) && getOrgScope(actor).level !== "GLOBAL") {
      throw AppError.forbidden("Only the Super Admin can change a user's state, district or federation-wide access");
    }

    const target = await prisma.user.findUnique({ where: { id }, include: { role: true, district: true, state: true } });
    // Scoped admins may only act on staff inside their own scope.
    if (
      !target ||
      !isInScope(getOrgScope(actor), {
        districtId: target.districtId,
        stateId: target.district?.stateId ?? target.stateId,
      })
    ) {
      throw AppError.notFound("User not found");
    }

    if (action === "activate" || action === "deactivate") {
      const nextActive = action === "activate";
      if (target.isActive === nextActive) {
        return jsonSuccess({ id, isActive: nextActive }, requestId, "No change");
      }

      await prisma.user.update({ where: { id }, data: { isActive: nextActive } });
      await createAuditLog({
        userId: actor.id,
        action: "UPDATE",
        module: "users",
        entityId: id,
        details: { field: "isActive", previousValue: target.isActive, newValue: nextActive },
      });
      return jsonSuccess({ id, isActive: nextActive }, requestId, `User ${nextActive ? "activated" : "deactivated"}`);
    }

    if (action === "assign-role") {
      const { roleId } = assignRoleSchema.parse(await request.json());
      const role = await prisma.role.findUnique({ where: { id: roleId } });
      if (!role) throw AppError.badRequest("Role not found");

      await prisma.user.update({ where: { id }, data: { roleId } });
      await createAuditLog({
        userId: actor.id,
        action: "UPDATE",
        module: "users",
        entityId: id,
        details: { field: "role", previousValue: target.role.slug, newValue: role.slug },
      });
      return jsonSuccess({ id, role: role.slug }, requestId, "Role updated");
    }

    if (action === "assign-state") {
      const { stateId } = assignStateSchema.parse(await request.json());
      const state = await prisma.state.findUnique({ where: { id: stateId } });
      if (!state) throw AppError.badRequest("State not found");

      // A district outside the new state would contradict it — clear it.
      const clearDistrict = target.district !== null && target.district.stateId !== stateId;
      await prisma.user.update({ where: { id }, data: { stateId, ...(clearDistrict ? { districtId: null } : {}) } });
      await createAuditLog({
        userId: actor.id,
        action: "UPDATE",
        module: "users",
        entityId: id,
        details: {
          field: "state",
          previousValue: target.state?.name ?? null,
          newValue: state.name,
          ...(clearDistrict ? { districtCleared: target.district?.name ?? null } : {}),
        },
      });
      return jsonSuccess({ id, stateId }, requestId, "State assigned");
    }

    if (action === "remove-state") {
      if (!target.stateId && !target.districtId) {
        return jsonSuccess({ id, stateId: null }, requestId, "No change");
      }
      // A district implies a state, so removing the state removes the district too.
      await prisma.user.update({ where: { id }, data: { stateId: null, districtId: null } });
      await createAuditLog({
        userId: actor.id,
        action: "UPDATE",
        module: "users",
        entityId: id,
        details: { field: "state", previousValue: target.state?.name ?? null, newValue: null, districtCleared: target.district?.name ?? null },
      });
      return jsonSuccess({ id, stateId: null }, requestId, "State removed");
    }

    if (action === "assign-district") {
      const { districtId } = assignDistrictSchema.parse(await request.json());
      const district = await prisma.district.findUnique({ where: { id: districtId } });
      if (!district) throw AppError.badRequest("District not found");
      if (!district.stateId) throw AppError.badRequest("Assign this district to a state before assigning users to it");

      // Keep User.stateId consistent with the district's state.
      await prisma.user.update({ where: { id }, data: { districtId, stateId: district.stateId } });
      await createAuditLog({
        userId: actor.id,
        action: "UPDATE",
        module: "users",
        entityId: id,
        details: { field: "district", previousValue: target.district?.name ?? null, newValue: district.name },
      });
      return jsonSuccess({ id, districtId }, requestId, "District assigned");
    }

    if (action === "remove-district") {
      if (!target.districtId) {
        return jsonSuccess({ id, districtId: null }, requestId, "No change");
      }

      await prisma.user.update({ where: { id }, data: { districtId: null } });
      await createAuditLog({
        userId: actor.id,
        action: "UPDATE",
        module: "users",
        entityId: id,
        details: { field: "district", previousValue: target.district?.name ?? null, newValue: null },
      });
      return jsonSuccess({ id, districtId: null }, requestId, "District removed");
    }

    if (action === "toggle-federation-wide") {
      const nextValue = !target.isFederationWide;
      await prisma.user.update({ where: { id }, data: { isFederationWide: nextValue } });
      await createAuditLog({
        userId: actor.id,
        action: "UPDATE",
        module: "users",
        entityId: id,
        details: { field: "isFederationWide", previousValue: target.isFederationWide, newValue: nextValue },
      });
      return jsonSuccess({ id, isFederationWide: nextValue }, requestId, "Updated");
    }

    if (action === "reset-password") {
      // Google / e-mail-code accounts have no password; giving them one would
      // silently add a second way to sign in.
      if (target.authProvider !== "CREDENTIALS") {
        throw AppError.badRequest("This account signs in with Google or an e-mail code and has no password to reset");
      }
      if (!(await checkRateLimit(`password-reset:${actor.id}`, 10, 15 * 60_000))) throw AppError.rateLimited();
      const { password } = resetPasswordSchema.parse(await request.json());

      await prisma.user.update({ where: { id }, data: { passwordHash: await hash(password, 12) } });
      await createAuditLog({
        userId: actor.id,
        action: "UPDATE",
        module: "users",
        entityId: id,
        details: { event: "PASSWORD_RESET", field: "password", email: target.email },
      });
      // The password is never echoed back.
      return jsonSuccess({ id }, requestId, "Password reset");
    }

    throw AppError.badRequest("Invalid action");
  },
  { module: "admin-users", requireCsrf: true }
);
