import { describe, expect, it } from "vitest";
import { normalizarImportacao } from "@/lib/questionarios-importacao.rules";

const id = () => "id";

describe("importação do Microsoft Forms", () => {
  it("mantém escolha única com todas as opções", () => {
    const r = normalizarImportacao({ titulo: "T", descricao: "", perguntas: [{ tipo: "radio", enunciado: "Tipo de cadastro", descricao: null, opcoes: ["CPF", "CNPJ"] }] }, id);
    expect(r.perguntas[0]).toEqual({ id: "id", tipo: "radio", enunciado: "Tipo de cadastro", opcoes: ["CPF", "CNPJ"] });
  });
  it("converte escolha com menos de duas opções em texto aberto", () => {
    const r = normalizarImportacao({ titulo: "T", descricao: "", perguntas: [{ tipo: "checkbox", enunciado: "Serviços", descricao: null, opcoes: ["Único"] }] }, id);
    expect(r.perguntas[0]?.tipo).toBe("texto");
  });
  it("limita a 30 itens", () => {
    const perguntas = Array.from({ length: 40 }, (_, i) => ({ tipo: "texto", enunciado: `P${i}`, descricao: null, opcoes: [] }));
    expect(normalizarImportacao({ titulo: "T", descricao: "", perguntas }, id).perguntas).toHaveLength(30);
  });
});
