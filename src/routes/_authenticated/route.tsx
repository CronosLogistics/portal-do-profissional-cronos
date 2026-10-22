import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { supabase } from "@/integrations/supabase/client";
import { PortalShell } from "@/components/portal/PortalShell";
import { registrarAcesso } from "@/lib/access.functions";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    // Registra o acesso uma vez por sessão, antes de abrir o Início.
    const { data: sess } = await supabase.auth.getSession();
    const flag = `portal-acesso:${sess.session?.access_token.slice(-16) ?? data.user.id}`;
    if (!sessionStorage.getItem(flag)) {
      try {
        await registrarAcesso({ data: { providerToken: sess.session?.provider_token ?? null } });
        sessionStorage.setItem(flag, "1");
      } catch (e) {
        console.error(e);
      }
    }
    // Contas desativadas não acessam o portal, mesmo com sessão antiga.
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_active")
      .eq("id", data.user.id)
      .maybeSingle();
    if (!profile?.is_active) {
      await supabase.auth.signOut();
      throw redirect({ to: "/auth" });
    }
    return { user: data.user };
  },
  component: () => <PortalShell><Outlet /></PortalShell>,
});
