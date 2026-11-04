import { expect, it } from "vitest";
import { permissoesEfetivas } from "../lib/permissions";
import { permissoesDepartamento } from "../lib/departamentos.rules";
it("departamento Qualidade não concede administração mesmo com opções do SharePoint", () => {
  expect(permissoesDepartamento({ Permiss_x00e3_odoCoordenador: ["Gerenciar usuários", "Gerenciar perfis", "Gerenciar formulários"] }, "coordenador")).toEqual(["formularios.gerenciar"]);
});
it("perfil não Administrador nunca ganha administração pelas permissões cadastradas", () => {
  expect(permissoesEfetivas(true, [{ id: "qualidade", nome: "QUALIDADE — Coordenador/Gerente", ativo: true, sistema: false, permissoes: ["admin.usuarios", "admin.perfis", "conteudo.editar"] }])).toEqual(["conteudo.editar"]);
});