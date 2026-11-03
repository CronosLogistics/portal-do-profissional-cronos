import { describe, expect, it } from "vitest";
import { pessoasDoUsuario, ehGestaoPessoas, type TipoPendenciaPessoas } from "../lib/pendencias-pessoas.rules";

const users = new Map([["1", { email: "gestor@cronos.com", nome: "Gestor" }], ["2", { email: "rh@cronos.com", nome: "Responsável RH" }], ["3", { email: "autor@cronos.com", nome: "Autor" }]]);
const agora = new Date("2026-11-03T12:00:00-03:00");
const item = { id: "10", fields: { Title: "Profissional", GestorRespons_x00e1_velLookupId: "1", Respons_x00e1_velLookupId: "2", Respons_x00e1_velpeloTreinamentoLookupId: "2", AutorLookupId: "3" } };
const ver = (tipo: TipoPendenciaPessoas, email: string, gp = false) => pessoasDoUsuario(tipo, [item], email, gp, users, agora);
describe("Pendências de Gestão de Pessoas", () => {
  it("Avaliação de Experiência é do gestor ou GP, não do responsável RH isoladamente", () => {
    expect(ver("experiencia", "GESTOR@cronos.com")).toHaveLength(1);
    expect(ver("experiencia", "rh@cronos.com")).toHaveLength(0);
    expect(ver("experiencia", "gp@cronos.com", true)[0]?.responsavel).toBe("Responsável RH");
  });
  it.each(["agendamento", "anexos", "rq0244"] as const)("%s é do responsável ou GP", tipo => {
    expect(ver(tipo, "rh@cronos.com")).toHaveLength(1);
    expect(ver(tipo, "gp@cronos.com", true)).toHaveLength(1);
    expect(ver(tipo, "outro@cronos.com")).toHaveLength(0);
  });
  it("RQ-02-16 somente GP", () => {
    expect(ver("rq0216", "rh@cronos.com")).toHaveLength(0);
    expect(ver("rq0216", "gp@cronos.com", true)).toHaveLength(1);
  });
  it("Feedback é do Autor ou GP", () => {
    expect(ver("feedback", "autor@cronos.com")).toHaveLength(1);
    expect(ver("feedback", "rh@cronos.com")).toHaveLength(0);
    expect(ver("feedback", "gp@cronos.com", true)).toHaveLength(1);
  });
  it("GP exige perfil ativo e não é inferido de Administrador", () => {
    expect(ehGestaoPessoas([{ nome: "Gestão de Pessoas", ativo: true }])).toBe(true);
    expect(ehGestaoPessoas([{ nome: "Gestão de Pessoas", ativo: false }, { nome: "Administrador", ativo: true }])).toBe(false);
  });
  it("não lista itens finalizados", () => {
    expect(pessoasDoUsuario("anexos", [{ ...item, fields: { ...item.fields, Status: "Finalizado" } }], "rh@cronos.com", false, users, agora)).toHaveLength(0);
  });
  it("recalcula prazos de RQ em 30 e 7 dias", () => {
    const i = { ...item, fields: { ...item.fields, Admiss_x00e3_o: "2026-11-01T03:00:00Z" } };
    expect(pessoasDoUsuario("rq0244", [i], "gp@cronos.com", true, users, agora)[0]?.dias).toBe(28);
    expect(pessoasDoUsuario("rq0216", [i], "gp@cronos.com", true, users, agora)[0]?.dias).toBe(5);
  });
});