// @vitest-environment node
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, afterAll, it, expect } from "vitest";
let db: PGlite;
const user = "10000000-0000-0000-0000-000000000001";
const inactive = "10000000-0000-0000-0000-000000000002";
const perfil = "20000000-0000-0000-0000-000000000001";
const sql = (name: string) => readFileSync(new URL(`../../drizzle/migrations/${name}.sql`, import.meta.url), "utf8");
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`CREATE ROLE authenticated; CREATE ROLE anon; CREATE ROLE service_role; CREATE SCHEMA auth;
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('test.uid',true),'')::uuid $$;
  GRANT USAGE ON SCHEMA auth TO authenticated;
  CREATE TABLE profiles(id uuid PRIMARY KEY,full_name text,email text,is_active boolean,primeiro_acesso timestamptz);
  INSERT INTO profiles VALUES('${user}','Pessoa','p@test',true,now()-interval '1 day'),('${inactive}','Inativo','i@test',false,now());
  CREATE TABLE perfis(id uuid PRIMARY KEY,nome text,ativo boolean,sistema boolean,departamento_sp_id text);
  INSERT INTO perfis VALUES('${perfil}','Admin',true,true,null);
  CREATE TABLE perfil_permissoes(perfil_id uuid,permissao text,CONSTRAINT perfil_permissoes_permissao_check CHECK(permissao='avisos.publicar'));
  CREATE TABLE usuario_perfis(usuario_id uuid,perfil_id uuid); INSERT INTO usuario_perfis VALUES('${user}','${perfil}');
  CREATE TABLE departamentos_sincronizacao(id boolean,ativada boolean);
  CREATE FUNCTION is_active_user(uuid) RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$ SELECT EXISTS(SELECT 1 FROM profiles WHERE id=$1 AND is_active) $$;
  CREATE FUNCTION tem_permissao(text) RETURNS boolean LANGUAGE sql AS $$ SELECT true $$;
  CREATE TABLE mural_posts(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),titulo text,texto text,criado_em timestamptz DEFAULT now(),data_post date DEFAULT (now() AT TIME ZONE 'America/Sao_Paulo')::date,tipo text);
  CREATE FUNCTION primeiro_util_mes(date) RETURNS date LANGUAGE sql AS $$ SELECT date_trunc('month',$1)::date+CASE extract(dow FROM date_trunc('month',$1))::int WHEN 6 THEN 2 WHEN 0 THEN 1 ELSE 0 END $$;
  CREATE FUNCTION mural_post_vigente(date,date) RETURNS boolean LANGUAGE sql AS $$ SELECT $1<=$2 AND $2<primeiro_util_mes(($1+interval '1 month')::date) $$;
  CREATE TABLE reward_programs(id uuid PRIMARY KEY);
  `);
  await db.exec(sql('0004_avisos').replace('ALTER PUBLICATION supabase_realtime ADD TABLE public.avisos;', ''));
  await db.exec("ALTER TABLE avisos ADD COLUMN tipo text NOT NULL DEFAULT 'comum'");
  await db.exec(sql('0031_avisos_confirmacao_leitura'));
  await db.exec(sql('0035_notificacoes_mural_links_recompensas'));
  await db.query("SELECT set_config('test.uid',$1,false)",[user]);
  await db.exec("INSERT INTO mural_posts(titulo,tipo) VALUES('Aniversário','aniversario'),('Tempo de casa','tempo_casa'),('Geral','geral'); INSERT INTO mural_posts(titulo,tipo,data_post) VALUES('Antigo','aniversario',current_date-interval '2 months');");
},30000);
afterAll(async () => { await db.close(); });
it('aniversário e tempo de casa geram duas notificações, sem gerais ou expirados', async () => {
  expect((await db.query<{titulo:string}>("SELECT titulo FROM listar_notificacoes() ORDER BY titulo")).rows.map(r=>r.titulo)).toEqual(['Aniversário','Tempo de casa']);
  expect((await db.query<{n:number}>('SELECT contar_notificacoes() AS n')).rows[0]?.n).toBe(2);
});
it('abrir uma comemoração registra leitura apenas para o próprio usuário, sem duplicar', async () => {
  await db.exec("SELECT marcar_mural_lido(id) FROM mural_posts WHERE titulo='Aniversário'; SELECT marcar_mural_lido(id) FROM mural_posts WHERE titulo='Aniversário';");
  expect((await db.query<{n:number}>('SELECT contar_notificacoes() AS n')).rows[0]?.n).toBe(1);
  expect((await db.query<{usuario_id:string}>('SELECT usuario_id FROM mural_leituras')).rows).toEqual([{usuario_id:user}]);
});
it('edição do post mantém leitura e não gera nova notificação', async () => {
  await db.exec("UPDATE mural_posts SET titulo='Aniversário corrigido' WHERE titulo='Aniversário'");
  expect((await db.query<{n:number}>('SELECT contar_notificacoes() AS n')).rows[0]?.n).toBe(1);
});
it('marcar todas inclui mural mas não confirma avisos obrigatórios', async () => {
  await db.query("INSERT INTO avisos(titulo,perfil_id,exige_confirmacao) VALUES('Ciência',$1,true)",[perfil]);
  await db.exec('SELECT marcar_todas_notificacoes_lidas()');
  expect((await db.query<{n:number}>('SELECT contar_notificacoes() AS n')).rows[0]?.n).toBe(1);
  expect((await db.query('SELECT * FROM avisos_confirmacoes')).rows).toHaveLength(0);
  expect((await db.query<{tipo:string}>('SELECT tipo FROM listar_notificacoes(false,20,0,true)')).rows.map(r=>r.tipo)).toEqual(['comum']);
});
it('inativos e visitantes não consultam nem registram leituras', async () => {
  await db.query("SELECT set_config('test.uid',$1,false)",[inactive]);
  expect((await db.query('SELECT * FROM listar_notificacoes()')).rows).toHaveLength(0);
  await expect(db.exec('SELECT marcar_mural_lido(id) FROM mural_posts')).rejects.toThrow('indisponível');
  await db.exec('SET ROLE anon');
  await expect(db.exec('SELECT * FROM listar_notificacoes()')).rejects.toThrow();
  await expect(db.exec('SELECT * FROM mural_leituras')).rejects.toThrow();
  await db.exec('RESET ROLE');
});