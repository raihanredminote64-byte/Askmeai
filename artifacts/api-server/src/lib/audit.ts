import { db } from "@workspace/db";
import { auditLogsTable } from "@workspace/db";

export async function createAuditLog(
  action: string,
  resource: string,
  opts: {
    userId?: string;
    resourceId?: string;
    details?: Record<string, unknown>;
  } = {}
) {
  try {
    await db.insert(auditLogsTable).values({
      action,
      resource,
      userId: opts.userId ?? null,
      resourceId: opts.resourceId ?? null,
      details: opts.details ?? {},
    });
  } catch {
    // Non-critical — don't let audit failures break requests
  }
}
