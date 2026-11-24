import { describe, expect, it } from "vitest";
import { computePatch, matchEntraUser, novosAdmitidos, MAX_ADMISSOES_POR_SYNC, type EntraUser, type ProfileRow } from "@/lib/entra-sync.rules";

const profile: ProfileRow = { id: "p1", email: "ana@cronos.com", full_name: "Ana", employee_id: null, is_active: true, entra_oid: "oid-1" };
const entra: EntraUser = { id: "oid-1", displayName: "Ana Souza", mail: "Ana@Cronos.com", userPrincipalName: null, accountEnabled: true, employeeId: "123" };

describe("sincronização com o Entra ID", () => {
  it("inativa quem teve a conta Microsoft bloqueada", () => {
    expect(computePatch(profile, { ...entra, accountEnabled: false })).toMatchObject({ is_active: false });
  });
  it("inativa quem não existe mais no diretório", () => {
    expect(computePatch(profile, null)).toEqual({ is_active: false });
  });
  it("reativa quem voltou a ter a conta habilitada", () => {
    expect(computePatch({ ...profile, is_active: false }, entra)).toMatchObject({ is_active: true });
  });
  it("atualiza nome, e-mail e matrícula a partir do Microsoft", () => {
    expect(computePatch(profile, entra)).toEqual({ entra_oid: "oid-1", full_name: "Ana Souza", email: "ana@cronos.com", employee_id: "123", is_active: true });
  });
  it("não altera quem já está igual ao diretório", () => {
    expect(computePatch({ ...profile, full_name: "Ana Souza", employee_id: "123" }, entra)).toBeNull();
  });
  it("com vínculo Microsoft, não casa por e-mail com outra conta", () => {
    const byOid = new Map<string, EntraUser>();
    const byEmail = new Map([["ana@cronos.com", { ...entra, id: "outro" }]]);
    expect(matchEntraUser(profile, byOid, byEmail)).toBeNull();
  });
});

const admitido: EntraUser = { ...entra, id: "11111111-1111-4111-8111-111111111111", userType: "Member" };
const ativos = new Set(["ana@cronos.com"]);
describe("admissões automáticas no organograma", () => {
  it("inclui um membro habilitado e ativo no SharePoint antes do primeiro acesso", () => {
    expect(novosAdmitidos([admitido], [], ativos)).toEqual([admitido]);
  });
  it("não cadastra contas técnicas sem cadastro ativo no SharePoint", () => {
    expect(novosAdmitidos([admitido], [], new Set())).toEqual([]);
  });
  it("não cadastra contas Microsoft bloqueadas mesmo se o RH ainda indicar ativo", () => {
    expect(novosAdmitidos([{ ...admitido, accountEnabled: false }], [], ativos)).toEqual([]);
  });
  it("não cadastra convidados Microsoft", () => {
    expect(novosAdmitidos([{ ...admitido, userType: "Guest" }], [], ativos)).toEqual([]);
  });
  it("não cadastra uma conta cuja categoria Microsoft não foi informada", () => {
    expect(novosAdmitidos([{ ...admitido, userType: null }], [], ativos)).toEqual([]);
  });
  it("não duplica perfis vinculados ao ID Microsoft mesmo com novo e-mail", () => {
    expect(novosAdmitidos([admitido], [{ ...profile, entra_oid: admitido.id, email: "antigo@cronos.com" }], ativos)).toEqual([]);
  });
  it("não duplica perfis sem vínculo com e-mail já existente", () => {
    expect(novosAdmitidos([admitido], [{ ...profile, entra_oid: null, email: " ANA@CRONOS.COM " }], ativos)).toEqual([]);
  });
  it("recusa identidades ambíguas que compartilham e-mail", () => {
    expect(novosAdmitidos([admitido, { ...admitido, id: "22222222-2222-4222-8222-222222222222" }], [], ativos)).toEqual([]);
  });
  it("normaliza o e-mail corporativo do SharePoint", () => {
    expect(novosAdmitidos([admitido], [], new Set([" ANA@CRONOS.COM "]))).toEqual([admitido]);
  });
  it("mantém o limite rígido de 50 admissões por execução", () => {
    expect(MAX_ADMISSOES_POR_SYNC).toBe(50);
  });
});
