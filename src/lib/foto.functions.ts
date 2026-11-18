import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Foto da conta Microsoft do próprio profissional (data URL) ou null quando não houver. */
export const minhaFotoMicrosoft = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<string | null> => {
    const { data } = await context.supabase.from("profiles").select("entra_oid").eq("id", context.userId).maybeSingle();
    return fotoPorOid((data as { entra_oid?: string | null } | null)?.entra_oid);
  });

/** Foto Microsoft de outro profissional ativo (comentários, perfis de colegas). */
export const fotoProfissional = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string }) => {
    if (!d || typeof d.userId !== "string" || !/^[0-9a-f-]{36}$/i.test(d.userId)) throw new Error("Usuário inválido");
    return d;
  })
  .handler(async ({ data }): Promise<string | null> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: p } = await supabaseAdmin.from("profiles").select("entra_oid,is_active").eq("id", data.userId).maybeSingle();
    if (!p || p.is_active === false) return null;
    return fotoPorOid(p.entra_oid);
  });

async function fotoPorOid(oid: string | null | undefined): Promise<string | null> {
  const key = process.env["LOVABLE_API_KEY"], graph = process.env["AZURE_GRAPH_API_KEY"];
  if (!oid || !key || !graph || !/^[0-9a-f-]{36}$/i.test(oid)) return null;
  const res = await fetch(`https://connector-gateway.lovable.dev/azure_graph/v1.0/users/${oid}/photos/240x240/$value`, {
    headers: { Authorization: `Bearer ${key}`, "X-Connection-Api-Key": graph },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) {
    if (res.status !== 404) console.error(`Foto Microsoft [${res.status}]: ${await res.text()}`);
    return null;
  }
  const buf = new Uint8Array(await res.arrayBuffer());
  let bin = "";
  for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return `data:${res.headers.get("content-type") || "image/jpeg"};base64,${btoa(bin)}`;
}
