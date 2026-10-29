import { describe, expect, it } from "vitest";
import { elogiosVisiveis, type ItemLista } from "@/lib/feedback.rules";

const usuarios = new Map([["40", { email: "gestora@cronos.com", nome: "Gestora" }]]);
const p = (email: string) => ({ LookupId: 1, LookupValue: email, Email: email });
const itens: ItemLista[] = [
  { id: "1", fields: { field_4: "Elogio - EL", PROFISSIONALRESPONS_x00c1_VEL_NE: [p("ana@cronos.com")], GESTOR_CONSIDERACOESLookupId: "40" } },
  { id: "2", fields: { field_4: "Elogio - EL", PROFISSIONALRESPONS_x00c1_VEL_NE: [p("bia@cronos.com")] } },
  { id: "3", fields: { field_4: "Sugestão de Melhoria - SM", PROFISSIONALRESPONS_x00c1_VEL_NE: [p("ana@cronos.com")] } },
];

describe("elogiosVisiveis", () => {
  it("a pessoa vê só os próprios elogios", () => {
    expect(elogiosVisiveis(itens, "ANA@cronos.com", usuarios).map((e) => e.id)).toEqual(["1"]);
    expect(elogiosVisiveis(itens, "bia@cronos.com", usuarios).map((e) => e.id)).toEqual(["2"]);
  });
  it("registro que não é Elogio - EL nunca aparece", () => {
    expect(elogiosVisiveis(itens, "ana@cronos.com", usuarios).some((e) => e.id === "3")).toBe(false);
  });
  it("gestor vê os da equipe com o vínculo 'equipe'", () => {
    const r = elogiosVisiveis(itens, "gestora@cronos.com", usuarios);
    expect(r.map((e) => [e.id, e.vinculo])).toEqual([["1", "equipe"]]);
  });
  it("terceiro não recebe nada", () => {
    expect(elogiosVisiveis(itens, "outro@cronos.com", usuarios)).toEqual([]);
  });
});
