import { describe, expect, it } from "vitest";
import { FORMULARIOS, filtrarFormularios } from "@/lib/formularios";
describe("formulários", () => {
  it("tem os 12 formulários oficiais (sem treinamentos)", () => expect(FORMULARIOS).toHaveLength(12));
  it("busca sem acento", () => expect(filtrarFormularios("nao conformidade")[0]?.codigo).toBe("RQ-00-02"));
  it("filtra por setor", () => expect(filtrarFormularios("", "Qualidade")).toHaveLength(5));
});
