/**
 * Módulos do Portal do Profissional exibidos na navegação principal.
 * Para incluir um novo módulo: crie a rota em src/routes/_authenticated/
 * e adicione uma linha aqui. Login, menu e permissões são reaproveitados.
 */
export type PortalRole = "admin" | "rh" | "funcionario";

export type PortalNavGroup = "beneficios" | "feedbacks" | "avisos" | "formularios";

export type PortalModule = {
  to: "/avisos" | "/ferias" | "/mural" | "/beneficios" | "/parceiros" | "/recompensas" | "/treinamentos" | "/formularios" | "/formularios-internos" | "/documentos" | "/feedback" | "/feedback-gestor" | "/pendencias";
  label: string;
  /** Texto do item quando o módulo aparece como submenu. */
  menuLabel?: string;
  /** Agrupa o módulo sob um menu principal da barra lateral. */
  group?: PortalNavGroup;
  /** Perfis que veem o módulo. Vazio = todos os usuários autenticados. */
  roles?: PortalRole[];
};

export const PORTAL_NAV_GROUPS: Record<PortalNavGroup, { label: string }> = {
  avisos: { label: "Avisos" },
  beneficios: { label: "Benefícios" },
  feedbacks: { label: "Feedbacks" },
  formularios: { label: "Formulários" },
};

export const PORTAL_MODULES: PortalModule[] = [
  { to: "/avisos", label: "Avisos", group: "avisos" },
  { to: "/ferias", label: "Férias dos Colaboradores", group: "avisos" },
  { to: "/pendencias", label: "Pendências" },
  { to: "/mural", label: "Mural de comemorações" },
  { to: "/beneficios", label: "Benefícios", group: "beneficios" },
  { to: "/parceiros", label: "Parceiros e descontos", menuLabel: "Parceiros", group: "beneficios" },
  { to: "/recompensas", label: "Programas de Recompensas" },
  { to: "/treinamentos", label: "Treinamentos" },
  { to: "/formularios-internos", label: "Formulários Internos", group: "formularios" },
  { to: "/formularios", label: "Formulários SharePoint", menuLabel: "Formulários SharePoint", group: "formularios" },
  { to: "/documentos", label: "Documentos Cronos" },
  { to: "/feedback", label: "Elogios", menuLabel: "Elogios", group: "feedbacks" },
  { to: "/feedback-gestor", label: "Feedback do gestor", group: "feedbacks" },
];

export type PrincipalNavLink = {
  type: "link";
  to: "/" | PortalModule["to"];
  label: string;
};

export type PrincipalNavGroup = {
  type: "group";
  id: PortalNavGroup;
  label: string;
  children: { to: PortalModule["to"]; label: string }[];
};

export type PrincipalNavEntry = PrincipalNavLink | PrincipalNavGroup;

export function visibleModules(roles: PortalRole[]) {
  return PORTAL_MODULES.filter((m) => !m.roles?.length || m.roles.some((r) => roles.includes(r)));
}

/** Menu principal: Início e os módulos visíveis, com grupos (Avisos, Benefícios, Formulários, Feedbacks) nos submenus. */
export function principalNav(roles: PortalRole[]): PrincipalNavEntry[] {
  const entries: PrincipalNavEntry[] = [{ type: "link", to: "/", label: "Início" }];
  for (const mod of visibleModules(roles)) {
    if (!mod.group) {
      entries.push({ type: "link", to: mod.to, label: mod.label });
      continue;
    }
    const child = { to: mod.to, label: mod.menuLabel ?? mod.label };
    const group = entries.find(
      (entry): entry is PrincipalNavGroup => entry.type === "group" && entry.id === mod.group,
    );
    if (group) group.children.push(child);
    else {
      entries.push({
        type: "group",
        id: mod.group,
        label: PORTAL_NAV_GROUPS[mod.group].label,
        children: [child],
      });
    }
  }
  return entries;
}
