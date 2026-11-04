import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const meuDepartamento = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { escopoDepartamento } = await import("./departamentos.server");
    const escopo = await escopoDepartamento(context.supabase, context.userId);
    return { departamento: escopo.departamento };
  });