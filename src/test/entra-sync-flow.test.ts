import { beforeEach, describe, expect, it, vi } from "vitest";
import { runEntraSync } from "@/lib/entra-sync.server";
import type { EntraUser, ProfileRow } from "@/lib/entra-sync.rules";

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(), from: vi.fn(), ban: vi.fn(), ativos: vi.fn(), departments: vi.fn(), provision: vi.fn(),
}));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: {
  rpc: mocks.rpc, from: mocks.from, auth: { admin: { updateUserById: mocks.ban } },
} }));
vi.mock("@/lib/perfil.server", () => ({ cadastrosAtivos: mocks.ativos }));
vi.mock("@/lib/departamentos.server", () => ({ sincronizarDepartamentos: mocks.departments }));
vi.mock("@/lib/entra-admissions.server", () => ({ provisionarAdmitido: mocks.provision }));

const user: EntraUser = { id: "11111111-1111-4111-8111-111111111111", displayName: "Ana Souza", mail: "ana@cronos.com", userPrincipalName: null, accountEnabled: true, employeeId: null, userType: "Member" };
const profile: ProfileRow = { id: "auth-ana", email: "ana@cronos.com", full_name: "Ana Souza", entra_oid: user.id, employee_id: null, is_active: true };

function database(profiles: ProfileRow[] = []) {
  const update = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
  const status = vi.fn().mockResolvedValue({ error: null });
  mocks.from.mockImplementation((table: string) => {
    if (table === "status_sincronizacao") return { upsert: status };
    return { select: () => ({ order: () => ({ range: async () => ({ data: profiles, error: null }) }) }), update };
  });
  return { update, status };
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("LOVABLE_API_KEY", "test-key");
  vi.stubEnv("AZURE_GRAPH_API_KEY", "test-graph-key");
  mocks.rpc.mockResolvedValue({ data: true, error: null });
  mocks.ativos.mockResolvedValue(new Map([[user.mail, {}]]));
  mocks.ban.mockResolvedValue({ error: null });
  mocks.departments.mockResolvedValue(undefined);
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ value: [user] }))));
});

describe("fluxo diário/manual de atualização do organograma", () => {
  it("inclui o admitido antes de atualizar setores e liderança", async () => {
    database();
    const result = await runEntraSync({ origem: "manual", disparadoPor: "admin-id" });
    expect(result).toMatchObject({ sucesso: true, incluidos: 1, alterados: 1 });
    expect(mocks.provision).toHaveBeenCalledTimes(1);
    const admitted = mocks.provision.mock.invocationCallOrder[0];
    const departments = mocks.departments.mock.invocationCallOrder[0];
    expect(admitted).toBeTypeOf("number");
    expect(departments).toBeTypeOf("number");
    expect((admitted ?? Infinity) < (departments ?? -Infinity)).toBe(true);
    expect(mocks.departments).toHaveBeenCalledWith(true);
  });
  it("uma segunda sincronização não duplica o perfil já criado", async () => {
    database([profile]);
    expect(await runEntraSync()).toMatchObject({ sucesso: true, incluidos: 0 });
    expect(mocks.provision).not.toHaveBeenCalled();
  });
  it("bloqueia e inativa um desligado sem criar nova conta", async () => {
    const db = database([profile]);
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ value: [{ ...user, accountEnabled: false }] })));
    expect(await runEntraSync()).toMatchObject({ sucesso: true, incluidos: 0, alterados: 1 });
    expect(mocks.ban).toHaveBeenCalledWith("auth-ana", { ban_duration: "876000h" });
    expect(db.update).toHaveBeenCalledWith(expect.objectContaining({ is_active: false }));
  });
  it("não grava quando a leitura do SharePoint falha", async () => {
    const db = database([profile]);
    mocks.ativos.mockRejectedValue(new Error("SharePoint indisponível"));
    expect(await runEntraSync()).toMatchObject({ sucesso: false, alterados: 0 });
    expect(db.update).not.toHaveBeenCalled();
    expect(mocks.provision).not.toHaveBeenCalled();
  });
  it("preserva profissionais quando o Microsoft retorna uma coleção vazia", async () => {
    const db = database([profile]);
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ value: [] })));
    expect(await runEntraSync()).toMatchObject({ sucesso: false, alterados: 0 });
    expect(db.update).not.toHaveBeenCalled();
    expect(mocks.ban).not.toHaveBeenCalled();
  });
  it("a trava impede duas sincronizações simultâneas", async () => {
    mocks.rpc.mockResolvedValue({ data: false, error: null });
    expect(await runEntraSync()).toMatchObject({ emAndamento: true, incluidos: 0 });
    expect(fetch).not.toHaveBeenCalled();
  });
  it("limita o lote a 50 admissões e informa as restantes", async () => {
    database();
    const users = Array.from({ length: 51 }, (_, i) => ({ ...user, id: `11111111-1111-4111-8111-${String(i).padStart(12, "0")}`, mail: `p${i}@cronos.com` }));
    mocks.ativos.mockResolvedValue(new Map(users.map((u) => [u.mail, {}])));
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ value: users })));
    expect(await runEntraSync()).toMatchObject({ sucesso: true, incluidos: 50, pendentes: 1 });
    expect(mocks.provision).toHaveBeenCalledTimes(50);
  });
  it("uma falha ao bloquear desligado nunca é registrada como sincronização bem-sucedida", async () => {
    const db = database([profile]);
    mocks.ban.mockResolvedValue({ error: { message: "falhou" } });
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ value: [{ ...user, accountEnabled: false }] })));
    expect(await runEntraSync()).toMatchObject({ sucesso: false });
    expect(db.update).not.toHaveBeenCalled();
  });
});