// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ adminFrom: vi.fn() }));
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const builder = {
      middleware: () => builder,
      inputValidator: () => builder,
      handler: (handler: unknown) => handler,
    };
    return builder;
  },
}));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: { from: mocks.adminFrom },
}));

import { registrarAcesso } from "./access.functions";
import { escopoDepartamento, sincronizarDepartamentos } from "./departamentos.server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

function clientFor(isActive: boolean, error: unknown = null) {
  const maybeSingle = vi.fn().mockResolvedValue({ data: { is_active: isActive, email: "professional@example.test" }, error });
  const eq = vi.fn().mockReturnValue({ maybeSingle });
  const select = vi.fn().mockReturnValue({ eq });
  return {
    from: vi.fn().mockReturnValue({ select }),
    rpc: vi.fn().mockResolvedValue({ data: { departamento: "QUALIDADE", gestaoPessoas: false, emails: ["professional@example.test"] }, error: null }),
  };
}
const invokeRegistration = registrarAcesso as unknown as (input: { data: { providerToken: null }; context: { userId: string; supabase: ReturnType<typeof clientFor> } }) => Promise<unknown>;

afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });

describe("desenvolvimento local sem credencial administrativa", () => {
  it("ignora a sincronização sem acessar o cliente administrativo, mesmo forçada", async () => {
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    await sincronizarDepartamentos(true);
    expect(mocks.adminFrom).not.toHaveBeenCalled();
  });

  it("consulta o escopo existente com o cliente autenticado", async () => {
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    const client = clientFor(true);
    const result = await escopoDepartamento(client as unknown as SupabaseClient<Database>, "current-user");
    expect(result.departamento).toBe("QUALIDADE");
    expect(client.rpc).toHaveBeenCalledWith("meu_escopo_departamento");
    expect(mocks.adminFrom).not.toHaveBeenCalled();
  });

  it("permite o acesso de um profissional ativo sem gravar identidade ou histórico", async () => {
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    const client = clientFor(true);
    expect(await invokeRegistration({ data: { providerToken: null }, context: { userId: "current-user", supabase: client } })).toEqual({ ok: true, registroIgnorado: true });
    expect(client.from).toHaveBeenCalledWith("profiles");
    expect(mocks.adminFrom).not.toHaveBeenCalled();
  });

  it("não libera profissional inativo", async () => {
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    await expect(invokeRegistration({ data: { providerToken: null }, context: { userId: "current-user", supabase: clientFor(false) } })).rejects.toThrow("Profissional não disponível.");
  });

  it("não ignora falhas na consulta do perfil", async () => {
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    await expect(invokeRegistration({ data: { providerToken: null }, context: { userId: "current-user", supabase: clientFor(true, { message: "denied" }) } })).rejects.toThrow("Profissional não disponível.");
  });

  it("preserva a consulta administrativa quando a credencial está configurada", async () => {
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-only-credential");
    mocks.adminFrom.mockReturnValue({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { atualizado_em: new Date().toISOString(), erro: null }, error: null }) }) }) });
    await sincronizarDepartamentos();
    expect(mocks.adminFrom).toHaveBeenCalledWith("departamentos_sincronizacao");
  });

  it("não ignora credencial ausente fora do desenvolvimento", async () => {
    vi.stubEnv("DEV", false);
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    mocks.adminFrom.mockImplementation(() => { throw new Error("Missing credentials"); });
    await expect(sincronizarDepartamentos()).rejects.toThrow("Missing credentials");
    expect(mocks.adminFrom).toHaveBeenCalled();
  });
});