import { describe, expect, it } from "vitest";

import { normalizeUserInput } from "@/lib/users.rules";
import { principalNav, visibleModules } from "@/lib/portal-modules";

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

  it("coloca Benefícios e Parceiros como submenus do menu Benefícios", () => {
    const nav = principalNav(["funcionario"]);
    const group = nav.find((entry) => entry.type === "group" && entry.id === "beneficios");
    expect(group).toMatchObject({
      id: "beneficios",
      label: "Benefícios",
      children: [
        { to: "/beneficios", label: "Benefícios" },
        { to: "/parceiros", label: "Parceiros" },
      ],
    });
    expect(nav.some((entry) => entry.type === "link" && entry.to === "/parceiros")).toBe(false);
  });

  it("coloca Elogios e Feedback do gestor como submenus do menu Feedbacks", () => {
    const nav = principalNav(["funcionario"]);
    const group = nav.find((entry) => entry.type === "group" && entry.id === "feedbacks");
    expect(group).toMatchObject({
      id: "feedbacks",
      label: "Feedbacks",
      children: [
        { to: "/feedback", label: "Elogios" },
        { to: "/feedback-gestor", label: "Feedback do gestor" },
      ],
    });
    expect(nav.some((entry) => entry.type === "link" && entry.to === "/feedback")).toBe(false);
  });

  it("exibe Pendências sem o sufixo prioritárias logo abaixo do grupo Avisos", () => {
    const nav = principalNav(["funcionario"]);
    const idxAvisos = nav.findIndex((entry) => entry.type === "group" && entry.id === "avisos");
    const idxPendencias = nav.findIndex((entry) => entry.type === "link" && entry.to === "/pendencias" && entry.label === "Pendências");
    expect(idxPendencias).toBe(idxAvisos + 1);
  });

  it("agrupa Formulários Internos e Formulários SharePoint sob o menu Formulários", () => {
    const nav = principalNav(["funcionario"]);
    const group = nav.find((entry) => entry.type === "group" && entry.id === "formularios");
    expect(group).toMatchObject({
      id: "formularios",
      label: "Formulários",
      children: [
        { to: "/formularios-internos", label: "Formulários Internos" },
        { to: "/formularios", label: "Formulários SharePoint" },
      ],
    });
    expect(nav.some((entry) => entry.type === "link" && (entry.to === "/formularios" || entry.to === "/formularios-internos"))).toBe(false);
  });
});
