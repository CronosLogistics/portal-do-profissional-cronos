import { describe, expect, it } from "vitest";
import { montarDepartamentos, permissoesDepartamento, unirPendencias } from "@/lib/departamentos.rules";
const usuarios = new Map([
  ["43", { email: "matheus@cronos.test", nome: "Matheus Bernardes" }],
  ["56", { email: "ana@cronos.test", nome: "Ana Bueno" }],
  ["53", { email: "alexey@cronos.test", nome: "Alexey" }],
  ["80", { email: "pessoa@cronos.test", nome: "Pessoa" }],
]);
const departamento = { id: "30", fields: { Title: "ADMINISTRATIVO ESCRITÓRIO CAXIAS DO SUL", L_x00ed_derDiretoLookupId: "43", CoordenadorLookupId: "56", Supervisor: [{ LookupId: 53 }], Permiss_x00f5_esdoL_x00ed_der: ["Visualização", "Visualizar pendências dos liderados"], Permiss_x00e3_odoCoordenador: ["Visualização", "Visualizar pendências"], Permiss_x00f5_esdoSupervisor: ["Visualização"], Permiss_x00f5_esdosLiderados: ["Visualização"] } };
const profissional = { id: "1", fields: { field_1: "ATIVO", SETORLookupId: "30", E_x002d_MAILCORPORATIVOLookupId: "80" } };
describe("setores e hierarquia do SharePoint", () => {
  it("usa departamento atual em vez do departamento de contratação", () => {
    const novo = { id: "31", fields: { ...departamento.fields, Title: "Departamento atual" } };
    const p = { ...profissional, fields: { ...profissional.fields, DEPARTAMENTOATUALLookupId: "31" } };
    const pessoa = montarDepartamentos([departamento, novo], [p], usuarios).pessoas.find(p => p.email === "pessoa@cronos.test");
    expect(pessoa?.departamento).toBe("31");
    expect(pessoa?.vinculos).toEqual([{ departamento: "31", nivel: "liderado" }]);
  });
  it("novo contratado recebe setor e perfil da contratação quando atual está vazio", () => {
    const p = { ...profissional, fields: { ...profissional.fields, DEPARTAMENTOATUALLookupId: "" } };
    const pessoa = montarDepartamentos([departamento], [p], usuarios).pessoas.find(p => p.email === "pessoa@cronos.test");
    expect(pessoa?.departamento).toBe("30");
    expect(pessoa?.vinculos).toEqual([{ departamento: "30", nivel: "liderado" }]);
  });
  it("departamento atual desconhecido não restaura acesso ao setor anterior", () => {
    const p = { ...profissional, fields: { ...profissional.fields, DEPARTAMENTOATUALLookupId: "999" } };
    const pessoa = montarDepartamentos([departamento], [p], usuarios).pessoas.find(p => p.email === "pessoa@cronos.test");
    expect(pessoa?.departamento).toBeNull();
    expect(pessoa?.vinculos).toEqual([]);
  });
  it("vincula setor pelo lookup corporativo, não pelo nome", () => {
    expect(montarDepartamentos([departamento], [profissional], usuarios).pessoas.find(p => p.email === "pessoa@cronos.test")?.departamento).toBe("30");
  });
  it("Matheus vê Ana e Alexey em Caxias", () => {
    const s = montarDepartamentos([departamento], [profissional], usuarios);
    expect(s.hierarquia.filter(h => h.lider === "matheus@cronos.test").map(h => h.liderado)).toEqual(expect.arrayContaining(["ana@cronos.test", "alexey@cronos.test"]));
  });
  it("Ana vê Alexey, mas não Matheus", () => {
    const s = montarDepartamentos([departamento], [], usuarios);
    expect(s.hierarquia.filter(h => h.lider === "ana@cronos.test").map(h => h.liderado)).toEqual(["alexey@cronos.test"]);
  });
  it("Alexey com apenas visualização não vê pendências de outros", () => {
    expect(montarDepartamentos([departamento], [profissional], usuarios).hierarquia.filter(h => h.lider === "alexey@cronos.test")).toEqual([]);
    expect(permissoesDepartamento(departamento.fields, "supervisor")).toEqual([]);
  });
  it("supervisor autorizado vê liderados mas não coordenador", () => {
    const s = montarDepartamentos([{ ...departamento, fields: { ...departamento.fields, Permiss_x00f5_esdoSupervisor: ["Visualizar pendências"] } }], [profissional], usuarios);
    expect(s.hierarquia.filter(h => h.lider === "alexey@cronos.test").map(h => h.liderado)).toEqual(["pessoa@cronos.test"]);
  });
  it("não inclui pessoas de outro departamento nem identidades duplicadas", () => {
    const s = montarDepartamentos([departamento], [{ ...profissional, fields: { ...profissional.fields, SETORLookupId: "99" } }], usuarios);
    expect(s.hierarquia.some(h => h.liderado === "pessoa@cronos.test")).toBe(false);
    expect(montarDepartamentos([departamento], [profissional, profissional], usuarios).pessoas.find(p => p.email === "pessoa@cronos.test")?.vinculos).toEqual([]);
  });
  it("permissões desconhecidas não concedem acesso", () => {
    expect(permissoesDepartamento({ Permiss_x00f5_esdosLiderados: ["Visualização", "Gerenciar usuários", "Inventada"] }, "liderado")).toEqual([]);
  });
  it("não duplica a mesma pendência por responsável e gestor", () => {
    expect(unirPendencias(["matheus", "ana"], () => [{ id: "10", nome: "Item" }])).toEqual([{ id: "10", nome: "Item" }]);
  });
});