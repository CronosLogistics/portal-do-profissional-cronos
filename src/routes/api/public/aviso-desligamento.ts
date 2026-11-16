import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/aviso-desligamento")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { receberAvisoAutomatico } = await import("@/lib/aviso-automatico.server");
        return receberAvisoAutomatico(request);
      },
    },
  },
});
