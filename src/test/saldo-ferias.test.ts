import { describe, expect, it } from "vitest";
import { dataTermino, emailSolicitacao, opcoesDias, periodosDoProfissional } from "@/lib/saldo-ferias.rules";
import { principalNav } from "@/lib/portal-modules";

const linha = (id: string, nome: string, f: Record<string, unknown>) => ({ id, fields: { NomeLookupId: nome, Status: "Agendar Férias", Dias_x0020_Restantes: "30", Ano_x0020_Direito: "2.026", ...f } });

describe("Solicitação de férias", () => {
  it("lista apenas os períodos do próprio profissional", () => {
    const itens = [linha("1", "58", {}), linha("2", "77", {}), linha("3", "58", { Status: "Finalizado", Dias_x0020_Restantes: "0" })];
    expect(periodosDoProfissional(itens, ["58"]).map((p) => p.id).sort()).toEqual(["1", "3"]);
  });

  it("permite solicitar só com status Agendar Férias e saldo maior que zero", () => {
    const [aberto, finalizado, semSaldo] = periodosDoProfissional([
      linha("1", "58", { Per_x00ed_odo: "2025-12-02T03:00:00Z" }),
      linha("2", "58", { Status: "Finalizado", Per_x00ed_odo: "2024-12-02T03:00:00Z" }),
      linha("3", "58", { Dias_x0020_Restantes: "0", Per_x00ed_odo: "2023-12-02T03:00:00Z" }),
    ], ["58"]);
    expect([aberto?.podeSolicitar, finalizado?.podeSolicitar, semSaldo?.podeSolicitar]).toEqual([true, false, false]);
  });

  it("converte o ano 2.026 do SharePoint em 2026", () => {
    expect(periodosDoProfissional([linha("1", "58", {})], ["58"])[0]?.anoDireito).toBe("2026");
  });

  it("deriva o início do período aquisitivo quando o SharePoint não informa", () => {
    const [p] = periodosDoProfissional([linha("1", "58", { DatadeDireito: "2027-08-02T03:00:00Z" })], ["58"]);
    expect(p?.periodo).toBe("2026-08-03");
  });

  it("limita as quantidades de dias ao saldo disponível", () => {
    expect(opcoesDias(30)).toEqual([30, 20, 15, 14, 10, 5]);
    expect(opcoesDias(12)).toEqual([12, 10, 5]);
    expect(opcoesDias(0)).toEqual([]);
  });

  it("calcula o último dia como início + dias − 1", () => {
    expect(dataTermino("2026-01-05", 30)).toBe("2026-02-03");
    expect(dataTermino("2026-12-20", 15)).toBe("2027-01-03");
  });

  it("envia para Gestão de Pessoas com o assunto e os dados pedidos", () => {
    const e = emailSolicitacao({ nome: "Natan Borba Boos", departamento: "BI", gestor: "Fulano", anoDireito: "2026", inicio: "2026-01-05", dias: 10, saldo: 30 });
    expect(e.para).toBe("gestaodepessoas@cronoslogistics.com.br");
    expect(e.assunto).toBe("Solicitação de Agendamento de Férias – Natan Borba Boos");
    expect(e.corpo).toContain("Data de término desejada: 14/01/2026");
    expect(e.corpo).toContain("Saldo disponível atual: 30");
    expect(e.mailto.startsWith("mailto:gestaodepessoas@cronoslogistics.com.br?subject=")).toBe(true);
  });

  it("aparece no menu Formulários para todos os profissionais", () => {
    const grupo = principalNav(["funcionario"]).find((e) => e.type === "group" && e.id === "formularios");
    expect(grupo?.type === "group" && grupo.children.some((c) => c.to === "/solicitar-ferias")).toBe(true);
  });
});
