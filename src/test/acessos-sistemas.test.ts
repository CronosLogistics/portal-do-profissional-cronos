import { describe, expect, it } from "vitest";
import { SISTEMAS_CRONOS } from "@/lib/acessos-sistemas";
import { principalNav, visibleModules, type PortalRole } from "@/lib/portal-modules";

describe("Acessos e Sistemas", () => {
  it.each<PortalRole>(["funcionario", "rh", "admin"])("permite consultar o guia como %s", (role) => {
    expect(visibleModules([role]).some((modulo) => modulo.to === "/acessos-e-sistemas")).toBe(true);
  });

  it("inclui o guia em Documentos Cronos para profissionais sem permissões extras", () => {
    const grupo = principalNav(["funcionario"]).find((entry) => entry.type === "group" && entry.id === "documentos");
    expect(grupo?.type === "group" && grupo.children.some((child) => child.to === "/acessos-e-sistemas")).toBe(true);
  });

  it.each([
    ["skyline", "https://cronos.skychart.com.br/skyline-cronos-48511/#/login"],
    ["bi-explorer", "https://cronoslogistics.reportload.com/signin?redirect=/"],
    ["office", "https://portal.office.com/"],
    ["logcomex", "https://plataforma.logcomex.io/"],
    ["visualizacao-qbr", "https://insight-guide-share-cronos.lovable.app/"],
    ["cronos-insights", "https://cronos-pricing-flow.lovable.app/"],
    ["reembolso", "https://app.espressoapp.com.br/users/sign_in"],
  ])("mantém o destino corporativo de %s", (id, url) => {
    expect(SISTEMAS_CRONOS.find((sistema) => sistema.id === id)?.url).toBe(url);
  });

  it("usa o login Sólides sem compartilhar uma sessão", () => {
    expect(SISTEMAS_CRONOS.find((sistema) => sistema.id === "solides")?.url).toBe("https://app.tangerino.com.br/Tangerino/pages/LoginPage");
  });
});