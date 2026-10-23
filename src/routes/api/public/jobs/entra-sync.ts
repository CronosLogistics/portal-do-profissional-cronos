import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

export const Route = createFileRoute("/api/public/jobs/entra-sync")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authFailure = await authenticateCronRequest(request);
        if (authFailure) return authFailure;
        const { runEntraSync } = await import("@/lib/entra-sync.server");
        const r = await runEntraSync({ origem: "automatica" });
        return Response.json({ sucesso: r.sucesso, alterados: r.alterados });
      },
    },
  },
});
