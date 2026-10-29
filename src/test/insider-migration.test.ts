// @vitest-environment node
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, beforeEach, afterAll, it, expect } from "vitest";
let db: PGlite;
const uid = "10000000-0000-0000-0000-000000000001", eid = "20000000-0000-0000-0000-000000000001";
async function viewer(insider = true, sender = true, active = true) {
  await db.exec("RESET ROLE; SET ROLE authenticated");
  await db.query("SELECT set_config('test.insider',$1,false),set_config('test.sender',$2,false),set_config('test.active',$3,false)", [String(insider), String(sender), String(active)]);
}
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`CREATE ROLE authenticated; CREATE ROLE anon; CREATE ROLE service_role; CREATE SCHEMA auth; CREATE SCHEMA storage;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT '${uid}'::uuid $$;
    GRANT USAGE ON SCHEMA auth,storage TO authenticated,anon;
    CREATE FUNCTION public.is_active_user(uuid) RETURNS boolean LANGUAGE sql AS $$ SELECT current_setting('test.active',true)='true' $$;
    CREATE FUNCTION public.tem_permissao(text) RETURNS boolean LANGUAGE sql AS $$ SELECT current_setting('test.insider',true)='true' $$;
    CREATE FUNCTION public.pode_enviar_como(uuid) RETURNS boolean LANGUAGE sql AS $$ SELECT current_setting('test.sender',true)='true' $$;
    CREATE FUNCTION public.gere_aviso(uuid,uuid) RETURNS boolean LANGUAGE sql AS $$ SELECT false $$;
    CREATE FUNCTION public.aviso_vigente(timestamptz,timestamptz,timestamptz) RETURNS boolean LANGUAGE sql AS $$ SELECT $1<=now() AND $3 IS NULL $$;
    CREATE TABLE public.avisos(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),titulo text,mensagem text,perfil_id uuid,autor_id uuid,publicar_em timestamptz,tipo text,expira_em timestamptz,arquivado_em timestamptz,editado_em timestamptz);
    CREATE TABLE storage.objects(id uuid,name text,bucket_id text); ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
    CREATE FUNCTION storage.extension(text) RETURNS text LANGUAGE sql AS $$ SELECT split_part($1,'.',2) $$;`);
  await db.exec(readFileSync(new URL("../../drizzle/migrations/0017_insider_edicoes_mensais.sql", import.meta.url), "utf8"));
}, 30000);
beforeEach(async () => {
  await db.exec(`RESET ROLE; TRUNCATE insider_edicoes,insider_preparacoes,avisos; INSERT INTO insider_edicoes(id,mes_ano,titulo,conteudo) VALUES('${eid}','2026-11','Insider','{"abertura":"Original"}');`);
  await viewer();
});
afterAll(async () => { await db.close(); });
it("esconde rascunhos de profissionais e nega edição sem Insider", async () => {
  await viewer(false);
  expect((await db.query("SELECT * FROM insider_edicoes")).rows).toEqual([]);
  await expect(db.query("SELECT salvar_edicao_insider($1,1,'Novo','{}')", [eid])).rejects.toThrow();
});
it("nega publicação sem remetente permitido e não cria aviso parcial", async () => {
  await viewer(true,false);
  await expect(db.query("SELECT publicar_edicao_insider($1,1,$2)", [eid,uid])).rejects.toThrow();
  await db.exec("RESET ROLE");
  expect((await db.query("SELECT * FROM avisos")).rows).toEqual([]);
});
it("publica uma única edição e permite leitura por profissional ativo", async () => {
  await db.query("SELECT publicar_edicao_insider($1,1,$2)", [eid,uid]);
  await db.query("SELECT publicar_edicao_insider($1,2,$2)", [eid,uid]);
  await viewer(false);
  expect((await db.query("SELECT * FROM insider_edicoes")).rows).toHaveLength(1);
  await db.exec("RESET ROLE");
  expect((await db.query("SELECT tipo,autor_id FROM avisos")).rows).toEqual([{ tipo: "insider", autor_id: uid }]);
});
it("preserva edição salva e rejeita revisão antiga", async () => {
  await db.query("SELECT salvar_edicao_insider($1,1,'Insider','{\"abertura\":\"RH editou\"}')", [eid]);
  await expect(db.query("SELECT salvar_edicao_insider($1,1,'Insider','{}')", [eid])).rejects.toThrow();
  expect((await db.query("SELECT conteudo FROM insider_edicoes")).rows).toEqual([{ conteudo: { abertura: "RH editou" } }]);
});
it("nega operações a inativos e visitantes anônimos", async () => {
  await viewer(true,true,false);
  expect((await db.query("SELECT * FROM insider_edicoes")).rows).toEqual([]);
  await expect(db.query("SELECT publicar_edicao_insider($1,1,$2)", [eid,uid])).rejects.toThrow();
  await db.exec("RESET ROLE; SET ROLE anon");
  await expect(db.query("SELECT publicar_edicao_insider($1,1,$2)", [eid,uid])).rejects.toThrow();
});
it("reserva o mês apenas uma vez e não sobrescreve edição existente", async () => {
  await db.exec("RESET ROLE");
  expect((await db.query("SELECT reservar_insider('2026-12',$1) AS ok", [uid])).rows).toEqual([{ ok: true }]);
  expect((await db.query("SELECT reservar_insider('2026-12',$1) AS ok", [eid])).rows).toEqual([{ ok: false }]);
  expect((await db.query("SELECT reservar_insider('2026-11',$1) AS ok", [uid])).rows).toEqual([{ ok: false }]);
});