export type Identity = { id: string; username: string | null; email: string | null; player_tag: string | null };
export type Identities = Record<string, Identity>;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function collectIdentityIds(value: unknown): string[] {
  const ids = new Set<string>();
  function visit(item: unknown) {
    if (typeof item === 'string' && uuid.test(item)) ids.add(item.toLowerCase());
    else if (Array.isArray(item)) item.forEach(visit);
    else if (item && typeof item === 'object') Object.values(item).forEach(visit);
  }
  visit(value);
  return [...ids].slice(0, 1000);
}
export function identityLabel(identity: Identity): string {
  return `${identity.username || identity.player_tag || 'Profil sans pseudo'} · ${identity.email || 'E-mail indisponible'}`;
}
