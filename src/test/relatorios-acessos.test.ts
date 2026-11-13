import { describe, expect, it } from "vitest";
import { diasSemAcessar, indicadores, situacao, type UsuarioAcesso } from "@/lib/relatorios-acessos.rules";

const u = (id: string, ativo: boolean, ultimo: string | null, dep = "TI"): UsuarioAcesso => ({ usuario_id: id, nome: id, email: `${id}@x`, departamento: dep, ativo, primeiro_acesso: ultimo, ultimo_acesso: ultimo, total_acessos: 0, acessos_30d: 0 });
const agora = new Date("2026-11-13T12:00:00Z");

describe("relatório de acessos", () => {
  it("conta dias sem acessar pelo dia de Brasília", () => {
    expect(diasSemAcessar("2026-11-10T15:00:00Z", agora)).toBe(3);
    expect(diasSemAcessar(null, agora)).toBeNull();
  });
  it("classifica situação", () => {
    expect(situacao(u("a", false, "2026-11-01T00:00:00Z"))).toBe("Inativo");
    expect(situacao(u("a", true, null))).toBe("Nunca acessou");
  });
  it("adesão considera só profissionais ativos", () => {
    const r = indicadores([u("a", true, "x"), u("b", true, null), u("c", false, "x")],
      [{ usuario_id: "a", acessado_em: "2026-11-12T12:00:00Z" }, { usuario_id: "a", acessado_em: "2026-11-13T12:00:00Z" }, { usuario_id: "c", acessado_em: "2026-11-13T12:00:00Z" }], 30, agora);
    expect(r.usuariosAtivos).toBe(2);
    expect(r.acessaramNoPeriodo).toBe(1);
    expect(r.adesao).toBe(0.5);
    expect(r.totalAcessos).toBe(2);
    expect(r.top[0]).toMatchObject({ nome: "a", acessos: 2 });
  });
});
