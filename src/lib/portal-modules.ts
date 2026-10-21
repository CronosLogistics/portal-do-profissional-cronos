/**
 * Módulos do Portal do Profissional exibidos na navegação principal.
 * Para incluir um novo módulo: crie a rota em src/routes/_authenticated/
 * e adicione uma linha aqui. Login, menu e permissões são reaproveitados.
 */
export type PortalRole = "admin" | "rh" | "funcionario";

export type PortalModule = {
  to: "/beneficios" | "/parceiros" | "/recompensas" | "/treinamentos";
  label: string;
  /** Perfis que veem o módulo. Vazio = todos os usuários autenticados. */
  roles?: PortalRole[];
};

export const PORTAL_MODULES: PortalModule[] = [
  { to: "/beneficios", label: "Benefícios" },
  { to: "/parceiros", label: "Parceiros e descontos" },
  { to: "/recompensas", label: "Programas de Recompensas" },
  { to: "/treinamentos", label: "Treinamentos" },
];

export function visibleModules(roles: PortalRole[]) {
  return PORTAL_MODULES.filter((m) => !m.roles?.length || m.roles.some((r) => roles.includes(r)));
}
