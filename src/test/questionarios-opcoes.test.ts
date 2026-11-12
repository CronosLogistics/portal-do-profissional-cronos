// @vitest-environment node
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { expect, it } from "vitest";
import { perguntaSchema, validarRespostas } from "../lib/questionarios.rules";
import { normalizarImportacao, rascunhoSchema } from "../lib/questionarios-importacao.rules";

const opcoes = Array.from({ length: 25 }, (_, i) => `Alternativa ${i + 1}`);
const pergunta = { id: "p1", tipo: "checkbox" as const, enunciado: "Escolha", opcoes };

it("aceita 25 alternativas e rejeita 26 na criação, edição, rascunho e resposta", () => {
  for (const tipo of ["radio", "checkbox"] as const) {
    expect(perguntaSchema.safeParse({ ...pergunta, tipo }).success).toBe(true);
    expect(perguntaSchema.safeParse({ ...pergunta, tipo, opcoes: [...opcoes, "Alternativa 26"] }).success).toBe(false);
  }
  expect(validarRespostas([pergunta], [opcoes])).toEqual([opcoes]);
  expect(() => validarRespostas([pergunta], [[...opcoes, "Alternativa 26"]])).toThrow();
  const rascunho = { id: null, titulo: "Teste", descricao: "", anonimo: false, perguntas: [pergunta] };
  expect(rascunhoSchema.safeParse(rascunho).success).toBe(true);
  expect(rascunhoSchema.safeParse({ ...rascunho, perguntas: [{ ...pergunta, opcoes: [...opcoes, "Alternativa 26"] }] }).success).toBe(false);
});

it("preserva as 25 alternativas importadas", () => {
  const r = normalizarImportacao({ titulo: "Teste", descricao: "", perguntas: [{ ...pergunta, descricao: null }] }, () => "p1");
  expect(r.perguntas[0]).toMatchObject({ opcoes });
});

it("o banco aceita salvar e responder 25 alternativas e bloqueia 26", async () => {
  const db = new PGlite();
  try {
    await db.exec(`CREATE ROLE authenticated; CREATE ROLE anon; CREATE ROLE service_role; CREATE SCHEMA auth;
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT '10000000-0000-0000-0000-000000000001'::uuid $$;
      CREATE TABLE profiles(id uuid PRIMARY KEY,full_name text,email text,is_active boolean);
      CREATE FUNCTION is_active_user(uuid) RETURNS boolean LANGUAGE sql AS $$ SELECT true $$;
      CREATE FUNCTION tem_permissao(text) RETURNS boolean LANGUAGE sql AS $$ SELECT true $$;`);
    for (const arquivo of ["0027_questionarios_internos", "0029_questionarios_edicao_resposta_unica", "0030_questionarios_exclusao_segura", "0039_questionarios_tipos_richtext", "0046_questionarios_perguntas_opcionais", "0047_questionarios_25_opcoes"]) {
      await db.exec(readFileSync(new URL(`../../drizzle/migrations/${arquivo}.sql`, import.meta.url), "utf8"));
    }
    const q = (await db.query<{ id: string }>("SELECT criar_questionario('Teste','',false,$1::jsonb) AS id", [JSON.stringify([pergunta])])).rows[0];
    if (!q) throw new Error("Formulário não criado");
    await db.query("SELECT editar_questionario($1,'Editado','',$2::jsonb)", [q.id, JSON.stringify([pergunta])]);
    await expect(db.query("SELECT editar_questionario($1,'Inválido','',$2::jsonb)", [q.id, JSON.stringify([{ ...pergunta, opcoes: [...opcoes, "Alternativa 26"] }])])).rejects.toThrow("Pergunta inválida");
    await expect(db.query("SELECT responder_questionario($1,$2::jsonb)", [q.id, JSON.stringify([[...opcoes, "Alternativa 26"]])])).rejects.toThrow("Resposta inválida");
    await db.query("SELECT responder_questionario($1,$2::jsonb)", [q.id, JSON.stringify([opcoes])]);
    const respostas = await db.query<{ respostas: string[][] }>("SELECT respostas FROM questionarios_respostas WHERE questionario_id=$1", [q.id]);
    expect(respostas.rows[0]?.respostas).toEqual([opcoes]);
  } finally { await db.close(); }
}, 30000);