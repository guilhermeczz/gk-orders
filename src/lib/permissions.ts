type PermissionUser = {
  perfil?: string | null;
  username?: string | null;
  name?: string | null;
  isDeveloper?: boolean;
} | null | undefined;

export function isDeveloperUser(user: PermissionUser) {
  return Boolean(
    user?.isDeveloper ||
      String(user?.perfil || '').toLowerCase() === 'desenvolvedor' ||
      String(user?.username || '').toLowerCase() === 'dev' ||
      String(user?.name || '').toLowerCase() === 'desenvolvedor'
  );
}

export function isStoreAdmin(user: PermissionUser) {
  return String(user?.perfil || '').toLowerCase() === 'admin_loja';
}

export function hasAnyRole(user: PermissionUser, roles: string[]) {
  if (isDeveloperUser(user)) return true;
  return roles.includes(String(user?.perfil || 'operador').toLowerCase());
}
