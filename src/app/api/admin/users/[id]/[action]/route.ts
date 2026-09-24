import { z } from "zod";
import prisma from "@/infrastructure/database/prisma";
import { withApiHandler, jsonSuccess, AppError } from "@/core/api/with-api-handler";
import { requirePermission } from "@/security/auth/session";
import { PERMISSIONS } from "@/security/rbac/permissions";
import { createAuditLog } from "@/services/audit/audit-service";

const assignRoleSchema = z.object({ roleId: z.string().min(1) });
const assignDistrictSchema = z.object({ districtId: z.string().min(1) });

export const POST = withApiHandler(
  async (request, { requestId, params }) => {
    const actor = await requirePermission(PERMISSIONS.USERS_UPDATE);
    const id = params?.id as string | undefined;
    const action = params?.action as string | undefined;

    if (!id || !action) {
      throw AppError.badRequest("User ID and action are required");
    }

    const target = await prisma.user.findUnique({ where: { id }, include: { role: true, district: true } });
    if (!target) {
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

    if (action === "assign-district") {
      const { districtId } = assignDistrictSchema.parse(await request.json());
      const district = await prisma.district.findUnique({ where: { id: districtId } });
      if (!district) throw AppError.badRequest("District not found");

      await prisma.user.update({ where: { id }, data: { districtId } });
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

    throw AppError.badRequest("Invalid action");
  },
  { module: "admin-users", requireCsrf: true }
);
