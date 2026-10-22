import { createFileRoute, Outlet, redirect, useLocation } from "@tanstack/react-router";

import { supabase } from "@/integrations/supabase/client";
import { AdminTabs } from "@/components/clube/AdminTabs";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import { contentAdminUrl, isPortalUserAdministration } from "@/lib/content-admin";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async ({ context }) => {
    const { data } = await supabase.rpc("is_editor", { _user_id: context.user.id });
    if (data !== true) throw redirect({ to: "/" });
  },
  component: ContentAdministration,
});

function ContentAdministration() {
  const { pathname } = useLocation();
  if (isPortalUserAdministration(pathname)) return <Outlet />;
  return <main className="mx-auto max-w-6xl px-4 py-10">
    <header className="portal-page-heading"><h1>Administração de conteúdo</h1></header>
    <AdminTabs />
    <Button asChild className="mt-6">
      <a href={contentAdminUrl(pathname)} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" />Abrir painel do Espaço do Profissional</a>
    </Button>
  </main>;
}
