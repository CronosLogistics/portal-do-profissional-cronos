import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";

import { supabase } from "@/integrations/supabase/client";
import type { PortalRole } from "@/lib/portal-modules";

export type CurrentUser = {
  id: string;
  email: string;
  fullName: string;
  roles: PortalRole[];
  isAdmin: boolean;
  isEditor: boolean;
};

export const currentUserQueryKey = ["current-user"] as const;

async function fetchCurrentUser(): Promise<CurrentUser | null> {
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) return null;
  const [{ data: profile }, { data: roleRows }] = await Promise.all([
    supabase.from("profiles").select("full_name, email").eq("id", user.id).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", user.id),
  ]);
  const roles = (roleRows ?? []).map((r) => r.role as PortalRole);
  return {
    id: user.id,
    email: profile?.email ?? user.email ?? "",
    fullName: profile?.full_name ?? "",
    roles,
    isAdmin: roles.includes("admin"),
    isEditor: roles.includes("admin") || roles.includes("rh"),
  };
}

export function useCurrentUser() {
  return useQuery({ queryKey: currentUserQueryKey, queryFn: fetchCurrentUser, staleTime: 60_000 });
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
