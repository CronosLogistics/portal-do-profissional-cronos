import { beforeEach, describe, expect, it, vi } from "vitest";
import { sincronizarDepartamentos } from "@/lib/departamentos.server";

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), from: vi.fn() }));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: mocks }));

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-key");
  mocks.from.mockReturnValue({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { atualizado_em: new Date().toISOString(), erro: null }, error: null }) }) }) });
  mocks.rpc.mockResolvedValue({ data: false, error: null });
});

describe("atualização de setores após admissão", () => {
  it("não informa sucesso na atualização forçada quando outra sincronização mantém a trava", async () => {
    await expect(sincronizarDepartamentos(true)).rejects.toThrow("Setores em atualização");
    expect(mocks.rpc).toHaveBeenCalledWith("reservar_departamentos");
  });
  it("preserva a consulta comum quando os setores já estão atualizados", async () => {
    await expect(sincronizarDepartamentos()).resolves.toBeUndefined();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});