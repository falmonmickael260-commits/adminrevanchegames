import {
  adminSession,
  failure,
  json,
  AdminError,
  sameAdminOrigin,
} from "../../../lib/server";
import {
  readLimitedBody,
  UUID_PATTERN,
} from "../../../lib/request-security";
import { forwardControl } from "../../../lib/control";
export async function POST(request: Request) {
  try {
    sameAdminOrigin(request);
    const { db } = await adminSession();
    const body = JSON.parse(
      new TextDecoder().decode(await readLimitedBody(request, 24000)),
    );
    if (
      !UUID_PATTERN.test(body.id) ||
      typeof body.action !== "string" ||
      !body.payload ||
      typeof body.payload !== "object" ||
      Array.isArray(body.payload)
    )
      throw new AdminError("Action invalide.", 400);
    const { data, error } = body.action === "promo"
      ? await db.rpc("admin_save_promo", { p_id: body.id, p_payload: body.payload })
      : await db.rpc("admin_execute", { p_id: body.id, p_action: body.action, p_payload: body.payload });
    if (error && body.action === "promo" && error.code === "22023" && /^(Code promo|Nombre de pièces|Limite d’utilisations|Date d’expiration)/.test(error.message)) throw new AdminError(error.message, 400);
    if (error)
      throw new AdminError(
        error.code === "42501"
          ? "Permission refusée."
          : "Action refusée. Vérifiez la cible, les valeurs et le solde. Réessayez avec le même formulaire si la connexion a été interrompue.",
        error.code === "42501" ? 403 : 409,
      );
    const result =
      body.action === "reconcile"
        ? await forwardControl(db, "/api/admin/reconcile", {
            id: body.id,
            target: body.payload.target,
          })
        : data;
    return json({ ok: true, result });
  } catch (error) {
    return failure(error);
  }
}
