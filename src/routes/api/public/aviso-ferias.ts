import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/aviso-ferias")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { receberAvisoAutomatico } = await import("@/lib/aviso-automatico.server");
        return receberAvisoAutomatico(request);
      },
    },
  },
});
