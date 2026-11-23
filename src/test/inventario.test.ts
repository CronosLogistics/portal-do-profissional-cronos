import { describe, expect, it } from "vitest";
import { inventariosPermitidos, urlBaseLista, type ResponsavelEscritorio } from "@/lib/inventario.rules";

const r = (id: string, titulo: string, email: string, link: string | null = `https://x/Lists/${id}/AllItems.aspx`): ResponsavelEscritorio => ({ id, titulo, escritorio: "", email, link });
const resps = [r("1", "COMERCIAL SP", "sp@c.com"), r("5", "COMERCIAL SC", "sc@c.com", "https://x/Lists/I/AllItems.aspx"), r("6", "TLD", "tld@c.com", "https://x/Lists/I/AllItems.aspx"), r("7", "MARKETING", "mkt@c.com", null)];
const ids = (l: ResponsavelEscritorio[]) => l.map((x) => x.id);

describe("inventário de brindes", () => {
  it("administrador vê todos os inventários", () => expect(ids(inventariosPermitidos(resps, { email: "a@c.com", admin: true, departamento: null }))).toEqual(["1", "5", "6"]));
  it("departamento MARKETING vê todos", () => expect(ids(inventariosPermitidos(resps, { email: "z@c.com", admin: false, departamento: "Marketing" }))).toEqual(["1", "5", "6"]));
  it("responsável do cadastro MARKETING vê todos", () => expect(ids(inventariosPermitidos(resps, { email: "mkt@c.com", admin: false, departamento: null }))).toHaveLength(3));
  it("coordenador comercial vê só o próprio escritório", () => expect(ids(inventariosPermitidos(resps, { email: "SP@c.com", admin: false, departamento: "COMERCIAL" }))).toEqual(["1"]));
  it("TLD é separado do Comercial Itajaí", () => expect(ids(inventariosPermitidos(resps, { email: "tld@c.com", admin: false, departamento: null }))).toEqual(["6"]));
  it("demais usuários não têm acesso", () => expect(inventariosPermitidos(resps, { email: "x@c.com", admin: false, departamento: "FINANCEIRO" })).toEqual([]));
  it("normaliza o link da lista", () => expect(urlBaseLista("https://a/Lists/Inventrio%20So%20Paulo/AllItems.aspx")).toBe("https://a/lists/inventrio so paulo"));
});
