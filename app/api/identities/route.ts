import { adminSession, failure, json, AdminError } from '../../../lib/server';
export async function GET(request: Request) {
  try {
    const { db } = await adminSession();
    const params = new URL(request.url).searchParams;
    const search = (params.get('search') || '').trim();
    if (search.length < 2 || search.length > 120) throw new AdminError('Saisissez entre 2 et 120 caractères.', 400);
    const { data, error } = await db.rpc('admin_identity_lookup', { p_search: search, p_staff_only: params.get('staff') === 'true' });
    if (error) throw new AdminError('Recherche de profils indisponible.', 503);
    return json({ rows: data });
  } catch (error) { return failure(error); }
}
