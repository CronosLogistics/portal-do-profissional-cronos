import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";

import { supabase } from "@/integrations/supabase/client";
import type { PortalRole } from "@/lib/portal-modules";
import type { Permissao } from "@/lib/permissions";
import { meuDepartamento } from "@/lib/departamentos.functions";

export type CurrentUser = {
  id: string;
  email: string;
  fullName: string;
  departamento: string | null;
  roles: PortalRole[];
  permissions: Permissao[];
  can: (p: Permissao) => boolean;
  isAdmin: boolean;
  isEditor: boolean;
};

export const currentUserQueryKey = ["current-user"] as const;

async function fetchCurrentUser(): Promise<CurrentUser | null> {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw new Error("Não foi possível confirmar seu acesso.");
  const user = data.user;
  if (!user) return null;
  const setor = await meuDepartamento();
  const [profileResult, permsResult] = await Promise.all([
    supabase.from("profiles").select("full_name, email").eq("id", user.id).maybeSingle(),
    supabase.rpc("minhas_permissoes"),
  ]);
  if (profileResult.error || permsResult.error) throw new Error("Não foi possível verificar suas permissões.");
  const profile = profileResult.data, perms = permsResult.data;
  const permissions = ((perms as string[] | null) ?? []) as Permissao[];
  const can = (p: Permissao) => permissions.includes(p);
  const roles: PortalRole[] = ["funcionario"];
  if (can("conteudo.editar")) roles.push("rh");
  if (can("admin.usuarios")) roles.push("admin");
  return {
    id: user.id,
    email: profile?.email ?? user.email ?? "",
    fullName: profile?.full_name ?? "",
    departamento: setor.departamento,
    roles,
    permissions,
    can,
    isAdmin: can("admin.usuarios") || can("admin.perfis"),
    isEditor: can("conteudo.editar") || can("admin.usuarios") || can("admin.perfis"),
  };
}

export function useCurrentUser() {
  // Recarrega a cada abertura de página: retirar alguém de um perfil vale no próximo carregamento.
  return useQuery({ queryKey: currentUserQueryKey, queryFn: fetchCurrentUser, staleTime: 30_000 });
}

export function useSignOut() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  return async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };
}
