// @vitest-environment node
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, afterAll, it, expect } from "vitest";
let db: PGlite;
const admin = "10000000-0000-0000-0000-000000000001", pessoa = "10000000-0000-0000-0000-000000000002", perfil = "20000000-0000-0000-0000-000000000001";
let obrigatorio = "", comum = "";
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`CREATE ROLE authenticated; CREATE ROLE anon; CREATE ROLE service_role; CREATE SCHEMA auth;
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('test.uid',true),'')::uuid $$;
  CREATE TABLE profiles(id uuid PRIMARY KEY, full_name text, email text, is_active boolean, primeiro_acesso timestamptz);
  INSERT INTO profiles VALUES('${admin}','Administrador','admin@test',true,now()),('${pessoa}','Colaborador','pessoa@test',true,now()+interval '1 day');
  CREATE TABLE perfis(id uuid PRIMARY KEY,nome text,ativo boolean,sistema boolean,departamento_sp_id text);
  INSERT INTO perfis VALUES('${perfil}','Administrador',true,true,null);
  CREATE TABLE perfil_permissoes(perfil_id uuid,permissao text,CONSTRAINT perfil_permissoes_permissao_check CHECK(permissao='avisos.publicar'));
  CREATE TABLE usuario_perfis(usuario_id uuid,perfil_id uuid);
  INSERT INTO usuario_perfis VALUES('${admin}','${perfil}');
  CREATE TABLE departamentos_sincronizacao(id boolean,ativada boolean);
  CREATE FUNCTION is_active_user(uuid) RETURNS boolean LANGUAGE sql AS $$ SELECT EXISTS(SELECT 1 FROM profiles WHERE id=$1 AND is_active) $$;
  CREATE FUNCTION tem_permissao(text) RETURNS boolean LANGUAGE sql AS $$ SELECT auth.uid()='${admin}'::uuid $$;`);
  await db.exec(readFileSync(new URL('../../drizzle/migrations/0004_avisos.sql', import.meta.url),'utf8').replace('ALTER PUBLICATION supabase_realtime ADD TABLE public.avisos;', ''));
  await db.exec("ALTER TABLE avisos ADD COLUMN tipo text NOT NULL DEFAULT 'comum'");
  await db.exec(readFileSync(new URL('../../drizzle/migrations/0031_avisos_confirmacao_leitura.sql', import.meta.url),'utf8'));
  await db.query("SELECT set_config('test.uid',$1,false)",[admin]);
  obrigatorio = (await db.query<{id:string}>("INSERT INTO avisos(titulo,perfil_id,exige_confirmacao) VALUES('Ciência',$1,true) RETURNING id",[perfil])).rows[0]?.id ?? '';
  comum = (await db.query<{id:string}>("INSERT INTO avisos(titulo,perfil_id) VALUES('Normal',$1) RETURNING id",[perfil])).rows[0]?.id ?? '';
},30000);
afterAll(async () => { await db.close(); });
it('leitura automática não confirma ciência nem usa isenção de primeiro acesso', async () => {
  await db.query("SELECT set_config('test.uid',$1,false)",[pessoa]);
  await db.query('INSERT INTO avisos_leituras(aviso_id,usuario_id) VALUES($1,$2)',[obrigatorio,pessoa]);
  const row = (await db.query<{lido:boolean}>('SELECT lido FROM listar_avisos_confirmacao(false,20,0,true)')).rows[0];
  expect(row?.lido).toBe(false);
  expect((await db.query<{n:number}>('SELECT contar_nao_lidos() AS n')).rows[0]?.n).toBe(1);
});
it('marcar todos como lidos nunca confirma os obrigatórios', async () => {
  await db.query('SELECT marcar_todos_avisos_lidos()');
  expect((await db.query<{n:number}>('SELECT count(*)::int AS n FROM avisos_confirmacoes')).rows[0]?.n).toBe(0);
  expect((await db.query<{n:number}>('SELECT contar_nao_lidos() AS n')).rows[0]?.n).toBe(1);
});
it('filtro obrigatório retorna apenas esses avisos', async () => {
  expect((await db.query<{id:string}>('SELECT id FROM listar_avisos_confirmacao(false,20,0,true)')).rows.map(r=>r.id)).toEqual([obrigatorio]);
});
it('notificação pendente não desaparece pela expiração', async () => {
  await db.query('UPDATE avisos SET expira_em=publicar_em+interval \'1 microsecond\' WHERE id=$1',[obrigatorio]);
  expect((await db.query<{n:number}>('SELECT contar_nao_lidos() AS n')).rows[0]?.n).toBe(1);
});
it('colaborador sem permissão não publica obrigatório nem consulta relatório', async () => {
  await expect(db.query("INSERT INTO avisos(titulo,perfil_id,exige_confirmacao) VALUES('Negado',$1,true)",[perfil])).rejects.toThrow('Sem permissão');
  await expect(db.query('SELECT acompanhamento_aviso($1)',[obrigatorio])).rejects.toThrow('Sem permissão');
});
it('ciência só é registrada por confirmação explícita e idempotente', async () => {
  await db.query('SELECT confirmar_leitura_aviso($1)',[obrigatorio]);
  // Restore validity to test duplicate acknowledgment and visible confirmed status.
  await db.query('UPDATE avisos SET expira_em=null WHERE id=$1',[obrigatorio]);
  await db.query('SELECT confirmar_leitura_aviso($1)',[obrigatorio]);
  expect((await db.query<{n:number}>('SELECT count(*)::int AS n FROM avisos_confirmacoes')).rows[0]?.n).toBe(1);
  expect((await db.query<{n:number}>('SELECT contar_nao_lidos() AS n')).rows[0]?.n).toBe(0);
  expect((await db.query<{lido:boolean}>('SELECT lido FROM listar_avisos_confirmacao(false,20,0,true)')).rows[0]?.lido).toBe(true);
});
it('relatório autorizado mostra nome de quem confirmou e quem não confirmou', async () => {
  await db.query("SELECT set_config('test.uid',$1,false)",[admin]);
  const r = (await db.query<{dados:{titulo:string;pessoas:{nome:string;confirmado_em:string|null}[]}}>('SELECT acompanhamento_aviso($1) AS dados',[obrigatorio])).rows[0]?.dados;
  expect(r?.titulo).toBe('Ciência');
  expect(r?.pessoas.find(p=>p.nome==='Colaborador')?.confirmado_em).toBeTruthy();
  expect(r?.pessoas.find(p=>p.nome==='Administrador')?.confirmado_em).toBeNull();
});
it('exigência não pode ser removida após publicação', async () => {
  await expect(db.query('UPDATE avisos SET exige_confirmacao=false WHERE id=$1',[obrigatorio])).rejects.toThrow('não pode mudar');
});
it('colaborador não pode escrever diretamente confirmação nem confirmar aviso comum', async () => {
  await db.exec('SET ROLE authenticated');
  await expect(db.query('INSERT INTO avisos_confirmacoes(aviso_id,usuario_id) VALUES($1,$2)',[obrigatorio,admin])).rejects.toThrow();
  await db.exec('RESET ROLE');
  await expect(db.query('SELECT confirmar_leitura_aviso($1)',[comum])).rejects.toThrow('indisponível');
});