// @vitest-environment node
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, afterAll, it, expect } from "vitest";
import { camposRegistro, novoQuestionarioSchema } from "../lib/questionarios.rules";
let db: PGlite;
const gestor = "10000000-0000-0000-0000-000000000001", pessoa = "10000000-0000-0000-0000-000000000002";
let anon: string, identificado: string;
const perguntasAnon = JSON.stringify([{ id: "p1", tipo: "texto", enunciado: "Primeira?" }, { id: "p2", tipo: "texto", enunciado: "Segunda?" }]);
const perguntasId = JSON.stringify([{ id: "p1", tipo: "texto", enunciado: "Pergunta?" }]);
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
  await db.exec(readFileSync(new URL("../../drizzle/migrations/0030_questionarios_exclusao_segura.sql", import.meta.url), "utf8"));
  await db.exec(readFileSync(new URL("../../drizzle/migrations/0039_questionarios_tipos_richtext.sql", import.meta.url), "utf8"));
  await db.query("SELECT set_config('test.uid',$1,false)", [gestor]);
  anon = (await db.query<{ id: string }>("SELECT criar_questionario('Anônimo','',true,$1::jsonb) AS id", [perguntasAnon])).rows[0]?.id ?? "";
  identificado = (await db.query<{ id: string }>("SELECT criar_questionario('Identificado','',false,$1::jsonb) AS id", [perguntasId])).rows[0]?.id ?? "";
}, 30000);
afterAll(async () => { await db.close(); });
it("somente Gerenciar formulários cria e consulta resultados", async () => {
  await db.query("SELECT set_config('test.uid',$1,false)", [pessoa]);
  await expect(db.query("SELECT criar_questionario('Negado','',false,$1::jsonb)", [perguntasId])).rejects.toThrow("Sem permissão");
  await expect(db.query("SELECT gestao_questionario($1)", [anon])).rejects.toThrow("Sem permissão");
});
it("fica pendente até responder e aceita apenas uma resposta completa", async () => {
  await db.query("SELECT set_config('test.uid',$1,false)", [pessoa]);
  const before = await db.query<{ lista: { id: string; respondido: boolean }[] }>("SELECT listar_questionarios() AS lista");
  expect(before.rows[0]?.lista.find(q => q.id === anon)?.respondido).toBe(false);
  await expect(db.query("SELECT responder_questionario($1,'[\"Uma só\"]'::jsonb)", [anon])).rejects.toThrow("todas");
  await db.query("SELECT responder_questionario($1,'[\"Um\",\"Dois\"]'::jsonb)", [anon]);
  const after = await db.query<{ lista: { id: string; respondido: boolean }[] }>("SELECT listar_questionarios() AS lista");
  expect(after.rows[0]?.lista.find(q => q.id === anon)?.respondido).toBe(true);
  await expect(db.query("SELECT responder_questionario($1,'[\"Um\",\"Dois\"]'::jsonb)", [anon])).rejects.toThrow();
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
  const fields = camposRegistro({ id: anon, titulo: "Anônimo", anonimo: true }, [{ id: "p1", tipo: "texto", enunciado: "Pergunta" }], ["Resposta"], "Criador", "Pessoa (pessoa@test)");
  expect(fields.Respondidopor).toBe("Anônimo"); expect(JSON.stringify(fields)).not.toContain("pessoa@test");
});
it("cada resposta completa ocupa uma linha com todas as perguntas e respostas", () => {
  const fields = camposRegistro(
    { id: anon, titulo: "Pesquisa", anonimo: false },
    [{ id: "p1", tipo: "texto", enunciado: "Primeira?" }, { id: "p2", tipo: "radio", enunciado: "Segunda?", opcoes: ["Um", "Dois"] }],
    ["Um", "Dois"],
    "Gestor",
    "Pessoa",
  );
  expect(fields.Pergunta).toBe("1. Primeira?\n\n2. Segunda?");
  expect(fields.Resposta).toBe("1. Um\n\n2. Dois");
  expect(fields.Respondidopor).toBe("Pessoa");
});
it("somente gestores editam um formulário enviado", async () => {
  await db.query("SELECT set_config('test.uid',$1,false)", [pessoa]);
  await expect(db.query("SELECT editar_questionario($1,'Negado','',$2::jsonb)", [anon, JSON.stringify([{ id: "p9", tipo: "texto", enunciado: "Outra?" }])])).rejects.toThrow("Sem permissão");
});
it("edição preserva perguntas e respostas anteriores e mantém anonimato", async () => {
  await db.query("SELECT set_config('test.uid',$1,false)", [gestor]);
  await db.query("SELECT editar_questionario($1,'Atualizado','Descrição',$2::jsonb)", [anon, JSON.stringify([{ id: "p3", tipo: "texto", enunciado: "Nova?" }])]);
  const result = (await db.query<{ dados: { respostas: { perguntas: { enunciado: string }[]; respostas: string[]; nome: unknown }[]; respondidos: number } }>("SELECT gestao_questionario($1) AS dados", [anon])).rows[0]?.dados;
  expect(result?.respostas[0]).toMatchObject({ perguntas: [{ enunciado: "Primeira?" }, { enunciado: "Segunda?" }], respostas: ["Um", "Dois"], nome: null });
  expect(result?.respondidos).toBe(1);
  const q = (await db.query<{ titulo: string; anonimo: boolean; perguntas: { enunciado: string }[] }>("SELECT titulo,anonimo,perguntas FROM questionarios_internos WHERE id=$1", [anon])).rows[0];
  expect(q?.titulo).toBe("Atualizado");
  expect(q?.anonimo).toBe(true);
  expect(q?.perguntas).toEqual([{ id: "p3", tipo: "texto", enunciado: "Nova?" }]);
  await db.query("SELECT responder_questionario($1,'[\"Nova resposta\"]'::jsonb)", [anon]);
  const snapshots = (await db.query<{ perguntas: { enunciado: string }[] }>("SELECT perguntas FROM questionarios_respostas WHERE questionario_id=$1 AND respostas='[\"Nova resposta\"]'", [anon])).rows[0]?.perguntas;
  expect(snapshots).toEqual([{ id: "p3", tipo: "texto", enunciado: "Nova?" }]);
});
it("questionário mantém perguntas tipadas e rejeita enunciado vazio", () => {
  const parsed = novoQuestionarioSchema.parse({
    titulo: "Teste",
    descricao: "",
    anonimo: false,
    perguntas: [
      { id: "a", tipo: "texto", enunciado: "Primeira" },
      { id: "b", tipo: "radio", enunciado: "Segunda", opcoes: ["Sim", "Não"] },
      { id: "c", tipo: "bloco", enunciado: "<p>Contexto</p>" },
    ],
  });
  expect(parsed.perguntas.map(p => p.tipo)).toEqual(["texto", "radio", "bloco"]);
  expect(novoQuestionarioSchema.safeParse({ titulo: "Teste", descricao: "", anonimo: true, perguntas: [{ id: "a", tipo: "texto", enunciado: "" }] }).success).toBe(false);
  expect(novoQuestionarioSchema.safeParse({ titulo: "Teste", descricao: "", anonimo: true, perguntas: [{ id: "a", tipo: "bloco", enunciado: "<p>Só bloco</p>" }] }).success).toBe(false);
});
it("aceita radio, checkbox e bloco descritivo nas respostas", async () => {
  await db.query("SELECT set_config('test.uid',$1,false)", [gestor]);
  const perguntas = JSON.stringify([
    { id: "b1", tipo: "bloco", enunciado: "<p>Leia com atenção</p>" },
    { id: "r1", tipo: "radio", enunciado: "Cor?", opcoes: ["Azul", "Verde"] },
    { id: "c1", tipo: "checkbox", enunciado: "Itens", opcoes: ["A", "B", "C"] },
  ]);
  const id = (await db.query<{ id: string }>("SELECT criar_questionario('Tipos','<p>Desc</p>',false,$1::jsonb) AS id", [perguntas])).rows[0]?.id ?? "";
  await db.query("SELECT set_config('test.uid',$1,false)", [pessoa]);
  await db.query("SELECT responder_questionario($1,$2::jsonb)", [id, JSON.stringify([null, "Azul", ["A", "C"]])]);
  const r = (await db.query<{ respostas: unknown }>("SELECT respostas FROM questionarios_respostas WHERE questionario_id=$1", [id])).rows[0]?.respostas;
  expect(r).toEqual([null, "Azul", ["A", "C"]]);
  await expect(db.query("SELECT responder_questionario($1,$2::jsonb)", [id, JSON.stringify([null, "Roxo", ["A"]])])).rejects.toThrow("inválida");
});
it("exclusão exige gestor e remove respostas e participação sem afetar outros formulários", async () => {
  await db.query("SELECT set_config('test.uid',$1,false)", [pessoa]);
  await expect(db.query("SELECT iniciar_exclusao_questionario($1)", [anon])).rejects.toThrow("Sem permissão");
  await db.query("SELECT set_config('test.uid',$1,false)", [gestor]);
  await db.query("SELECT reservar_registro_questionario($1)", [anon]);
  await expect(db.query("SELECT iniciar_exclusao_questionario($1)", [anon])).rejects.toThrow("Sincronização");
  await db.query("SELECT liberar_registro_questionario($1)", [anon]);
  await db.query("SELECT iniciar_exclusao_questionario($1)", [anon]);
  await expect(db.query("SELECT responder_questionario($1,'[\"Resposta\"]'::jsonb)", [anon])).rejects.toThrow("exclusão");
  await expect(db.query("SELECT editar_questionario($1,'Outra','',$2::jsonb)", [anon, perguntasId])).rejects.toThrow("exclusão");
  expect((await db.query<{ ok: boolean }>("SELECT reservar_registro_questionario($1) AS ok", [anon])).rows[0]?.ok).toBe(false);
  await db.query("SELECT set_config('test.uid',$1,false)", [pessoa]);
  const list = (await db.query<{ lista: { id: string }[] }>("SELECT listar_questionarios() AS lista")).rows[0]?.lista;
  expect(list?.some(q => q.id === anon)).toBe(false);
  await db.query("SELECT set_config('test.uid',$1,false)", [gestor]);
  await db.exec("SET ROLE authenticated");
  await expect(db.query("SELECT finalizar_exclusao_questionario($1)", [anon])).rejects.toThrow();
  await db.exec("RESET ROLE");
  await db.query("SELECT finalizar_exclusao_questionario($1)", [anon]);
  for (const table of ["questionarios_respostas", "questionarios_participacoes"]) expect((await db.query(`SELECT * FROM ${table} WHERE questionario_id=$1`, [anon])).rows).toHaveLength(0);
  expect((await db.query("SELECT * FROM questionarios_internos WHERE id=$1", [anon])).rows).toHaveLength(0);
  expect((await db.query("SELECT * FROM questionarios_internos WHERE id=$1", [identificado])).rows).toHaveLength(1);
});
