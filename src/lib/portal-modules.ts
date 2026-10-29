/**
 * Módulos do Portal do Profissional exibidos na navegação principal.
 * Para incluir um novo módulo: crie a rota em src/routes/_authenticated/
 * e adicione uma linha aqui. Login, menu e permissões são reaproveitados.
 */
export type PortalRole = "admin" | "rh" | "funcionario";

export type PortalNavGroup = "beneficios";

export type PortalModule = {
  to: "/avisos" | "/mural" | "/beneficios" | "/parceiros" | "/recompensas" | "/treinamentos" | "/formularios" | "/documentos" | "/feedback";
  label: string;
  /** Texto do item quando o módulo aparece como submenu. */
  menuLabel?: string;
  /** Agrupa o módulo sob um menu principal da barra lateral. */
  group?: PortalNavGroup;
  /** Perfis que veem o módulo. Vazio = todos os usuários autenticados. */
  roles?: PortalRole[];
};

export const PORTAL_NAV_GROUPS: Record<PortalNavGroup, { label: string }> = {
  beneficios: { label: "Benefícios" },
};

export const PORTAL_MODULES: PortalModule[] = [
  { to: "/avisos", label: "Avisos" },
  { to: "/mural", label: "Mural de comemorações" },
  { to: "/beneficios", label: "Benefícios", group: "beneficios" },
  { to: "/parceiros", label: "Parceiros e descontos", menuLabel: "Parceiros", group: "beneficios" },
  { to: "/recompensas", label: "Programas de Recompensas" },
  { to: "/treinamentos", label: "Treinamentos" },
  { to: "/formularios", label: "Formulários" },
  { to: "/documentos", label: "Documentos" },
  { to: "/feedback", label: "Feedback" },
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

/** Menu principal: Início e os módulos visíveis, com Benefícios agrupando os submenus. */
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
