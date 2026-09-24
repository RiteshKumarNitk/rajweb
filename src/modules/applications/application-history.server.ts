import prisma from "@/infrastructure/database/prisma";

export interface HistoryEntry {
  id: string;
  label: string;
  detail?: string;
  date: Date;
}

function labelFor(action: string, details: unknown): string {
  const event = details && typeof details === "object" && "event" in details ? (details as { event?: string }).event : undefined;
  if (event === "APPLICATION_RESUBMITTED") return "Corrected and resubmitted";
  if (action === "APPROVE") return "Reviewed by Super Admin — Approved";
  if (action === "REJECT") return "Reviewed by Super Admin — Rejected";
  return action.charAt(0) + action.slice(1).toLowerCase();
}

function reasonFrom(details: unknown): string | undefined {
  if (details && typeof details === "object" && "reason" in details) {
    const reason = (details as { reason?: unknown }).reason;
    return typeof reason === "string" ? reason : undefined;
  }
  return undefined;
}

/**
 * Builds the "submitted -> rejected -> resubmitted -> approved" timeline for
 * a Player/Coach/Membership record by reusing AuditLog — the same table
 * Phase E's admin review screen and the dashboard's Recent Activity already
 * read from. No separate history table.
 */
export async function getApplicationHistory(module: string, entityId: string, submittedAt: Date): Promise<HistoryEntry[]> {
  const logs = await prisma.auditLog.findMany({
    where: { entityId, module, action: { in: ["APPROVE", "REJECT", "UPDATE"] } },
    orderBy: { createdAt: "asc" },
  });

  const entries: HistoryEntry[] = [{ id: "submitted", label: "Application submitted", date: submittedAt }];

  for (const log of logs) {
    entries.push({
      id: log.id,
      label: labelFor(log.action, log.details),
      detail: reasonFrom(log.details),
      date: log.createdAt,
    });
  }

  return entries;
}
