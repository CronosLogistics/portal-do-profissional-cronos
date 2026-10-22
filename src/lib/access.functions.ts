import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type MicrosoftIdentity = { oid: string | null; name: string | null; email: string | null };

/** Lê nome, e-mail e oid direto da Microsoft (Graph /me), nunca do navegador. */
async function fromGraph(providerToken: string): Promise<MicrosoftIdentity | null> {
  const res = await fetch(
    "https://graph.microsoft.com/v1.0/me?$select=id,displayName,mail,userPrincipalName",
    { headers: { Authorization: `Bearer ${providerToken}` } },
  );
  if (!res.ok) return null;
  const me = (await res.json()) as { id?: string; displayName?: string; mail?: string; userPrincipalName?: string };
  return { oid: me.id ?? null, name: me.displayName ?? null, email: me.mail ?? me.userPrincipalName ?? null };
}

/**
 * Registra o acesso: grava ou atualiza o profissional a cada login.
 * Dados vêm do Graph (token Microsoft) ou da identidade verificada no servidor de autenticação.
 */
export const registrarAcesso = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { providerToken?: string | null }) => ({
    providerToken: typeof input?.providerToken === "string" ? input.providerToken : null,
  }))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: au, error } = await supabaseAdmin.auth.admin.getUserById(context.userId);
    if (error || !au.user) throw new Error("Não foi possível identificar o usuário.");

    let ms: MicrosoftIdentity | null = data.providerToken ? await fromGraph(data.providerToken) : null;
    if (!ms) {
      const identity = au.user.identities?.find((i) => i.provider === "azure");
      const d = (identity?.identity_data ?? {}) as Record<string, unknown>;
      const claims = (d.custom_claims ?? {}) as Record<string, unknown>;
      ms = {
        oid: (claims.oid as string) ?? (d.oid as string) ?? (identity?.id as string) ?? null,
        name: (d.full_name as string) ?? (d.name as string) ?? null,
        email: (d.email as string) ?? au.user.email ?? null,
      };
    }

    const { data: current } = await supabaseAdmin
      .from("profiles")
      .select("full_name, email, primeiro_acesso")
      .eq("id", context.userId)
      .maybeSingle();

    const now = new Date().toISOString();
    const { error: upErr } = await supabaseAdmin.from("profiles").upsert({
      id: context.userId,
      entra_oid: ms.oid,
      full_name: ms.name?.trim() || current?.full_name || "",
      email: (ms.email ?? current?.email ?? au.user.email ?? "").toLowerCase(),
      is_active: true,
      primeiro_acesso: current?.primeiro_acesso ?? now,
      ultimo_acesso: now,
    });
    if (upErr) throw new Error("Não foi possível registrar o acesso.");
    return { ok: true };
  });
