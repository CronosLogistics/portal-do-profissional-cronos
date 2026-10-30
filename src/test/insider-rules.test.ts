import { describe, expect, it } from "vitest";
import { dataEventoInput, formatarDataEvento, devePrepararHoje, montarConteudoInsider, primeiroDiaUtil, type ProfissionalInsider } from "@/lib/insider.rules";
const pessoa = (id: string, status: string, nasc: string, adm: string): ProfissionalInsider => ({ id, fields: { Title: id, field_1: status, DATADENASC_x002e_: nasc, field_4: adm } });
describe("Cronos Insider mensal", () => {
  it("converte datas dos eventos sem deslocar o dia e preserva textos antigos", () => {
    expect(dataEventoInput("02/11/2026")).toBe("2026-11-02");
    expect(dataEventoInput("2026-11-02")).toBe("2026-11-02");
    expect(formatarDataEvento("2026-11-02")).toBe("02/11/2026");
    expect(dataEventoInput("2026-02-30")).toBe("");
    expect(formatarDataEvento("De 2 a 5 de novembro")).toBe("De 2 a 5 de novembro");
  });
  it("prepara no primeiro dia de segunda a sexta, sem considerar feriados", () => {
    expect(primeiroDiaUtil("2026-11")).toBe(2);
    expect(primeiroDiaUtil("2026-08")).toBe(3);
    expect(primeiroDiaUtil("2027-01")).toBe(1);
    expect(devePrepararHoje(new Date("2026-11-02T11:00:00Z"))).toBe(true);
    expect(devePrepararHoje(new Date("2026-11-01T11:00:00Z"))).toBe(false);
  });
  it("inclui somente ativos e efetivados ativos aniversariantes do mês", () => {
    const c = montarConteudoInsider([pessoa("Ana", "ATIVO", "1990-11-30T02:00:00Z", "2020-05-01"), pessoa("Bia", "EFETIVADO/ATIVO", "1995-11-01T03:00:00Z", "2020-05-01"), pessoa("Caio", "DESLIGADO", "1990-11-02", "2020-05-01"), pessoa("Dani", "ATIVO", "1990-10-05", "2020-05-01")], "2026-11");
    expect(c.aniversariantes.map(p => [p.nome, p.dia])).toEqual([["Bia", 1], ["Ana", 30]]);
    expect(c.aniversariantes[0]).not.toHaveProperty("nascimento");
  });
  it("usa admissão e todos os anos completos a partir de um ano", () => {
    const c = montarConteudoInsider([pessoa("Um", "ATIVO", "1990-05-01", "2025-11-12"), pessoa("Quatro", "ATIVO", "1990-05-01", "2022-11-02"), pessoa("Novo", "ATIVO", "1990-05-01", "2026-11-01"), pessoa("Fora", "DESLIGADO", "1990-05-01", "2020-11-01")], "2026-11");
    expect(c.tempoCasa.map(p => [p.nome, p.anos])).toEqual([["Quatro", 4], ["Um", 1]]);
  });
  it("calcula tempo de casa na virada do ano e não inventa datas ausentes", () => {
    const c = montarConteudoInsider([pessoa("Ano", "ATIVO", "", "2026-01-31"), pessoa("Sem data", "ATIVO", "", "")], "2027-01");
    expect(c.tempoCasa).toMatchObject([{ nome: "Ano", anos: 1, dia: 31 }]);
    expect(c.aniversariantes).toEqual([]);
  });
});