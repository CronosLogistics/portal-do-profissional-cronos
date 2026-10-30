// @vitest-environment node
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, afterAll, it, expect } from "vitest";
let db: PGlite;
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`CREATE ROLE authenticated; CREATE ROLE anon; CREATE ROLE service_role; CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT '10000000-0000-0000-0000-000000000001'::uuid $$;
    GRANT USAGE ON SCHEMA auth TO authenticated;
    CREATE TABLE perfis(id uuid PRIMARY KEY, sistema boolean);
    CREATE TABLE perfil_permissoes(perfil_id uuid,permissao text CHECK(permissao IN ('admin.usuarios')), UNIQUE(perfil_id,permissao));
    INSERT INTO perfis VALUES('4e26aa42-d294-4e12-babe-48e0a1605f93',false),('20000000-0000-0000-0000-000000000001',true);
    CREATE FUNCTION public.is_active_user(uuid) RETURNS boolean LANGUAGE sql AS $$ SELECT current_setting('test.active',true)='true' $$;
    CREATE FUNCTION public.usuario_tem_permissao(uuid,text) RETURNS boolean LANGUAGE sql AS $$ SELECT current_setting('test.profile',true) IN ('Administrador','Qualidade') AND current_setting('test.active',true)='true' $$;
    CREATE FUNCTION public.tem_permissao(text) RETURNS boolean LANGUAGE sql AS $$ SELECT usuario_tem_permissao(auth.uid(),$1) $$;
    CREATE FUNCTION public.set_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.atualizado_em=now(); RETURN NEW; END $$;`);
  await db.exec(readFileSync(new URL('../../drizzle/migrations/0020_formularios_editaveis.sql',import.meta.url),'utf8'));
  await db.exec(readFileSync(new URL('../../drizzle/migrations/0021_formularios_catalogo_permissoes.sql',import.meta.url),'utf8'));
  await db.exec(readFileSync(new URL('../../drizzle/migrations/0022_formularios_atualizacao_data.sql',import.meta.url),'utf8'));
},30000);
afterAll(async () => { await db.close(); });
async function viewer(profile: string, active=true) {
  await db.exec('RESET ROLE; SET ROLE authenticated');
  await db.query("SELECT set_config('test.profile',$1,false),set_config('test.active',$2,false)",[profile,String(active)]);
}
it('preserva os 12 links e concede a nova permissão a Administrador e Qualidade',async () => {
  await db.exec('RESET ROLE');
  expect((await db.query('SELECT id FROM formularios')).rows).toHaveLength(12);
  expect((await db.query("SELECT permissao FROM perfil_permissoes WHERE permissao='formularios.gerenciar'")).rows).toHaveLength(2);
});
for (const perfil of ['Administrador','Qualidade']) it(`${perfil} pode adicionar e editar formulários`,async () => {
  await viewer(perfil);
  const result=await db.query<{id:string}>("INSERT INTO formularios(setor,titulo,acao,url) VALUES('Teste',$1,'Abrir','https://forms.office.com/r/teste') RETURNING id",[perfil]);
  const id=result.rows[0]?.id;
  expect(id).toBeDefined();
  expect((await db.query("UPDATE formularios SET titulo='Editado' WHERE id=$1 RETURNING titulo",[id])).rows).toEqual([{titulo:'Editado'}]);
  expect((await db.query<{p:string[]}>('SELECT minhas_permissoes() AS p')).rows[0]?.p).toContain('formularios.gerenciar');
});
it('demais profissionais consultam mas não adicionam nem editam',async () => {
  await viewer('Profissional');
  expect((await db.query('SELECT id FROM formularios')).rows.length).toBeGreaterThan(0);
  await expect(db.query("INSERT INTO formularios(setor,titulo,acao,url) VALUES('TI','Negado','Abrir','https://forms.office.com/r/teste')")).rejects.toThrow();
  expect((await db.query("UPDATE formularios SET titulo='Negado' RETURNING id")).rows).toEqual([]);
});
it('inativos e visitantes não têm acesso',async () => {
  await viewer('Administrador',false);
  expect((await db.query('SELECT id FROM formularios')).rows).toEqual([]);
  await db.exec('RESET ROLE; SET ROLE anon');
  await expect(db.query('SELECT id FROM formularios')).rejects.toThrow();
});