import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";
import { devePrepararHoje, mesBrasilia } from "@/lib/insider.rules";

export const Route = createFileRoute("/api/public/jobs/insider")({ server: { handlers: { POST: async ({ request }) => {
  const failure = await authenticateCronRequest(request);
  if (failure) return failure;
  if (!devePrepararHoje()) return Response.json({ skipped: true });
  try {
    const { prepararInsider } = await import("@/lib/insider.server");
    await prepararInsider(mesBrasilia(), "automatica");
    return Response.json({ success: true });
  } catch (e) {
    console.error("Preparação Insider:", e instanceof Error ? e.message : "Falha");
    return Response.json({ error: e instanceof Error ? e.message : "Falha ao preparar edição." }, { status: 500 });
  }
} } } });