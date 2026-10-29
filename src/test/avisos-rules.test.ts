import { describe, expect, it } from "vitest";
import { brasiliaParaUtc, statusAviso, tituloComContador, utcParaBrasilia } from "@/lib/avisos-rules";

const agora = new Date("2026-10-23T15:00:00Z");

describe("status do aviso", () => {
  it("antes de publicar_em é Agendado", () => {
    expect(statusAviso({ publicar_em: "2026-10-24T00:00:00Z", expira_em: null, arquivado_em: null }, agora)).toBe("Agendado");
  });
  it("depois de expira_em é Expirado", () => {
    expect(statusAviso({ publicar_em: "2026-10-20T00:00:00Z", expira_em: "2026-10-23T14:59:00Z", arquivado_em: null }, agora)).toBe("Expirado");
  });
  it("arquivado vence qualquer data", () => {
    expect(statusAviso({ publicar_em: "2026-10-20T00:00:00Z", expira_em: null, arquivado_em: "2026-10-21T00:00:00Z" }, agora)).toBe("Arquivado");
  });
  it("vigente é Publicado", () => {
    expect(statusAviso({ publicar_em: "2026-10-20T00:00:00Z", expira_em: null, arquivado_em: null }, agora)).toBe("Publicado");
  });
});

describe("fuso de Brasília", () => {
  it("23:30 em Brasília vira 02:30 UTC do dia seguinte", () => {
    expect(brasiliaParaUtc("2026-10-23T23:30")).toBe("2026-10-24T02:30:00.000Z");
  });
  it("ida e volta mantém o horário digitado", () => {
    expect(utcParaBrasilia(brasiliaParaUtc("2026-12-31T00:05"))).toBe("2026-12-31T00:05");
  });
});

describe("título da aba", () => {
  it("mostra o contador e não duplica", () => {
    expect(tituloComContador("(1) Portal do Profissional", 2)).toBe("(2) Portal do Profissional");
    expect(tituloComContador("(3) Portal do Profissional", 0)).toBe("Portal do Profissional");
  });
});

import { diasParaCronosDay } from "@/lib/avisos-rules";
describe("Cronos Day (12/12/2026, Brasília)", () => {
  it("conta 1 dia em 11/12 às 23h de Brasília", () => expect(diasParaCronosDay(new Date("2026-12-11T23:00:00-03:00"))).toBe(1));
  it("mostra 0 no próprio dia, mesmo já 02h UTC do dia 13", () => expect(diasParaCronosDay(new Date("2026-12-13T02:00:00Z"))).toBe(0));
  it("sai do carrossel em 13/12 de Brasília", () => expect(diasParaCronosDay(new Date("2026-12-13T00:00:01-03:00"))).toBeNull());
  it("conta 44 dias em 29/10/2026", () => expect(diasParaCronosDay(new Date("2026-10-29T09:00:00-03:00"))).toBe(44));
});
