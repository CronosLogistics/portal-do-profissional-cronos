import { describe, expect, it } from "vitest";
import { elegivelRanking, ordenarPontuacoes } from "@/lib/ranking.rules";

describe("ranking de treinamentos", () => {
  it("exclui coordenadores pelo cargo ou pelo vínculo, inclusive Luis Casara", () => {
    expect(elegivelRanking("Coordenador de Operações", ["liderado"])).toBe(false);
    expect(elegivelRanking("Analista", ["coordenador"])).toBe(false);
    expect(elegivelRanking("Coordenadora", [])).toBe(false);
  });
  it("exclui supervisores pelo cargo ou por qualquer vínculo departamental", () => {
    expect(elegivelRanking("Supervisora de Qualidade", [])).toBe(false);
    expect(elegivelRanking(null, ["liderado", "supervisor"])).toBe(false);
  });
  it("mantém profissionais sem os dois níveis impedidos", () => {
    expect(elegivelRanking("Programador", ["liderado"])).toBe(true);
  });
  it("prioriza pontuação e desempata pela data mais antiga sem alterar a entrada", () => {
    const linhas = [
      { nome: "Ingryd", pontos: 300, data: "2026-11-01" },
      { nome: "Julia", pontos: 400, data: "2026-11-20" },
      { nome: "Luis", pontos: 300, data: "2026-10-01" },
    ];
    expect(ordenarPontuacoes(linhas).map(l => l.nome)).toEqual(["Julia", "Luis", "Ingryd"]);
    expect(linhas[0]?.nome).toBe("Ingryd");
  });
  it("seleciona três elegíveis depois da exclusão, preenchendo a vaga de Luis", () => {
    const candidatos = [
      { nome: "Julia", pontos: 400, data: "2026-11-20", cargo: "Analista" },
      { nome: "Luis", pontos: 300, data: "2026-10-01", cargo: "Coordenador" },
      { nome: "Ingryd", pontos: 300, data: "2026-11-01", cargo: "Analista" },
      { nome: "Supervisor", pontos: 290, data: "2026-10-01", cargo: "Supervisor" },
      { nome: "Próximo", pontos: 200, data: "2026-10-01", cargo: "Assistente" },
    ];
    expect(ordenarPontuacoes(candidatos).filter(l => elegivelRanking(l.cargo, [])).slice(0, 3).map(l => l.nome))
      .toEqual(["Julia", "Ingryd", "Próximo"]);
  });
});