import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { inventariosPermitidos } from "./inventario.rules";

type Ctx = { supabase: { from: (t: "profiles") => any; rpc: (n: string, a?: object) => any }; userId: string };

async function permitidos(ctx: Ctx) {
  const { data: eu } = await ctx.supabase.from("profiles").select("email,is_active").eq("id", ctx.userId).maybeSingle();
  if (!eu || eu.is_active === false) throw new Error("Unauthorized");
  const [adm, esc] = await Promise.all([ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" }), ctx.supabase.rpc("meu_escopo_departamento")]);
  const departamento = esc.data && typeof esc.data["departamento"] === "string" ? esc.data["departamento"] : null;
  const { responsaveisEscritorios } = await import("./inventario.server");
  return inventariosPermitidos(await responsaveisEscritorios(), { email: eu.email ?? "", admin: adm.data === true, departamento });
}

/** Define se o menu mostra o Inventário de Brindes. */
export const acessoInventario = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    try { return { permitido: (await permitidos(context as unknown as Ctx)).length > 0 }; }
    catch (e) { console.error("[inventario-acesso]", e); return { permitido: false }; }
  });

/** Inventários autorizados ao usuário, lidos do SharePoint; sem acesso = erro. */
export const listarInventarios = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const lista = await permitidos(context as unknown as Ctx);
    if (!lista.length) throw new Error("Acesso restrito aos responsáveis pelos inventários.");
    const { lerInventario } = await import("./inventario.server");
    return { inventarios: await Promise.all(lista.map(lerInventario)) };
  });
