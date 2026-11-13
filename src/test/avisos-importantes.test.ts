// @vitest-environment node
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, expect, it } from "vitest";

let db: PGlite;
const id = "10000000-0000-0000-0000-000000000001";
const user = "20000000-0000-0000-0000-000000000001";
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`CREATE ROLE authenticated; CREATE ROLE anon; CREATE ROLE service_role; CREATE SCHEMA auth;
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT '${user}'::uuid $$;
  CREATE FUNCTION tem_permissao(text) RETURNS boolean LANGUAGE sql AS $$ SELECT coalesce(current_setting('test.permission',true),'yes')='yes' $$;
  CREATE TABLE avisos(id uuid PRIMARY KEY, titulo text, mensagem text, perfil_id uuid, autor_id uuid, publicar_em timestamptz, expira_em timestamptz, editado_em timestamptz, arquivado_em timestamptz, exige_confirmacao boolean DEFAULT false, tipo text DEFAULT 'comum', departamentos_ids text[] DEFAULT '{}');
  CREATE TABLE profiles(id uuid, primeiro_acesso timestamptz);
  CREATE TABLE avisos_leituras(aviso_id uuid, usuario_id uuid);
  CREATE TABLE avisos_confirmacoes(aviso_id uuid, usuario_id uuid, confirmado_em timestamptz);
  CREATE FUNCTION rotulo_remetente_aviso(uuid,uuid) RETURNS text LANGUAGE sql AS $$ SELECT 'Setor — Pessoa'::text $$;
  CREATE FUNCTION aviso_disponivel(uuid) RETURNS boolean LANGUAGE sql AS $$ SELECT EXISTS(SELECT 1 FROM avisos WHERE id=$1 AND publicar_em<=now() AND arquivado_em IS NULL) $$;
  CREATE FUNCTION notificacoes_mural() RETURNS TABLE(id uuid,titulo text,mensagem text,perfil_nome text,publicar_em timestamptz,expira_em timestamptz,editado_em timestamptz,lido boolean,tipo text,exige_confirmacao boolean,confirmado_em timestamptz) LANGUAGE sql AS $$ SELECT NULL::uuid,NULL::text,NULL::text,NULL::text,NULL::timestamptz,NULL::timestamptz,NULL::timestamptz,false,'mural'::text,false,NULL::timestamptz WHERE false $$;
  CREATE FUNCTION notificacoes_mencoes() RETURNS TABLE(id uuid,titulo text,mensagem text,perfil_nome text,publicar_em timestamptz,expira_em timestamptz,editado_em timestamptz,lido boolean,tipo text,exige_confirmacao boolean,confirmado_em timestamptz) LANGUAGE sql AS $$ SELECT * FROM notificacoes_mural() $$;
  CREATE FUNCTION avisos_enviados_confirmacao() RETURNS TABLE(id uuid,titulo text,mensagem text,perfil_id uuid,perfil_nome text,autor_id uuid,autor_nome text,publicar_em timestamptz,expira_em timestamptz,editado_em timestamptz,arquivado_em timestamptz,lidos bigint,ativos bigint,tipo text,exige_confirmacao boolean) LANGUAGE sql AS $$ SELECT id,titulo,mensagem,perfil_id,'Perfil'::text,autor_id,'Autor'::text,publicar_em,expira_em,editado_em,arquivado_em,0::bigint,1::bigint,tipo,exige_confirmacao FROM avisos $$;`);
  await db.exec(readFileSync(new URL("../../drizzle/migrations/0053_avisos_importantes.sql", import.meta.url), "utf8"));
  await db.exec(readFileSync(new URL("../../drizzle/migrations/0054_importante_independente_confirmacao.sql", import.meta.url), "utf8"));
  await db.query("INSERT INTO avisos(id,titulo,publicar_em,importante,exige_confirmacao) VALUES($1,'Importante',now()-interval '1 day',true,true)", [id]);
}, 30000);
afterAll(async () => { await db.close(); });

it("importante pode ser publicado sem exigir confirmação de leitura", async () => {
  const solto = "10000000-0000-0000-0000-000000000009";
  await db.query("INSERT INTO avisos(id,publicar_em,importante,exige_confirmacao) VALUES($1,now()+interval '1 day',true,false)", [solto]);
  expect((await db.query<{exige_confirmacao:boolean}>("SELECT exige_confirmacao FROM avisos WHERE id=$1", [solto])).rows[0]?.exige_confirmacao).toBe(false);
  await db.query("DELETE FROM avisos WHERE id=$1", [solto]);
});
it("importância publicada não pode ser removida", async () => {
  await expect(db.query("UPDATE avisos SET importante=false WHERE id=$1", [id])).rejects.toThrow("não pode mudar");
});
it("importância agendada pode ser removida antes da publicação", async () => {
  const scheduled = "10000000-0000-0000-0000-000000000002";
  await db.query("INSERT INTO avisos(id,publicar_em,importante) VALUES($1,now()+interval '1 day',true)", [scheduled]);
  await db.query("UPDATE avisos SET importante=false WHERE id=$1", [scheduled]);
  expect((await db.query<{importante:boolean}>("SELECT importante FROM avisos WHERE id=$1", [scheduled])).rows[0]?.importante).toBe(false);
});
it("sem permissão de confirmação não pode publicar importante", async () => {
  await db.exec("SELECT set_config('test.permission','no',false)");
  await expect(db.query("INSERT INTO avisos(id,publicar_em,importante) VALUES(gen_random_uuid(),now(),true)")).rejects.toThrow("Sem permissão");
  await db.exec("SELECT set_config('test.permission','yes',false)");
});
it("Insider não pode ser importante", async () => {
  await expect(db.query("INSERT INTO avisos(id,publicar_em,importante,tipo) VALUES(gen_random_uuid(),now(),true,'insider')")).rejects.toThrow("apenas para avisos comuns");
});
it("filtro retorna só importantes e prioriza o importante pendente", async () => {
  await db.query("INSERT INTO avisos(id,publicar_em,titulo) VALUES(gen_random_uuid(),now(),'Mais recente')");
  expect((await db.query<{id:string}>("SELECT id FROM listar_notificacoes_importantes(_so_importantes=>true)")).rows.map(r=>r.id)).toEqual([id]);
  expect((await db.query<{id:string}>("SELECT id FROM listar_notificacoes_importantes()")).rows[0]?.id).toBe(id);
});
it("leitura automática não reduz contador, confirmação explícita reduz", async () => {
  await db.query("INSERT INTO avisos_leituras VALUES($1,$2)", [id,user]);
  expect((await db.query<{n:number}>("SELECT contar_avisos_importantes()::int AS n")).rows[0]?.n).toBe(1);
  await db.query("INSERT INTO avisos_confirmacoes VALUES($1,$2,now())", [id,user]);
  expect((await db.query<{n:number}>("SELECT contar_avisos_importantes()::int AS n")).rows[0]?.n).toBe(0);
  expect((await db.query<{importante:boolean,lido:boolean}>("SELECT importante,lido FROM listar_notificacoes_importantes(_so_importantes=>true)")).rows[0]).toEqual({importante:true,lido:true});
});