// Best-effort client-side audit logger. Writes to public.audit_log with the
// current auth.uid() as actor_id (RLS allows authenticated inserts of own rows).
// Failures are swallowed — auditing must never break a user action.
import { supabase } from "@/integrations/supabase/client";

export type AuditAction =
  | "admin.login.success"
  | "admin.login.failure"
  | "admin.logout"
  | "admin.mfa.enrolled"
  | "admin.mfa.failure"
  | "upload.rejected"
  | `${string}.create`
  | `${string}.update`
  | `${string}.delete`
  | `${string}.toggle_active`
  | `${string}.upload_image`;


export async function writeAudit(
  action: AuditAction,
  opts: { entity?: string; entityId?: string; metadata?: Record<string, unknown> } = {},
): Promise<void> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const actor_id = userData.user?.id ?? null;
    await supabase.from("audit_log").insert({
      actor_id,
      action,
      entity: opts.entity ?? null,
      entity_id: opts.entityId ?? null,
      metadata: {
        ...(opts.metadata ?? {}),
        ua: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 300) : null,
        at: new Date().toISOString(),
      },
    });
  } catch {
    /* never throw from audit */
  }
}
