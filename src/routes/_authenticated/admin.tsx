import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async () => {
    const { data } = await supabase.rpc("minhas_permissoes");
    const perms = (data as string[] | null) ?? [];
    if (!perms.some((p) => p === "conteudo.editar" || p === "admin.usuarios" || p === "admin.perfis")) {
      throw redirect({ to: "/" });
    }
  },
  component: Outlet,
});
