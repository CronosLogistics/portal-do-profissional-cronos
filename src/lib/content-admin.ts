const CONTENT_ADMIN_ORIGIN = "https://espacodoprofissionalcronos.lovable.app";

/** Content is edited at its source; only user administration stays in the portal. */
export function isPortalUserAdministration(pathname: string) {
  return pathname.replace(/\/$/, "") === "/admin/usuarios";
}

export function contentAdminUrl(pathname: string) {
  const path = pathname.replace(/\/$/, "");
  if (path === "/admin/beneficios" || path.startsWith("/admin/beneficio/")) {
    return `${CONTENT_ADMIN_ORIGIN}/admin/beneficios`;
  }
  if (path === "/admin/recompensas" || path.startsWith("/admin/recompensa/")) {
    return `${CONTENT_ADMIN_ORIGIN}/admin/recompensas`;
  }
  if (path === "/admin/pagina-inicial") return `${CONTENT_ADMIN_ORIGIN}/admin/pagina-inicial`;
  if (path.startsWith("/admin/cadastros")) return `${CONTENT_ADMIN_ORIGIN}/admin/cadastros`;
  return `${CONTENT_ADMIN_ORIGIN}/admin`;
}