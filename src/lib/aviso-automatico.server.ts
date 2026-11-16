import { z } from "zod";

const Corpo = z.object({
  titulo: z.string().trim().min(1).max(200),
  html: z.string().min(1).max(2_000_000),
});

async function iguais(a: string, b: string) {
  const enc = new TextEncoder();
  const [x, y] = await Promise.all([crypto.subtle.digest("SHA-256", enc.encode(a)), crypto.subtle.digest("SHA-256", enc.encode(b))]);
  const ax = new Uint8Array(x), by = new Uint8Array(y);
  let d = 0;
  for (let i = 0; i < ax.length; i++) d |= (ax[i] ?? 0) ^ (by[i] ?? 0);
  return d === 0;
}

/** Publica um aviso comum (sem importante nem confirmação) vindo do Power Automate. */
export async function receberAvisoAutomatico(request: Request) {
  const segredo = process.env["COMPILADO_WEBHOOK_SECRET"];
  const enviado = request.headers.get("x-webhook-secret") ?? "";
  if (!segredo || !enviado || !(await iguais(enviado, segredo))) {
    return Response.json({ erro: "Não autorizado" }, { status: 401 });
  }
  let json: unknown;
  try { json = await request.json(); } catch { return Response.json({ erro: "JSON inválido" }, { status: 400 }); }
  const r = Corpo.safeParse(json);
  if (!r.success) return Response.json({ erro: "Esperado { titulo, html }" }, { status: 400 });
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.rpc("receber_aviso_automatico", { _titulo: r.data.titulo, _html: r.data.html });
  if (error) return Response.json({ erro: "Falha ao gravar" }, { status: 500 });
  return Response.json({ sucesso: true, aviso_id: data });
}
