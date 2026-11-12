// @vitest-environment node
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, afterAll, it, expect } from "vitest";
import { questionarioExpirado, prazoQuestionarioSchema } from "../lib/questionarios.rules";
let db: PGlite;
const gestor = "10000000-0000-0000-0000-000000000001", pessoa = "10000000-0000-0000-0000-000000000002";
const perguntas = JSON.stringify([{ id: "p1", tipo: "texto", enunciado: "Pergunta?" }]);
let existente: string;
const uid = (id: string) => db.query("SELECT set_config('test.uid',$1,false)", [id]);
const criar = async (prazo: string | null) => (await db.query<{ id: string }>("SELECT criar_questionario_com_prazo('Pesquisa','',true,$1::jsonb,$2::date) AS id", [perguntas, prazo])).rows[0]?.id ?? "";
const lista = async () => (await db.query<{ lista: { id: string; expirado: boolean }[] }>("SELECT listar_questionarios() AS lista")).rows[0]?.lista ?? [];
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`CREATE ROLE authenticated; CREATE ROLE anon; CREATE ROLE service_role; CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('test.uid',true),'')::uuid $$;
    CREATE TABLE profiles(id uuid PRIMARY KEY,full_name text,email text,is_active boolean);
    INSERT INTO profiles VALUES('${gestor}','Gestor','gestor@test',true),('${pessoa}','Pessoa','pessoa@test',true);
    CREATE FUNCTION is_active_user(uuid) RETURNS boolean LANGUAGE sql AS $$ SELECT EXISTS(SELECT 1 FROM profiles WHERE id=$1 AND is_active) $$;
    CREATE FUNCTION tem_permissao(text) RETURNS boolean LANGUAGE sql AS $$ SELECT auth.uid()='${gestor}'::uuid AND $1='formularios.gerenciar' $$;
    CREATE TABLE questionarios_rascunhos(id uuid);`);
  for (const file of ["0027_questionarios_internos.sql", "0029_questionarios_edicao_resposta_unica.sql", "0030_questionarios_exclusao_segura.sql", "0039_questionarios_tipos_richtext.sql"]) await db.exec(readFileSync(new URL(`../../drizzle/migrations/${file}`, import.meta.url), "utf8"));
  await uid(gestor);
  existente = (await db.query<{ id: string }>("SELECT criar_questionario('Existente','',true,$1::jsonb) AS id", [perguntas])).rows[0]?.id ?? "";
  await uid(pessoa);
  await db.query("SELECT responder_questionario($1,'[\"Anterior\"]'::jsonb)", [existente]);
  await db.exec(readFileSync(new URL("../../drizzle/migrations/0044_questionarios_prazo_resposta.sql", import.meta.url), "utf8"));
  await db.exec(readFileSync(new URL("../../drizzle/migrations/0045_questionarios_prazo_opcional_rpc.sql", import.meta.url), "utf8"));
}, 30000);
afterAll(async () => { await db.close(); });
it("permite responder até o fim do dia em Brasília, inclusive", () => {
  expect(questionarioExpirado({ expira_em: "2026-11-12" }, new Date("2026-11-13T02:59:59.999Z"))).toBe(false);
  expect(questionarioExpirado({ expira_em: "2026-11-12" }, new Date("2026-11-13T03:00:00Z"))).toBe(true);
  expect(questionarioExpirado({ expira_em: null }, new Date("2030-01-01T00:00:00Z"))).toBe(false);
});
it("rejeita datas inexistentes", () => {
  expect(prazoQuestionarioSchema.safeParse("2026-02-30").success).toBe(false);
  expect(prazoQuestionarioSchema.safeParse("2026-11-12").success).toBe(true);
});
it("pesquisa antiga recebe prazo sem perder resposta, perguntas ou anonimato", async () => {
  await uid(gestor);
  await db.query("SELECT editar_questionario_com_prazo($1,'Atualizado','',$2::jsonb,'2099-12-31')", [existente, perguntas]);
  const r = (await db.query<{ prazo: string; anonimo: boolean; respostas: string[]; perguntas: unknown; respondente_id: unknown }>("SELECT q.expira_em::text AS prazo,q.anonimo,r.respostas,r.perguntas,r.respondente_id FROM questionarios_internos q JOIN questionarios_respostas r ON r.questionario_id=q.id WHERE q.id=$1", [existente])).rows[0];
  expect(r).toMatchObject({ prazo: "2099-12-31", anonimo: true, respostas: ["Anterior"], perguntas: JSON.parse(perguntas), respondente_id: null });
});
it("vencimento bloqueia formulário aberto e remove somente pendências", async () => {
  await uid(gestor);
  const id = await criar("2099-12-31");
  await uid(pessoa);
  const antes = (await db.query<{ n: number }>("SELECT contar_questionarios_pendentes() AS n")).rows[0]?.n ?? 0;
  // Simulates passage of time, not an allowed manager edit.
  await db.exec("ALTER TABLE questionarios_internos DISABLE TRIGGER questionario_prazo_edicao");
  await db.query("UPDATE questionarios_internos SET expira_em='2000-01-01' WHERE id=$1", [id]);
  await db.exec("ALTER TABLE questionarios_internos ENABLE TRIGGER questionario_prazo_edicao");
  await expect(db.query("SELECT responder_questionario($1,'[\"Tardia\"]'::jsonb)", [id])).rejects.toThrow("Prazo de resposta encerrado");
  expect((await lista()).some(q => q.id === id)).toBe(false);
  expect((await db.query<{ n: number }>("SELECT contar_questionarios_pendentes() AS n")).rows[0]?.n).toBe(antes - 1);
  expect((await db.query("SELECT * FROM questionarios_participacoes WHERE questionario_id=$1", [id])).rows).toHaveLength(0);
  await uid(gestor);
  expect((await lista()).find(q => q.id === id)?.expirado).toBe(true);
  await db.query("SELECT editar_questionario_com_prazo($1,'Reaberto','',$2::jsonb,NULL)", [id, perguntas]);
  await uid(pessoa);
  expect((await lista()).some(q => q.id === id)).toBe(true);
  await db.query("SELECT responder_questionario($1,'[\"No prazo\"]'::jsonb)", [id]);
});
it("prazo inválido reverte toda edição e não publica pesquisa parcialmente", async () => {
  await uid(gestor);
  await expect(criar("2000-01-01")).rejects.toThrow("a partir de hoje");
  await expect(db.query("SELECT editar_questionario_com_prazo($1,'Não salvar','',$2::jsonb,'2000-01-01')", [existente, perguntas])).rejects.toThrow("a partir de hoje");
  expect((await db.query<{ titulo: string }>("SELECT titulo FROM questionarios_internos WHERE id=$1", [existente])).rows[0]?.titulo).toBe("Atualizado");
});
it("apenas gestores alteram o prazo", async () => {
  await uid(pessoa);
  await expect(db.query("SELECT editar_questionario_com_prazo($1,'Negado','',$2::jsonb,NULL)", [existente, perguntas])).rejects.toThrow("Sem permissão");
});
it("edita pesquisa já vencida mantendo prazo e respostas; pode prorrogar sem duplicar participação", async () => {
  await uid(gestor);
  await db.exec("ALTER TABLE questionarios_internos DISABLE TRIGGER questionario_prazo_edicao");
  await db.query("UPDATE questionarios_internos SET expira_em='2000-01-01' WHERE id=$1", [existente]);
  await db.exec("ALTER TABLE questionarios_internos ENABLE TRIGGER questionario_prazo_edicao");
  await db.query("SELECT editar_questionario_com_prazo($1,'Vencida editada','',$2::jsonb,'2000-01-01')", [existente, perguntas]);
  await uid(pessoa);
  expect((await lista()).find(q => q.id === existente)?.expirado).toBe(true);
  await uid(gestor);
  await db.query("SELECT editar_questionario_com_prazo($1,'Prorrogada','',$2::jsonb,'2099-12-31')", [existente, perguntas]);
  await uid(pessoa);
  await expect(db.query("SELECT responder_questionario($1,'[\"Duplicada\"]'::jsonb)", [existente])).rejects.toThrow();
  expect((await db.query("SELECT * FROM questionarios_respostas WHERE questionario_id=$1", [existente])).rows).toHaveLength(1);
});