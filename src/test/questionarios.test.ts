// @vitest-environment node
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, afterAll, it, expect } from "vitest";
import { camposRegistro, novoQuestionarioSchema } from "../lib/questionarios.rules";
let db: PGlite;
const gestor = "10000000-0000-0000-0000-000000000001", pessoa = "10000000-0000-0000-0000-000000000002";
let anon: string, identificado: string;
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`CREATE ROLE authenticated; CREATE ROLE anon; CREATE ROLE service_role; CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('test.uid',true),'')::uuid $$;
    CREATE TABLE profiles(id uuid PRIMARY KEY,full_name text,email text,is_active boolean);
    INSERT INTO profiles VALUES('${gestor}','Gestor','gestor@test',true),('${pessoa}','Pessoa','pessoa@test',true);
    CREATE FUNCTION is_active_user(uuid) RETURNS boolean LANGUAGE sql AS $$ SELECT EXISTS(SELECT 1 FROM profiles WHERE id=$1 AND is_active) $$;
    CREATE FUNCTION tem_permissao(text) RETURNS boolean LANGUAGE sql AS $$ SELECT auth.uid()='${gestor}'::uuid AND $1='formularios.gerenciar' $$;`);
  await db.exec(readFileSync(new URL("../../drizzle/migrations/0027_questionarios_internos.sql", import.meta.url), "utf8"));
  await db.exec(readFileSync(new URL("../../drizzle/migrations/0029_questionarios_edicao_resposta_unica.sql", import.meta.url), "utf8"));
  await db.query("SELECT set_config('test.uid',$1,false)", [gestor]);
  anon = (await db.query<{ id: string }>("SELECT criar_questionario('Anônimo','',true,'[\"Primeira?\",\"Segunda?\"]') AS id")).rows[0]?.id ?? "";
  identificado = (await db.query<{ id: string }>("SELECT criar_questionario('Identificado','',false,'[\"Pergunta?\"]') AS id")).rows[0]?.id ?? "";
}, 30000);
afterAll(async () => { await db.close(); });
it("somente Gerenciar formulários cria e consulta resultados", async () => {
  await db.query("SELECT set_config('test.uid',$1,false)", [pessoa]);
  await expect(db.query("SELECT criar_questionario('Negado','',false,'[\"P?\"]')")).rejects.toThrow("Sem permissão");
  await expect(db.query("SELECT gestao_questionario($1)", [anon])).rejects.toThrow("Sem permissão");
});
it("fica pendente até responder e aceita apenas uma resposta completa", async () => {
  await db.query("SELECT set_config('test.uid',$1,false)", [pessoa]);
  const before = await db.query<{ lista: { id: string; respondido: boolean }[] }>("SELECT listar_questionarios() AS lista");
  expect(before.rows[0]?.lista.find(q => q.id === anon)?.respondido).toBe(false);
  await expect(db.query("SELECT responder_questionario($1,'[\"Uma só\"]')", [anon])).rejects.toThrow("todas");
  await db.query("SELECT responder_questionario($1,'[\"Um\",\"Dois\"]')", [anon]);
  const after = await db.query<{ lista: { id: string; respondido: boolean }[] }>("SELECT listar_questionarios() AS lista");
  expect(after.rows[0]?.lista.find(q => q.id === anon)?.respondido).toBe(true);
  await expect(db.query("SELECT responder_questionario($1,'[\"Um\",\"Dois\"]')", [anon])).rejects.toThrow();
});
it("anônimo mostra somente contagem de pendentes e não vincula resposta à identidade", async () => {
  await db.query("SELECT set_config('test.uid',$1,false)", [gestor]);
  const r = (await db.query<{ dados: { pendentes: number; pessoasPendentes: unknown; respostas: { nome: unknown; email: unknown }[] } }>("SELECT gestao_questionario($1) AS dados", [anon])).rows[0]?.dados;
  expect(r?.pendentes).toBe(1); expect(r?.pessoasPendentes).toBeNull();
  expect(r?.respostas[0]).toMatchObject({ nome: null, email: null });
  expect((await db.query<{ respondente_id: unknown }>("SELECT respondente_id FROM questionarios_respostas WHERE questionario_id=$1", [anon])).rows[0]?.respondente_id).toBeNull();
});
it("identificado informa quem falta responder", async () => {
  const r = (await db.query<{ dados: { pessoasPendentes: { nome: string }[] } }>("SELECT gestao_questionario($1) AS dados", [identificado])).rows[0]?.dados;
  expect(r?.pessoasPendentes.map(p => p.nome).sort()).toEqual(["Gestor", "Pessoa"]);
});
it("gestores não leem diretamente participações ou respostas", async () => {
  await db.exec("SET ROLE authenticated");
  await expect(db.query("SELECT * FROM questionarios_participacoes")).rejects.toThrow();
  await expect(db.query("SELECT * FROM questionarios_respostas")).rejects.toThrow();
  await db.exec("RESET ROLE");
});
it("não envia identidade de respondente anônimo ao SharePoint", () => {
  const fields = camposRegistro({ id: anon, titulo: "Anônimo", anonimo: true }, ["Pergunta"], ["Resposta"], "Criador", "Pessoa (pessoa@test)");
  expect(fields.Respondidopor).toBe("Anônimo"); expect(JSON.stringify(fields)).not.toContain("pessoa@test");
});
it("cada resposta completa ocupa uma linha com todas as perguntas e respostas", () => {
  const fields = camposRegistro({ id: anon, titulo: "Pesquisa", anonimo: false }, ["Primeira?", "Segunda?"], ["Um", "Dois"], "Gestor", "Pessoa");
  expect(fields.Pergunta).toBe("1. Primeira?\n\n2. Segunda?");
  expect(fields.Resposta).toBe("1. Um\n\n2. Dois");
  expect(fields.Respondidopor).toBe("Pessoa");
});
it("somente gestores editam um formulário enviado", async () => {
  await db.query("SELECT set_config('test.uid',$1,false)", [pessoa]);
  await expect(db.query("SELECT editar_questionario($1,'Negado','','[\"Outra?\"]')", [anon])).rejects.toThrow("Sem permissão");
});
it("edição preserva perguntas e respostas anteriores e mantém anonimato", async () => {
  await db.query("SELECT set_config('test.uid',$1,false)", [gestor]);
  await db.query("SELECT editar_questionario($1,'Atualizado','Descrição','[\"Nova?\"]')", [anon]);
  const result = (await db.query<{ dados: { respostas: { perguntas: string[]; respostas: string[]; nome: unknown }[]; respondidos: number } }>("SELECT gestao_questionario($1) AS dados", [anon])).rows[0]?.dados;
  expect(result?.respostas[0]).toMatchObject({ perguntas: ["Primeira?", "Segunda?"], respostas: ["Um", "Dois"], nome: null });
  expect(result?.respondidos).toBe(1);
  const q = (await db.query<{ titulo: string; anonimo: boolean; perguntas: string[] }>("SELECT titulo,anonimo,perguntas FROM questionarios_internos WHERE id=$1", [anon])).rows[0];
  expect(q).toEqual({ titulo: "Atualizado", anonimo: true, perguntas: ["Nova?"] });
  await db.query("SELECT responder_questionario($1,'[\"Nova resposta\"]')", [anon]);
  const snapshots = (await db.query<{ perguntas: string[] }>("SELECT perguntas FROM questionarios_respostas WHERE questionario_id=$1 AND respostas='[\"Nova resposta\"]'", [anon])).rows[0]?.perguntas;
  expect(snapshots).toEqual(["Nova?"]);
});
it("questionário mantém perguntas sequenciais preenchidas", () => {
  expect(novoQuestionarioSchema.parse({ titulo: "Teste", descricao: "", anonimo: false, perguntas: ["Primeira", "Segunda", "Terceira"] }).perguntas).toEqual(["Primeira", "Segunda", "Terceira"]);
  expect(novoQuestionarioSchema.safeParse({ titulo: "Teste", descricao: "", anonimo: true, perguntas: [""] }).success).toBe(false);
});