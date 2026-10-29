// @vitest-environment node
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, beforeEach, afterAll, describe, expect, it } from "vitest";

const owner = "10000000-0000-0000-0000-000000000001";
const other = "10000000-0000-0000-0000-000000000002";
const inactive = "10000000-0000-0000-0000-000000000003";
const aviso = "20000000-0000-0000-0000-000000000001";
const common = "20000000-0000-0000-0000-000000000002";
const hidden = "20000000-0000-0000-0000-000000000003";
const post = "30000000-0000-0000-0000-000000000001";
const post2 = "30000000-0000-0000-0000-000000000002";
let db: PGlite;

async function asUser(id: string, editor = false) {
  await db.exec("RESET ROLE; SET ROLE authenticated;");
  await db.query("SELECT set_config('test.uid', $1, false), set_config('test.editor', $2, false)", [id, String(editor)]);
}

beforeAll(async () => {
  db = new PGlite();
  // Minimal pre-existing portal schema; the new migration itself runs verbatim.
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('test.uid', true), '')::uuid $$;
    GRANT USAGE ON SCHEMA auth TO authenticated, anon;
    GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated, anon;
    CREATE TABLE public.profiles(id uuid PRIMARY KEY, full_name text, email text, is_active boolean);
    INSERT INTO public.profiles VALUES ('${owner}', 'Owner', 'owner@example.test', true), ('${other}', 'Other', 'other@example.test', true), ('${inactive}', 'Inactive', 'inactive@example.test', false);
    CREATE FUNCTION public.is_active_user(_user_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT EXISTS(SELECT 1 FROM profiles WHERE id=_user_id AND is_active) $$;
    CREATE FUNCTION public.tem_permissao(_permissao text) RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT _permissao='conteudo.editar' AND current_setting('test.editor',true)='true' $$;
    CREATE FUNCTION public.gere_aviso(_autor uuid, _perfil uuid) RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT false $$;
    CREATE FUNCTION public.aviso_vigente(_publicar timestamptz, _expira timestamptz, _arquivado timestamptz) RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT _publicar <= now() AND (_expira IS NULL OR _expira > now()) AND _arquivado IS NULL $$;
    CREATE TABLE public.avisos(id uuid PRIMARY KEY, tipo text, autor_id uuid, perfil_id uuid, publicar_em timestamptz, expira_em timestamptz, arquivado_em timestamptz);
    INSERT INTO public.avisos VALUES ('${aviso}', 'compilado', '${owner}', '${owner}', now(), NULL, NULL), ('${common}', 'comum', '${owner}', '${owner}', now(), NULL, NULL), ('${hidden}', 'compilado', '${owner}', '${owner}', now() + interval '1 day', NULL, NULL);
    CREATE TABLE public.mural_posts(id uuid PRIMARY KEY, titulo text, texto text, imagem_path text, data_post date, visivel_ate date, criado_em timestamptz, tipo text, anos_casa integer);
    INSERT INTO public.mural_posts VALUES ('${post}', 'Aniversários', 'Equipe', NULL, current_date, NULL, now(), 'aniversario', NULL), ('${post2}', 'Tempo de casa', 'Equipe', NULL, current_date, NULL, now(), 'tempo_casa', 5);
    CREATE FUNCTION public.listar_mural() RETURNS TABLE(id uuid, titulo text, texto text, imagem_path text, data_post date, visivel_ate date, criado_em timestamptz, comentarios jsonb, tipo text, anos_casa integer) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT p.id,p.titulo,p.texto,p.imagem_path,p.data_post,p.visivel_ate,p.criado_em,'[]'::jsonb,p.tipo,p.anos_casa FROM mural_posts p WHERE is_active_user(auth.uid()) $$;
  `);
  await db.exec(readFileSync(new URL("../../drizzle/migrations/0014_comentarios_compilado_reacoes_mural.sql", import.meta.url), "utf8"));
}, 30000);

beforeEach(async () => {
  await db.exec("RESET ROLE; TRUNCATE public.avisos_comentarios, public.avisos_reacoes, public.mural_reacoes;");
  await asUser(owner);
});
afterAll(async () => { await db?.close(); });

describe("Applied interactions migration", () => {
  it("stores trimmed comments and reads the frontend JSON contract", async () => {
    await db.query("INSERT INTO avisos_comentarios(aviso_id,texto) VALUES ($1,'  Parabéns!  ')", [aviso]);
    const { rows } = await db.query<{ data: { comentarios: { texto: string; usuario_id: string; nome: string }[]; reacoes: unknown[]; minha_reacao: string | null } }>("SELECT interacoes_compilado($1) AS data", [aviso]);
    expect(rows[0]?.data.comentarios[0]).toMatchObject({ texto: "Parabéns!", usuario_id: owner, nome: "Owner" });
    expect(rows[0]?.data.reacoes).toEqual([]);
    expect(rows[0]?.data.minha_reacao).toBeNull();
  });

  it("rejects blank comments and comments longer than 1000 characters", async () => {
    for (const texto of ["   ", "x".repeat(1001)]) {
      await expect(db.query("INSERT INTO avisos_comentarios(aviso_id,texto) VALUES ($1,$2)", [aviso, texto])).rejects.toThrow();
    }
    await db.query("INSERT INTO avisos_comentarios(aviso_id,texto) VALUES ($1,$2)", [aviso, "x".repeat(1000)]);
  });

  it("accepts exactly the five supported emoji and rejects others", async () => {
    for (const emoji of ["👍", "❤️", "👏", "🎉", "😮"]) {
      for (const [table, key, id] of [["avisos_reacoes", "aviso_id", aviso], ["mural_reacoes", "post_id", post]]) {
        await db.query(`INSERT INTO ${table}(${key},emoji) VALUES ($1,$2) ON CONFLICT (${key},usuario_id) DO UPDATE SET emoji=excluded.emoji`, [id, emoji]);
      }
    }
    await expect(db.query("INSERT INTO mural_reacoes(post_id,emoji) VALUES ($1,'🔥') ON CONFLICT (post_id,usuario_id) DO UPDATE SET emoji=excluded.emoji", [post])).rejects.toThrow();
  });

  it("keeps one reaction per person and supports replace then remove", async () => {
    for (const [table, key, id] of [["avisos_reacoes", "aviso_id", aviso], ["mural_reacoes", "post_id", post]]) {
      await db.query(`INSERT INTO ${table}(${key},emoji) VALUES ($1,'👍')`, [id]);
      await expect(db.query(`INSERT INTO ${table}(${key},emoji) VALUES ($1,'🎉')`, [id])).rejects.toThrow();
      await db.query(`INSERT INTO ${table}(${key},emoji) VALUES ($1,'🎉') ON CONFLICT (${key},usuario_id) DO UPDATE SET emoji=excluded.emoji`, [id]);
      expect((await db.query(`SELECT emoji FROM ${table}`)).rows).toEqual([{ emoji: "🎉" }]);
      await db.query(`DELETE FROM ${table} WHERE ${key}=$1`, [id]);
      expect((await db.query(`SELECT * FROM ${table}`)).rows).toEqual([]);
    }
  });

  it("denies inactive users reads and writes", async () => {
    await asUser(inactive);
    await expect(db.query("INSERT INTO avisos_comentarios(aviso_id,texto) VALUES ($1,'Teste')", [aviso])).rejects.toThrow();
    await expect(db.query("INSERT INTO mural_reacoes(post_id,emoji) VALUES ($1,'👍')", [post])).rejects.toThrow();
    expect((await db.query("SELECT * FROM listar_mural_com_reacoes()")).rows).toEqual([]);
    expect((await db.query("SELECT interacoes_compilado($1) AS data", [aviso])).rows).toEqual([{ data: null }]);
  });

  it("denies interactions on ordinary or unpublished avisos", async () => {
    for (const id of [common, hidden]) {
      await expect(db.query("INSERT INTO avisos_comentarios(aviso_id,texto) VALUES ($1,'Teste')", [id])).rejects.toThrow();
      await expect(db.query("INSERT INTO avisos_reacoes(aviso_id,emoji) VALUES ($1,'👍')", [id])).rejects.toThrow();
      expect((await db.query("SELECT interacoes_compilado($1) AS data", [id])).rows).toEqual([{ data: null }]);
    }
  });

  it("prevents impersonating another author", async () => {
    await expect(db.query("INSERT INTO avisos_comentarios(aviso_id,usuario_id,texto) VALUES ($1,$2,'Teste')", [aviso, other])).rejects.toThrow();
    await expect(db.query("INSERT INTO mural_reacoes(post_id,usuario_id,emoji) VALUES ($1,$2,'👍')", [post, other])).rejects.toThrow();
  });

  it("only owners edit comments; editors can moderate deletion", async () => {
    await db.query("INSERT INTO avisos_comentarios(aviso_id,texto) VALUES ($1,'Original')", [aviso]);
    await asUser(other);
    await db.exec("UPDATE avisos_comentarios SET texto='Intrusão'; DELETE FROM avisos_comentarios;");
    expect((await db.query("SELECT texto FROM avisos_comentarios")).rows).toEqual([{ texto: "Original" }]);
    await asUser(other, true);
    await db.exec("DELETE FROM avisos_comentarios;");
    expect((await db.query("SELECT * FROM avisos_comentarios")).rows).toEqual([]);
  });

  it("other users cannot edit or delete reactions, even as editors", async () => {
    await db.query("INSERT INTO mural_reacoes(post_id,emoji) VALUES ($1,'👍')", [post]);
    await asUser(other, true);
    await db.exec("UPDATE mural_reacoes SET emoji='🎉'; DELETE FROM mural_reacoes;");
    expect((await db.query("SELECT emoji FROM mural_reacoes")).rows).toEqual([{ emoji: "👍" }]);
  });

  it("locks parent IDs and ownership on updates and marks edited comments", async () => {
    await db.query("INSERT INTO mural_reacoes(post_id,emoji) VALUES ($1,'👍')", [post]);
    await db.query("UPDATE mural_reacoes SET post_id=$1, usuario_id=$2, criado_em='2000-01-01', emoji='🎉'", [post2, other]);
    expect((await db.query("SELECT post_id,usuario_id,emoji FROM mural_reacoes")).rows).toEqual([{ post_id: post, usuario_id: owner, emoji: "🎉" }]);
    await db.query("INSERT INTO avisos_comentarios(aviso_id,texto) VALUES ($1,'Original')", [aviso]);
    await db.query("UPDATE avisos_comentarios SET aviso_id=$1,usuario_id=$2,texto='Editado'", [common, other]);
    expect((await db.query("SELECT aviso_id,usuario_id,texto,editado_em IS NOT NULL AS edited FROM avisos_comentarios")).rows).toEqual([{ aviso_id: aviso, usuario_id: owner, texto: "Editado", edited: true }]);
  });

  it("aggregates reaction totals with the current user's selection", async () => {
    await db.query("INSERT INTO mural_reacoes(post_id,emoji) VALUES ($1,'🎉')", [post]);
    await asUser(other);
    await db.query("INSERT INTO mural_reacoes(post_id,emoji) VALUES ($1,'🎉')", [post]);
    const { rows } = await db.query("SELECT reacoes,minha_reacao FROM listar_mural_com_reacoes() WHERE id=$1", [post]);
    expect(rows).toEqual([{ reacoes: [{ emoji: "🎉", total: 2, meu: true }], minha_reacao: "🎉" }]);
    expect((await db.query("SELECT * FROM listar_mural()")).rows).toHaveLength(2);
  });

  it("does not expose new tables or RPCs to anonymous visitors", async () => {
    await db.exec("RESET ROLE; SET ROLE anon;");
    await expect(db.query("SELECT * FROM mural_reacoes")).rejects.toThrow();
    await expect(db.query("SELECT * FROM listar_mural_com_reacoes()")).rejects.toThrow();
    await expect(db.query("SELECT interacoes_compilado($1)", [aviso])).rejects.toThrow();
  });
});