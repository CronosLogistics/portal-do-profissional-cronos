import { describe, expect, it } from "vitest";
import { compararValoresOrdenacao, ordenarItensTabela, proximaOrdenacao } from "@/lib/tabela-ordenacao";

describe("tabela-ordenacao", () => {
  it("alterna crescente, decrescente e limpa", () => {
    expect(proximaOrdenacao(null, "nome")).toEqual({ coluna: "nome", direcao: "asc" });
    expect(proximaOrdenacao({ coluna: "nome", direcao: "asc" }, "nome")).toEqual({ coluna: "nome", direcao: "desc" });
    expect(proximaOrdenacao({ coluna: "nome", direcao: "desc" }, "nome")).toBeNull();
    expect(proximaOrdenacao({ coluna: "nome", direcao: "asc" }, "status")).toEqual({ coluna: "status", direcao: "asc" });
  });

  it("ordena textos e números e deixa nulos por último", () => {
    const itens = [
      { nome: "Bruno", dias: null },
      { nome: "Ana", dias: 2 },
      { nome: "Carla", dias: 10 },
    ];
    expect(ordenarItensTabela(itens, { coluna: "nome", direcao: "asc" }, { nome: (i) => i.nome }).map((i) => i.nome))
      .toEqual(["Ana", "Bruno", "Carla"]);
    expect(ordenarItensTabela(itens, { coluna: "dias", direcao: "asc" }, { dias: (i) => i.dias }).map((i) => i.nome))
      .toEqual(["Ana", "Carla", "Bruno"]);
    expect(compararValoresOrdenacao("10", "2", "asc")).toBeGreaterThan(0);
  });
});
