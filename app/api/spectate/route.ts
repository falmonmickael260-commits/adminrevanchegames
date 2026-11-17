import { collectIdentityIds, type Identity } from "../../../lib/identities";
import { adminSession, failure, json } from "../../../lib/server";
import { forwardControl } from "../../../lib/control";
export async function GET(request: Request) {
  try {
    const { db } = await adminSession();
    const q = new URL(request.url).searchParams;
    const snapshot = await forwardControl(
        db,
        `/api/admin/observer?${new URLSearchParams({ room: q.get("room") || "", access: q.get("access") || "" })}`,
      );
    const ids = collectIdentityIds(snapshot.publicState);
    const identities: Record<string, Identity> = {};
    if (ids.length) {
      const { data, error } = await db.rpc("admin_identity_lookup", { p_ids: ids });
      if (error) throw new Error("Identités indisponibles.");
      for (const identity of (data || []) as Identity[]) identities[identity.id] = identity;
    }
    return json({ ...snapshot, identities });
  } catch (error) {
    return failure(error);
  }
}
