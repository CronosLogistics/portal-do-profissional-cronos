import { describe, expect, it } from "vitest";
import { computePatch, matchEntraUser, type EntraUser, type ProfileRow } from "@/lib/entra-sync.rules";

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
