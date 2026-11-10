import { describe, it, expect } from "vitest";
import { pessoasDoUsuario } from "./pendencias-pessoas.rules";
const u = new Map([["7", { email: "a@x.com", nome: "A" }]]);
const run = (tipo: "anexos" | "agendamento", status: string) =>
  pessoasDoUsuario(tipo, [{ id: "1", fields: { Title: "T", Respons_x00e1_velLookupId: "7", Respons_x00e1_velpeloTreinamentoLookupId: "7", [tipo === "anexos" ? "Status" : "StatusdoTreinamento"]: status } } as never], "a@x.com", false, u, new Date());
describe("Anexos e Agendamento listam só Status Pendente", () => {
  for (const t of ["anexos", "agendamento"] as const) {
    it(`${t}: pendente aparece`, () => expect(run(t, "Pendente")).toHaveLength(1));
    it(`${t}: cancelado some`, () => expect(run(t, "Cancelado")).toHaveLength(0));
    it(`${t}: vazio some`, () => expect(run(t, "")).toHaveLength(0));
  }
});
