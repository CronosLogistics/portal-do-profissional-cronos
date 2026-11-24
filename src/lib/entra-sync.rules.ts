/** Regras puras da sincronização diária com o Microsoft Entra ID. */
export type EntraUser = {
  id: string;
  displayName: string | null;
  mail: string | null;
  userPrincipalName: string | null;
  accountEnabled: boolean | null;
  employeeId: string | null;
  userType?: string | null;
};

export type ProfileRow = {
  id: string;
  email: string;
  full_name: string;
  employee_id: string | null;
  is_active: boolean;
  entra_oid: string | null;
};

export type ProfilePatch = {
  entra_oid: string;
  full_name: string;
  email: string;
  employee_id: string | null;
  is_active: boolean;
};

export function entraEmail(u: EntraUser) {
  return (u.mail || u.userPrincipalName || "").trim().toLowerCase();
}

/** Bounded, idempotent admission: only active corporate members also listed as active in SharePoint. */
export const MAX_ADMISSOES_POR_SYNC = 50;

export function novosAdmitidos(users: EntraUser[], profiles: ProfileRow[], ativosSharePoint: ReadonlySet<string>) {
  const oids = new Set(profiles.map((p) => p.entra_oid).filter(Boolean));
  const emails = new Set(profiles.map((p) => p.email.trim().toLowerCase()));
  const ativos = new Set([...ativosSharePoint].map((e) => e.trim().toLowerCase()));
  const contagens = new Map<string, number>();
  for (const u of users) {
    const email = entraEmail(u);
    contagens.set(email, (contagens.get(email) ?? 0) + 1);
  }
  return users.filter((u) => {
    const email = entraEmail(u);
    return u.accountEnabled === true && u.userType === "Member" && !!u.displayName?.trim()
      && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(u.id)
      && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && !email.includes("#ext#")
      && contagens.get(email) === 1 && ativos.has(email) && !oids.has(u.id) && !emails.has(email);
  }).sort((a, b) => entraEmail(a).localeCompare(entraEmail(b)));
}

/** Localiza o colaborador do diretório pelo ID Microsoft; usa o e-mail só quando ainda não há vínculo. */
export function matchEntraUser(p: ProfileRow, byOid: Map<string, EntraUser>, byEmail: Map<string, EntraUser>) {
  if (p.entra_oid) return byOid.get(p.entra_oid) ?? null;
  return byEmail.get(p.email.trim().toLowerCase()) ?? null;
}

/**
 * Calcula a atualização do cadastro. Quem não existe mais no diretório ou está
 * com a conta Microsoft bloqueada fica inativo; dados vêm sempre do Entra.
 */
export function computePatch(p: ProfileRow, u: EntraUser | null): ProfilePatch | { is_active: false } | null {
  if (!u) return p.is_active ? { is_active: false } : null;
  const next: ProfilePatch = {
    entra_oid: u.id,
    full_name: (u.displayName || p.full_name).trim(),
    email: entraEmail(u) || p.email,
    employee_id: u.employeeId?.trim() || p.employee_id,
    is_active: u.accountEnabled === true,
  };
  const same =
    p.entra_oid === next.entra_oid &&
    p.full_name === next.full_name &&
    p.email === next.email &&
    p.employee_id === next.employee_id &&
    p.is_active === next.is_active;
  return same ? null : next;
}
