// @vitest-environment node
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, afterAll, it, expect } from "vitest";
let db: PGlite;
const admin = "10000000-0000-0000-0000-000000000001", qualidade = "10000000-0000-0000-0000-000000000002", tecnologia = "10000000-0000-0000-0000-000000000003", perfil = "20000000-0000-0000-0000-000000000001";
let aviso = "", obrigatorio = "";
const sql = (name: string) => readFileSync(new URL(`../../drizzle/migrations/${name}.sql`, import.meta.url), "utf8");
const usuario = (id: string) => db.query("SELECT set_config('test.uid',$1,false)", [id]);
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`CREATE ROLE authenticated; CREATE ROLE anon; CREATE ROLE service_role; CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('test.uid',true),'')::uuid $$;
    GRANT USAGE ON SCHEMA auth TO authenticated;
    CREATE TABLE profiles(id uuid PRIMARY KEY,full_name text,email text,is_active boolean,primeiro_acesso timestamptz);
    INSERT INTO profiles VALUES('${admin}','Admin','admin@test',true,now()-interval '1 day'),('${qualidade}','Qualidade','q@test',true,now()-interval '1 day'),('${tecnologia}','Tecnologia','t@test',true,now()-interval '1 day');
    CREATE TABLE perfis(id uuid PRIMARY KEY,nome text,ativo boolean,sistema boolean,departamento_sp_id text);
    INSERT INTO perfis VALUES('${perfil}','Administrador',true,true,null);
    CREATE TABLE perfil_permissoes(perfil_id uuid,permissao text,CONSTRAINT perfil_permissoes_permissao_check CHECK(permissao='avisos.publicar'));
    CREATE TABLE usuario_perfis(usuario_id uuid,perfil_id uuid); INSERT INTO usuario_perfis VALUES('${admin}','${perfil}');
    CREATE TABLE departamentos_sincronizacao(id boolean,ativada boolean);
    CREATE TABLE departamentos_portal(id text PRIMARY KEY,nome text);
    INSERT INTO departamentos_portal VALUES('24','QUALIDADE'),('2','TECNOLOGIA');
    CREATE TABLE profissional_departamento(usuario_id uuid,departamento_id text);
    INSERT INTO profissional_departamento VALUES('${qualidade}','24'),('${tecnologia}','2');
    CREATE FUNCTION is_active_user(uuid) RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$ SELECT EXISTS(SELECT 1 FROM profiles WHERE id=$1 AND is_active) $$;
    CREATE FUNCTION tem_permissao(text) RETURNS boolean LANGUAGE sql AS $$ SELECT auth.uid()='${admin}'::uuid $$;`);
  await db.exec(sql('0004_avisos').replace('ALTER PUBLICATION supabase_realtime ADD TABLE public.avisos;', ''));
  await db.exec(sql('0006_avisos_insider'));
  await db.exec(sql('0031_avisos_confirmacao_leitura'));
  await db.exec(sql('0033_avisos_destinatarios_departamentos'));
  await usuario(admin);
  aviso = (await db.query<{id:string}>("INSERT INTO avisos(titulo,perfil_id,departamentos_ids) VALUES('Qualidade',$1,ARRAY['24']) RETURNING id",[perfil])).rows[0]?.id ?? '';
  obrigatorio = (await db.query<{id:string}>("INSERT INTO avisos(titulo,perfil_id,departamentos_ids,exige_confirmacao) VALUES('Ciência Qualidade',$1,ARRAY['24'],true) RETURNING id",[perfil])).rows[0]?.id ?? '';
},30000);
afterAll(async () => { await db.close(); });
it('departamento selecionado recebe avisos na central e no sino', async () => {
  await usuario(qualidade);
  expect((await db.query<{id:string}>('SELECT id FROM listar_avisos_confirmacao()')).rows.map(r=>r.id).sort()).toEqual([aviso,obrigatorio].sort());
  expect((await db.query<{n:number}>('SELECT contar_nao_lidos() AS n')).rows[0]?.n).toBe(2);
});
it('outro departamento não recebe nem confirma aviso, inclusive pela lista antiga', async () => {
  await usuario(tecnologia);
  expect((await db.query('SELECT * FROM listar_avisos_confirmacao()')).rows).toEqual([]);
  expect((await db.query('SELECT * FROM listar_avisos()')).rows).toEqual([]);
  expect((await db.query<{n:number}>('SELECT contar_nao_lidos() AS n')).rows[0]?.n).toBe(0);
  await expect(db.query('SELECT confirmar_leitura_aviso($1)',[obrigatorio])).rejects.toThrow('indisponível');
  await db.exec('SET ROLE authenticated');
  expect((await db.query('SELECT id FROM avisos')).rows).toEqual([]);
  await expect(db.query('INSERT INTO avisos_leituras(aviso_id) VALUES($1)',[aviso])).rejects.toThrow();
  await db.exec('RESET ROLE');
});
it('leitura coletiva não registra avisos de outro departamento', async () => {
  await usuario(tecnologia); await db.query('SELECT marcar_todos_avisos_lidos()');
  expect((await db.query<{n:number}>('SELECT count(*)::int AS n FROM avisos_leituras WHERE usuario_id=$1',[tecnologia])).rows[0]?.n).toBe(0);
});
it('acompanhamento e contagem mostram somente destinatários', async () => {
  await usuario(admin);
  expect((await db.query<{r:{pessoas:{id:string}[]}}>('SELECT acompanhamento_aviso($1) AS r',[obrigatorio])).rows[0]?.r.pessoas.map(p=>p.id)).toEqual([qualidade]);
  expect((await db.query<{ativos:number}>('SELECT ativos FROM avisos_enviados_confirmacao() WHERE id=$1',[aviso])).rows[0]?.ativos).toBe(1);
});
it('destinatários ficam bloqueados depois da publicação', async () => {
  await expect(db.query("UPDATE avisos SET departamentos_ids=ARRAY['2'] WHERE id=$1",[aviso])).rejects.toThrow('não podem mudar');
});
it('departamento atual sincronizado determina acesso após transferência', async () => {
  await db.query("UPDATE profissional_departamento SET departamento_id='2' WHERE usuario_id=$1",[qualidade]); await usuario(qualidade);
  expect((await db.query('SELECT * FROM listar_avisos_confirmacao()')).rows).toEqual([]);
  await db.query("UPDATE profissional_departamento SET departamento_id='24' WHERE usuario_id=$1",[qualidade]);
});
it('todos inclui profissionais ativos sem departamento e valida IDs selecionados', async () => {
  await usuario(admin);
  const id=(await db.query<{id:string}>("INSERT INTO avisos(titulo,perfil_id) VALUES('Todos',$1) RETURNING id",[perfil])).rows[0]?.id;
  expect((await db.query<{v:boolean}>('SELECT aviso_disponivel($1) AS v',[id])).rows[0]?.v).toBe(true);
  await expect(db.query("INSERT INTO avisos(titulo,perfil_id,departamentos_ids) VALUES('Inválido',$1,ARRAY['999'])",[perfil])).rejects.toThrow('válidos');
});
it('agendamento preserva e permite editar os departamentos antes de publicar', async () => {
  await usuario(admin);
  const id=(await db.query<{id:string}>("INSERT INTO avisos(titulo,perfil_id,publicar_em,departamentos_ids) VALUES('Agendado',$1,now()+interval '1 day',ARRAY['24']) RETURNING id",[perfil])).rows[0]?.id;
  await db.query("UPDATE avisos SET departamentos_ids=ARRAY['2'] WHERE id=$1",[id]);
  const rows=(await db.query<{r:{id:string;departamentos_ids:string[]}[]}>('SELECT avisos_enviados_destinatarios() AS r')).rows[0]?.r;
  expect(rows?.find(r=>r.id===id)?.departamentos_ids).toEqual(['2']);
});