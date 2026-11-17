import { adminSession, failure, AdminError } from "../../../lib/server";
export async function GET(request: Request) {
  try {
    const { db } = await adminSession();
    const q = new URL(request.url).searchParams;
    const type = q.get("type");
    if (!["report", "ticket"].includes(type || ""))
      throw new AdminError("Pièce jointe introuvable.", 404);
    const { data, error } = await db.rpc("admin_query", {
      p_section: type,
      p_target: q.get("id"),
    });
    if (error) throw new AdminError("Accès refusé.", 403);
    let path =
      type === "report"
        ? data?.evidence?.attachment_path
        : data?.ticket?.attachment_path;
    const position = Number(q.get("file") || 0);
    if (!Number.isInteger(position) || position < 0 || position > 2) throw new AdminError("Capture introuvable.", 404);
    if (type === "report") {
      const capture = await db.from("report_attachments").select("storage_path").eq("report_id", q.get("id")).eq("position", position).maybeSingle();
      if (capture.error) throw new AdminError("Pièces jointes indisponibles.", 503);
      path = capture.data?.storage_path || (position === 0 ? path : null);
    }
    if (!path) throw new AdminError("Aucune pièce jointe.", 404);
    // Storage RLS rechecks role and MFA for this user's JWT. No service key.
    const file = await db.storage
      .from(type === "report" ? "report-evidence" : "support-attachments")
      .download(path);
    if (file.error || !file.data)
      throw new AdminError("Pièce jointe indisponible.", 404);
    return new Response(file.data, {
      headers: {
        "Content-Type": "image/webp",
        "Content-Disposition": 'inline; filename="preuve.webp"',
        "Cache-Control": "no-store, private",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; sandbox",
      },
    });
  } catch (error) {
    return failure(error);
  }
}
