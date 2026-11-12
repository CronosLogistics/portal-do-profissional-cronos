import { describe, expect, it } from "vitest";
import { mencoesEmHtml, partesMencao, tokenMencao } from "./mencoes";

describe("menções", () => {
  it("gera token de pessoa e de departamento", () => {
    expect(tokenMencao({ tipo: "pessoa", id: "11111111-1111-1111-1111-111111111111", nome: "Maria [Silva]" })).toBe("@[Maria Silva](u:11111111-1111-1111-1111-111111111111)");
    expect(tokenMencao({ tipo: "departamento", id: "3", nome: "Comercial" })).toBe("@[Comercial](d:3)");
  });
  it("separa texto e menções", () => {
    expect(partesMencao("Oi @[Ana](u:11111111-1111-1111-1111-111111111111) e @[TI](d:2)!")).toEqual([{ texto: "Oi " }, { nome: "Ana", departamento: false }, { texto: " e " }, { nome: "TI", departamento: true }, { texto: "!" }]);
  });
  it("escapa o nome ao virar destaque no aviso", () => {
    expect(mencoesEmHtml('@[<b>x</b>](d:1)')).toBe('<span class="chip-mencao is-depto">@&lt;b&gt;x&lt;/b&gt;</span>');
  });
});
