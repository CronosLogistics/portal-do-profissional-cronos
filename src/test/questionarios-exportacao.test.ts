import { describe, expect, it } from "vitest";
import { montarPlanilhaResultados, nomeArquivoResultados } from "../lib/questionarios.rules";

describe("exportação de resultados", () => {
  it("monta planilha anônima sem identidade e ignora blocos", () => {
    const planilha = montarPlanilhaResultados(
      { titulo: "Clima", anonimo: true },
      [{
        nome: null,
        email: null,
        perguntas: [
          { id: "b1", tipo: "bloco", enunciado: "<p>Intro</p>" },
          { id: "p1", tipo: "texto", enunciado: "Como está?" },
          { id: "p2", tipo: "checkbox", enunciado: "Itens", opcoes: ["A", "B"] },
        ],
        respostas: [null, "Bem", ["A", "B"]],
      }],
    );
    expect(planilha.nomeArquivo).toBe("resultados-Clima.xlsx");
    expect(planilha.cabecalhos).toEqual(["Resposta", "Como está?", "Itens"]);
    expect(planilha.linhas).toEqual([["1", "Bem", "A, B"]]);
  });

  it("inclui nome e e-mail em formulários identificados e une perguntas de snapshots distintos", () => {
    const planilha = montarPlanilhaResultados(
      { titulo: "Pesquisa</nome>", anonimo: false },
      [
        {
          nome: "Ana",
          email: "ana@test",
          perguntas: [{ id: "p1", tipo: "texto", enunciado: "Antiga?" }],
          respostas: ["Sim"],
        },
        {
          nome: "Bruno",
          email: "bruno@test",
          perguntas: [
            { id: "p1", tipo: "texto", enunciado: "Antiga?" },
            { id: "p2", tipo: "radio", enunciado: "Nova?", opcoes: ["Ok", "Não"] },
          ],
          respostas: ["Talvez", "Ok"],
        },
      ],
    );
    expect(planilha.nomeArquivo).toBe("resultados-Pesquisanome.xlsx");
    expect(planilha.cabecalhos).toEqual(["Resposta", "Nome", "E-mail", "Antiga?", "Nova?"]);
    expect(planilha.linhas).toEqual([
      ["1", "Ana", "ana@test", "Sim", ""],
      ["2", "Bruno", "bruno@test", "Talvez", "Ok"],
    ]);
  });

  it("gera nome de arquivo seguro quando o título é vazio", () => {
    expect(nomeArquivoResultados("   ")).toBe("resultados-questionario.xlsx");
  });
});
