import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { normalizeUserInput, type UserRole } from "@/lib/users.rules";

export type PortalUser = {
  id: string;
  email: string;
  fullName: string;
  employeeId: string;
  isActive: boolean;
  role: UserRole;
  lastSignInAt: string | null;
  firstAccessAt: string | null;
  syncedAt: string | null;
  linkedMicrosoft: boolean;
  invitedPending: boolean;
};

type RpcCtx = {
  supabase: {
    rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: unknown }>;
  };
  userId: string;
};

/** Toda operação administrativa é confirmada no servidor, nunca só na tela. */
export async function requireAdmin(context: RpcCtx) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error || data !== true) throw new Error("Acesso restrito a administradores.");
}

function friendly(message: string) {
  const m = message.toLowerCase();
  if (m.includes("already") || m.includes("registered") || m.includes("exists") || m.includes("duplicate")) {
    if (m.includes("employee_id")) return new Error("Esta matrícula já está vinculada a outro usuário.");
    return new Error("Este e-mail já está cadastrado.");
  }
  return new Error("Não foi possível concluir a operação. Tente novamente.");
}

async function setRole(
  admin: Awaited<typeof import("@/integrations/supabase/client.server")>["supabaseAdmin"],
  userId: string,
  role: UserRole,
) {
  const del = await admin.from("user_roles").delete().eq("user_id", userId).neq("role", role);
  if (del.error) throw friendly(del.error.message);
  const ins = await admin.from("user_roles").upsert({ user_id: userId, role }, { onConflict: "user_id,role" });
  if (ins.error) throw friendly(ins.error.message);
}

export const listUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PortalUser[]> => {
    await requireAdmin(context as unknown as RpcCtx);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [profiles, roles] = await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select("id, email, full_name, employee_id, is_active, entra_oid, primeiro_acesso, ultimo_acesso, sincronizado_em")
        .order("full_name"),
      supabaseAdmin.from("user_roles").select("user_id, role"),
    ]);
    if (profiles.error || roles.error) throw new Error("Não foi possível carregar os usuários.");
    const roleOf = new Map<string, UserRole>();
    for (const r of roles.data ?? []) {
      const current = roleOf.get(r.user_id);
      const rank = { admin: 3, rh: 2, funcionario: 1 } as const;
      if (!current || rank[r.role as UserRole] > rank[current]) roleOf.set(r.user_id, r.role as UserRole);
    }
    return (profiles.data ?? []).map((p) => ({
      id: p.id,
      email: p.email,
      fullName: p.full_name,
      employeeId: p.employee_id ?? "",
      isActive: p.is_active,
      role: roleOf.get(p.id) ?? "funcionario",
      lastSignInAt: p.ultimo_acesso ?? null,
      firstAccessAt: p.primeiro_acesso ?? null,
      syncedAt: p.sincronizado_em ?? null,
      linkedMicrosoft: !!p.entra_oid,
      invitedPending: !p.ultimo_acesso,
    }));
  });

export type SyncStatus = { executadoEm: string | null; sucesso: boolean | null; erro: string | null; alterados: number };

export const getSyncStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SyncStatus> => {
    await requireAdmin(context as unknown as RpcCtx);
    const { data } = await context.supabase.from("status_sincronizacao").select("*").maybeSingle();
    return {
      executadoEm: data?.executado_em ?? null,
      sucesso: data?.sucesso ?? null,
      erro: data?.erro ?? null,
      alterados: data?.alterados ?? 0,
    };
  });

export const syncNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context as unknown as RpcCtx);
    const { runEntraSync } = await import("@/lib/entra-sync.server");
    return runEntraSync();
  });

export const inviteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { email: string; fullName: string; employeeId: string; role: string; redirectTo: string }) => input)
  .handler(async ({ data, context }) => {
    await requireAdmin(context as unknown as RpcCtx);
    const clean = normalizeUserInput(data);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const dup = await supabaseAdmin.from("profiles").select("id").eq("email", clean.email).maybeSingle();
    if (dup.data) throw new Error("Este e-mail já está cadastrado.");
    if (clean.employeeId) {
      const dupId = await supabaseAdmin.from("profiles").select("id").ilike("employee_id", clean.employeeId).maybeSingle();
      if (dupId.data) throw new Error("Esta matrícula já está vinculada a outro usuário.");
    }

    const redirectTo = new URL("/definir-senha", data.redirectTo).toString();
    const invited = await supabaseAdmin.auth.admin.inviteUserByEmail(clean.email, {
      redirectTo,
      data: { full_name: clean.fullName, employee_id: clean.employeeId },
    });
    if (invited.error || !invited.data.user) throw friendly(invited.error?.message ?? "");
    const id = invited.data.user.id;

    const up = await supabaseAdmin
      .from("profiles")
      .upsert({ id, email: clean.email, full_name: clean.fullName, employee_id: clean.employeeId || null, is_active: true });
    if (up.error) throw friendly(up.error.message);
    await setRole(supabaseAdmin, id, clean.role);
    return { ok: true };
  });

export const updateUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; email: string; fullName: string; employeeId: string; role: string }) => input)
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as RpcCtx;
    await requireAdmin(ctx);
    const clean = normalizeUserInput(data);
    if (data.id === ctx.userId && clean.role !== "admin") {
      throw new Error("Você não pode remover o seu próprio acesso de administrador.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const dup = await supabaseAdmin.from("profiles").select("id").eq("email", clean.email).neq("id", data.id).maybeSingle();
    if (dup.data) throw new Error("Este e-mail já está cadastrado.");
    if (clean.employeeId) {
      const dupId = await supabaseAdmin
        .from("profiles").select("id").ilike("employee_id", clean.employeeId).neq("id", data.id).maybeSingle();
      if (dupId.data) throw new Error("Esta matrícula já está vinculada a outro usuário.");
    }

    const au = await supabaseAdmin.auth.admin.updateUserById(data.id, {
      email: clean.email,
      user_metadata: { full_name: clean.fullName, employee_id: clean.employeeId },
    });
    if (au.error) throw friendly(au.error.message);
    const up = await supabaseAdmin
      .from("profiles")
      .update({ email: clean.email, full_name: clean.fullName, employee_id: clean.employeeId || null })
      .eq("id", data.id);
    if (up.error) throw friendly(up.error.message);
    await setRole(supabaseAdmin, data.id, clean.role);
    return { ok: true };
  });

export const setUserActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; active: boolean }) => input)
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as RpcCtx;
    await requireAdmin(ctx);
    if (data.id === ctx.userId && !data.active) throw new Error("Você não pode desativar o seu próprio acesso.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Bloqueia o login no serviço de autenticação e o acesso aos dados no banco.
    const ban = await supabaseAdmin.auth.admin.updateUserById(data.id, {
      ban_duration: data.active ? "none" : "876000h",
    });
    if (ban.error) throw friendly(ban.error.message);
    const up = await supabaseAdmin.from("profiles").update({ is_active: data.active }).eq("id", data.id);
    if (up.error) throw friendly(up.error.message);
    return { ok: true };
  });

export const resendInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { email: string; redirectTo: string }) => input)
  .handler(async ({ data, context }) => {
    await requireAdmin(context as unknown as RpcCtx);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const redirectTo = new URL("/definir-senha", data.redirectTo).toString();
    const { error } = await supabaseAdmin.auth.resetPasswordForEmail(data.email.trim().toLowerCase(), { redirectTo });
    if (error) throw friendly(error.message);
    return { ok: true };
  });
