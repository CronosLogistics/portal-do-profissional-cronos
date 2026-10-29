import { describe, expect, it } from "vitest";

import { permissoesEfetivas, podeExcluirPerfil } from "@/lib/permissions";

const gp = { id: "1", nome: "GP", ativo: true, sistema: false, permissoes: ["avisos.publicar"] };
const adm = { id: "2", nome: "Administrador", ativo: true, sistema: true, permissoes: [] };

describe("perfis de acesso", () => {
  it("soma as permissões de todos os perfis", () => {
    const other = { ...gp, id: "3", permissoes: ["conteudo.editar"] };
    expect(permissoesEfetivas(true, [gp, other])).toEqual(["avisos.publicar", "conteudo.editar"]);
  });
  it("perfil Administrador tem todas as permissões", () => {
    expect(permissoesEfetivas(true, [adm])).toContain("admin.perfis");
    expect(permissoesEfetivas(true, [adm])).toHaveLength(6);
  });
  it("profissional inativo perde o efeito de todos os perfis", () => {
    expect(permissoesEfetivas(false, [adm, gp])).toEqual([]);
  });
  it("perfil desativado não dá permissão", () => {
    expect(permissoesEfetivas(true, [{ ...gp, ativo: false }])).toEqual([]);
  });
  it("só exclui perfil sem membros, sem avisos e que não é de sistema", () => {
    expect(podeExcluirPerfil({ sistema: false, membros: 0 })).toBe(true);
    expect(podeExcluirPerfil({ sistema: false, membros: 1 })).toBe(false);
    expect(podeExcluirPerfil({ sistema: false, membros: 0, avisos: 2 })).toBe(false);
    expect(podeExcluirPerfil({ sistema: true, membros: 0 })).toBe(false);
  });
});
