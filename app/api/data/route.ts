import { gameHealth } from "../../../lib/game-health";
import { collectIdentityIds, type Identity } from "../../../lib/identities";
import { adminSession, failure, json, AdminError } from "../../../lib/server";
export async function GET(request: Request) {
  try {
    const { db } = await adminSession();
    const q = new URL(request.url).searchParams;
    const offset = Number(q.get("offset") || 0);
    if (q.get("section") === "health") {
      const rows = await gameHealth();
      return json({ rows, total: rows.length, identities: {}, offset: 0 });
    }
    if (!Number.isSafeInteger(offset) || offset < 0 || offset > 100000)
      throw new AdminError("Page invalide.", 400);
    const { data, error } = await db.rpc("admin_query", {
      p_section: q.get("section") || "dashboard",
      p_search: q.get("search") || "",
      p_target: q.get("target") || null,
      p_offset: offset,
    });
    if (error)
      throw new AdminError(
        error.code === "42501"
          ? "Permission refusée."
          : "Données indisponibles.",
        error.code === "42501" ? 403 : 503,
      );
    if (q.get("section") === "report") {
      const captures = await db.from("report_attachments").select("position").eq("report_id", q.get("target"));
      if (captures.error) throw new AdminError("Preuves du signalement indisponibles.", 503);
      data.evidence = { ...data.evidence, attachments_count: captures.data.length || (data.evidence?.attachment_path ? 1 : 0) };
    }
    const ids = collectIdentityIds(data);
    const identities: Record<string, Identity> = {};
    if (ids.length) {
      const { data: people, error: identityError } = await db.rpc("admin_identity_lookup", { p_ids: ids });
      if (identityError) throw new AdminError("Identification des joueurs indisponible. Réessayez avant toute action.", 503);
      for (const person of (people || []) as Identity[]) identities[person.id] = person;
    }
    return json({ ...data, identities });
  } catch (error) {
    return failure(error);
  }
}
