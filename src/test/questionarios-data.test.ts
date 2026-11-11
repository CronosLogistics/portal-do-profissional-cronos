import { describe, it, expect } from "vitest";
import { dataRespostaSharePoint } from "../lib/questionarios.server";

describe("Data da Resposta no SharePoint", () => {
  it("usa o dia de Brasília, mesmo perto da meia-noite UTC", () => {
    expect(dataRespostaSharePoint(new Date("2026-11-12T01:30:00Z"))).toBe("2026-11-11T12:00:00Z");
  });
});
