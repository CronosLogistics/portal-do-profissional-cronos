import { describe, expect, it } from "vitest";
import { visibleModules, type PortalRole } from "@/lib/portal-modules";

describe("Acesso às pendências prioritárias", () => {
  it.each<PortalRole>(["funcionario", "rh", "admin"])("libera o módulo para o perfil %s", (role) => {
    expect(visibleModules([role]).map((module) => module.to)).toContain("/pendencias");
  });
  it("não exige perfil extra do profissional autenticado", () => {
    expect(visibleModules([]).map((module) => module.to)).toContain("/pendencias");
  });
});