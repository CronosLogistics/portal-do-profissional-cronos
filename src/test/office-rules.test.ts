import { describe, expect, it } from "vitest";
import { escritorioDoEmail, normalizarEscritorio } from "@/lib/office.rules";
const row = (id: number, status: string, office: string) => ({ fields: { E_x002d_MAILCORPORATIVOLookupId: id, field_1: status, field_3: office } });
describe("escritório corporativo", () => {
  it("resolve somente a pessoa ativa pelo email corporativo", () => {
    const users = new Map([["1", "ana@cronos.test"], ["2", "bia@cronos.test"]]);
    expect(escritorioDoEmail([row(1,"ATIVO","ITAJAÍ"),row(2,"ATIVO","SANTOS")],users,"ANA@CRONOS.TEST")).toBe("ITAJAÍ");
    expect(escritorioDoEmail([row(1,"DESLIGADO","ITAJAÍ")],users,"ana@cronos.test")).toBeNull();
  });
  it("não escolhe escritório quando o vínculo está ausente ou duplicado", () => {
    const users = new Map([["1","ana@cronos.test"]]);
    expect(escritorioDoEmail([row(1,"ATIVO","ITAJAÍ"),row(1,"ATIVO","SANTOS")],users,"ana@cronos.test")).toBeNull();
    expect(escritorioDoEmail([row(1,"ATIVO","ITAJAÍ")],users,"outra@cronos.test")).toBeNull();
  });
  it("associa escritório da planilha à unidade sem acentos e complemento", () => {
    expect(normalizarEscritorio("Itajaí (Matriz)")).toBe(normalizarEscritorio("ITAJAÍ"));
  });
});