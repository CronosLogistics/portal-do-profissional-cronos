import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { provisionarAdmitido } from "@/lib/entra-admissions.server";
import type { EntraUser } from "@/lib/entra-sync.rules";

const user: EntraUser = { id: "11111111-1111-4111-8111-111111111111", displayName: "Ana Souza", mail: "Ana@Cronos.com", userPrincipalName: null, accountEnabled: true, employeeId: "123", userType: "Member" };
const now = "2026-11-24T13:39:00Z";

function fixture(opts: { duplicate?: boolean; boundOid?: string; failed?: boolean; missingProfile?: boolean } = {}) {
  const createUser = vi.fn().mockResolvedValue(opts.failed
    ? { data: { user: null }, error: { code: "unexpected_failure", status: 500, message: "Falha" } }
    : opts.duplicate
      ? { data: { user: null }, error: { code: "email_exists", status: 422 } }
      : { data: { user: { id: "auth-ana" } }, error: null });
  const listUsers = vi.fn().mockResolvedValue({ data: { users: [{ id: "auth-ana", email: "ana@cronos.com" }] }, error: null });
  const read = { data: opts.missingProfile ? null : { id: "auth-ana", entra_oid: opts.boundOid ?? null }, error: null };
  const write = { data: { id: "auth-ana" }, error: null };
  const query = {
    select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), is: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValueOnce(read).mockResolvedValue(write),
    update: vi.fn().mockReturnThis(), insert: vi.fn().mockResolvedValue({ error: null }),
  };
  const from = vi.fn().mockReturnValue(query);
  const admin = { auth: { admin: { createUser, listUsers } }, from } as unknown as SupabaseClient<Database>;
  return { admin, createUser, listUsers, from, query };
}

describe("provisionamento corporativo", () => {
  it("cria uma conta sem senha, convite ou confirmação de e-mail automática", async () => {
    const f = fixture();
    await provisionarAdmitido(f.admin, user, now);
    expect(f.createUser).toHaveBeenCalledWith({ email: "ana@cronos.com", user_metadata: { full_name: "Ana Souza", employee_id: "123" } });
  });
  it("vincula o ID Microsoft no mesmo perfil criado pelo mecanismo existente", async () => {
    const f = fixture();
    await provisionarAdmitido(f.admin, user, now);
    expect(f.query.update).toHaveBeenCalledWith({ email: "ana@cronos.com", full_name: "Ana Souza", employee_id: "123", entra_oid: user.id, is_active: true, sincronizado_em: now });
    expect(f.query.is).toHaveBeenCalledWith("entra_oid", null);
    expect(f.query.eq).toHaveBeenCalledWith("id", "auth-ana");
  });
  it("reutiliza uma conta existente em vez de gerar um segundo profissional", async () => {
    const f = fixture({ duplicate: true });
    await provisionarAdmitido(f.admin, user, now);
    expect(f.listUsers).toHaveBeenCalledTimes(1);
    expect(f.query.eq).toHaveBeenCalledWith("id", "auth-ana");
    expect(f.query.insert).not.toHaveBeenCalled();
  });
  it("preserva um vínculo preexistente com outra identidade Microsoft", async () => {
    const f = fixture({ duplicate: true, boundOid: "outro-oid" });
    await expect(provisionarAdmitido(f.admin, user, now)).rejects.toThrow("vínculo foi preservado");
    expect(f.query.update).not.toHaveBeenCalled();
  });
  it("não altera perfis de acesso nem ajustes manuais do organograma", async () => {
    const f = fixture();
    await provisionarAdmitido(f.admin, user, now);
    expect(f.from.mock.calls.map((c) => c[0])).toEqual(["profiles", "profiles"]);
  });
  it("permite retomar uma conta existente que ainda não tem perfil", async () => {
    const f = fixture({ duplicate: true, missingProfile: true });
    await provisionarAdmitido(f.admin, user, now);
    expect(f.query.insert).toHaveBeenCalledWith(expect.objectContaining({ id: "auth-ana", entra_oid: user.id, email: "ana@cronos.com" }));
  });
  it("não trata falhas de criação como sucesso", async () => {
    const f = fixture({ failed: true });
    await expect(provisionarAdmitido(f.admin, user, now)).rejects.toThrow("Não foi possível cadastrar");
    expect(f.query.update).not.toHaveBeenCalled();
  });
});