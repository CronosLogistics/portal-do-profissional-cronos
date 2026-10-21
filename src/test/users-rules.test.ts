import { describe, expect, it } from "vitest";

import { normalizeUserInput } from "@/lib/users.rules";
import { visibleModules } from "@/lib/portal-modules";

describe("cadastro de usuários", () => {
  it("normaliza o e-mail para minúsculas, evitando contas duplicadas por caixa", () => {
    const r = normalizeUserInput({ email: " Ana@Cronos.COM ", fullName: "Ana  Souza", employeeId: "", role: "funcionario" });
    expect(r.email).toBe("ana@cronos.com");
    expect(r.fullName).toBe("Ana Souza");
  });

  it("recusa perfis de acesso fora da lista", () => {
    expect(() => normalizeUserInput({ email: "a@b.com", fullName: "A", employeeId: "", role: "superuser" })).toThrow();
  });

  it("exige nome completo", () => {
    expect(() => normalizeUserInput({ email: "a@b.com", fullName: "  ", employeeId: "", role: "admin" })).toThrow();
  });
});

describe("navegação do portal", () => {
  it("mostra a aba Treinamentos para funcionários", () => {
    expect(visibleModules(["funcionario"]).map((m) => m.label)).toContain("Treinamentos");
  });
});
