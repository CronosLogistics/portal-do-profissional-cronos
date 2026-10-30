import { describe, expect, it } from "vitest";
import { pendenciasDoUsuario, statusPorTempo } from "@/lib/pendencias.rules";

const usuarios = new Map([["1", { email: "ana@cronos.com", nome: "Ana" }], ["2", { email: "bia@cronos.com", nome: "Bia" }]]);
const agora = new Date("2026-10-30T12:00:00Z");
const item = (id: string, resp: string, criado: string, extra = {}) => ({ id, fields: { NCLookupId: "9", Respons_x00e1_velLookupId: resp, Created: criado, Situa_x00e7__x00e3_odaAn_x00e1_l: "Aguardando Resposta", ...extra } });

describe("pendências de análise de NC", () => {
  it("mostra só as NCs em que a pessoa é a responsável", () => {
    const r = pendenciasDoUsuario([item("1", "1", "2026-10-30T10:00:00Z"), item("2", "2", "2026-10-30T10:00:00Z")], "ANA@cronos.com", usuarios, new Map([["9", "561/26"]]), agora);
    expect(r.map((p) => p.id)).toEqual(["1"]);
    expect(r[0]?.nc).toBe("561/26");
    expect(r[0]?.link).toContain("EditForm.aspx?ID=1");
  });
  it("ignora análises fechadas", () => {
    expect(pendenciasDoUsuario([item("1", "1", "2026-10-01T10:00:00Z", { Data_Fechamento: "2026-10-05T00:00:00Z" })], "ana@cronos.com", usuarios, new Map(), agora)).toEqual([]);
  });
  it("vence a partir de 1 dia sem resposta", () => {
    expect(statusPorTempo(0)).toBe("No prazo");
    expect(statusPorTempo(1)).toBe("Vencido");
    const [p] = pendenciasDoUsuario([item("1", "1", "2026-10-28T10:00:00Z")], "ana@cronos.com", usuarios, new Map(), agora);
    expect(p?.diasSemResposta).toBe(2);
    expect(p?.status).toBe("Vencido");
  });
});

describe("Análise de NC maior", async () => {
  const { pendenciasDoUsuario } = await import("@/lib/pendencias.rules");
  const usuarios = new Map([["1", { email: "a@x.com", nome: "Ana" }]]);
  const agora = new Date("2026-01-20T12:00:00Z");
  const item = (id: string, dias: number, extra = {}) => ({ id, fields: { Respons_x00e1_velLookupId: "1", Created: new Date(agora.getTime() - dias * 86_400_000).toISOString(), ...extra } });
  it("vence com 8 dias, 'A vencer' com 7 e ignora finalizadas", () => {
    const r = pendenciasDoUsuario([item("1", 8), item("2", 7), item("3", 6), item("4", 9, { StatusAn_x00e1_liseMaior: "Finalizado" })], "a@x.com", usuarios, new Map(), agora, "maior");
    expect(r.map((p) => [p.id, p.status])).toEqual([["1", "Vencido"], ["2", "A vencer"], ["3", "No prazo"]]);
    expect(r[0]?.link).toContain("PLANO%20DE%20AO1/EditForm.aspx?ID=1");
  });
});
