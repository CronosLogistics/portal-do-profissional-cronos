import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { entraEmail, type EntraUser } from "./entra-sync.rules";

/** Never sends invitations, creates passwords, confirms email or changes an existing account's roles. */
export async function provisionarAdmitido(admin: SupabaseClient<Database>, user: EntraUser, sincronizadoEm: string) {
  const email = entraEmail(user);
  const fullName = user.displayName?.trim() ?? "";
  const employeeId = user.employeeId?.trim() || null;
  const created = await admin.auth.admin.createUser({
    email,
    user_metadata: { full_name: fullName, employee_id: employeeId },
  });
  let id = created.data.user?.id;
  if (created.error) {
    // An interrupted run or concurrent first Microsoft login may already have created Auth.
    if (!["email_exists", "user_already_exists"].includes(created.error.code ?? "")) {
      throw new Error(`Não foi possível cadastrar um admitido [${created.error.status ?? "erro"}]: ${created.error.message}`);
    }
    for (let page = 1; page <= 100; page++) {
      const result = await admin.auth.admin.listUsers({ page, perPage: 1000 });
      if (result.error) throw new Error("Não foi possível verificar uma conta já existente.");
      id = result.data.users.find((u) => u.email?.trim().toLowerCase() === email)?.id;
      if (id || result.data.users.length < 1000) break;
    }
  }
  if (!id) throw new Error("Não foi possível identificar a conta do admitido.");
  const existing = await admin.from("profiles").select("id,entra_oid").eq("id", id).maybeSingle();
  if (existing.error) throw new Error("Não foi possível verificar o cadastro do admitido.");
  if (existing.data?.entra_oid && existing.data.entra_oid !== user.id) {
    throw new Error("A conta já está vinculada a outra identidade Microsoft; o vínculo foi preservado.");
  }
  const values = { email, full_name: fullName, employee_id: employeeId, entra_oid: user.id, is_active: true, sincronizado_em: sincronizadoEm };
  if (!existing.data) {
    const result = await admin.from("profiles").insert({ id, ...values });
    if (result.error) throw new Error("Não foi possível concluir o cadastro do admitido; tente sincronizar novamente.");
  } else {
    const update = admin.from("profiles").update(values).eq("id", id);
    const guarded = existing.data.entra_oid ? update.eq("entra_oid", user.id) : update.is("entra_oid", null);
    const result = await guarded.select("id").maybeSingle();
    if (result.error || !result.data) throw new Error("O cadastro do admitido mudou durante a sincronização; tente novamente.");
  }
}