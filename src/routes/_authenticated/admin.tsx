import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async ({ context }) => {
    const { data } = await supabase.rpc("is_editor", { _user_id: context.user.id });
    if (data !== true) throw redirect({ to: "/" });
  },
  component: () => <Outlet />,
});
