import { describe, expect, it } from "vitest";
import { feriasDosAtivos, retornoFerias } from "@/lib/ferias.rules";
import { principalNav, visibleModules } from "@/lib/portal-modules";

describe("Consulta de férias", () => {
  it("substitui o retorno automático pela data com dias extras preenchidos", () => {
    expect(retornoFerias({ Retorno: "2026-11-10T03:00:00Z", DiasExtrasdeAus_x00ea_ncia: 3, DatadeRetornocomDiasExtras: "2026-11-13T03:00:00Z" })).toBe("2026-11-13");
  });
  it("preserva o retorno automático sem dias extras", () => {
    expect(retornoFerias({ Retorno: "2026-11-10T03:00:00Z", DiasExtrasdeAus_x00ea_ncia: "", DatadeRetornocomDiasExtras: "2026-11-13T03:00:00Z" })).toBe("2026-11-10");
  });
  it("não apaga o retorno quando a data de extras está ausente", () => {
    expect(retornoFerias({ Retorno: "2026-11-10T03:00:00Z", DiasExtrasdeAus_x00ea_ncia: 3 })).toBe("2026-11-10");
  });
  it("consulta apenas profissionais ativos sem expor outros campos de RH", () => {
    const itens = ["ATIVO", "EFETIVADO/ATIVO", "DESLIGADO", "EFETIVADO/DESLIGADO"].map((status, i) => ({ id: String(i), fields: { Title: "Pessoa", StatusProfissional: status, Observa_x00e7__x00f5_es: "Privado" } }));
    const resultado = feriasDosAtivos(itens, new Map());
    expect(resultado.map(i => i.id)).toEqual(["0", "1"]);
    expect(resultado[0]).not.toHaveProperty("Observa_x00e7__x00f5_es");
  });
  it("disponibiliza férias no grupo Avisos para profissionais sem perfis extras", () => {
    expect(visibleModules([]).map(m => m.to)).toContain("/ferias");
    const grupo = principalNav([]).find(e => e.type === "group" && e.id === "avisos");
    expect(grupo?.type === "group" ? grupo.children.map(c => c.to) : []).toEqual(["/avisos", "/ferias"]);
  });
});