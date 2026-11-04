import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listarDocumentosSharePoint = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: perfil, error } = await context.supabase.from("profiles").select("is_active").eq("id", context.userId).maybeSingle();
    if (error || perfil?.is_active !== true) throw new Error("Profissional não disponível.");
    const key = process.env["AZURE_GRAPH_API_KEY"];
    const lovable = process.env["LOVABLE_API_KEY"];
    if (!key || !lovable) throw new Error("Conexão com o SharePoint não configurada.");
    const { consultarDocumentosSharePoint } = await import("./documentos-sharepoint.server");
    const { itens, erros } = await consultarDocumentosSharePoint(key, lovable);
    return { itens, erros };
  });