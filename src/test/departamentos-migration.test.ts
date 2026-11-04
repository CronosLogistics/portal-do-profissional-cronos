// @vitest-environment node
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, afterAll, it, expect } from "vitest";
let db: PGlite;
const admin = "10000000-0000-0000-0000-000000000001", ana = "10000000-0000-0000-0000-000000000002", alexey = "10000000-0000-0000-0000-000000000003";
const legacy = "20000000-0000-0000-0000-000000000001", sistema = "20000000-0000-0000-0000-000000000002";
const snapshot = {
  departamentos: [{ id: "30", nome: "CAXIAS", perfis: [{ nivel: "coordenador", permissoes: ["pendencias.liderados"] }, { nivel: "supervisor", permissoes: [] }] }],
  pessoas: [{ email: "ana@test", departamento: "30", vinculos: [{ departamento: "30", nivel: "coordenador" }] }, { email: "alexey@test", departamento: "30", vinculos: [{ departamento: "30", nivel: "supervisor" }] }],
  hierarquia: [{ departamento: "30", lider: "ana@test", liderado: "alexey@test" }, { departamento: "30", lider: "ana@test", liderado: "semconta@test" }],
};
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`CREATE ROLE authenticated; CREATE ROLE anon; CREATE ROLE service_role; CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('test.uid',true),'')::uuid $$;
    CREATE TABLE public.profiles(id uuid PRIMARY KEY,email text,is_active boolean);
    CREATE TABLE public.perfis(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),nome text NOT NULL,descricao text NOT NULL DEFAULT '',sistema boolean NOT NULL DEFAULT false,ativo boolean NOT NULL DEFAULT true);
    CREATE TABLE public.perfil_permissoes(perfil_id uuid REFERENCES public.perfis(id),permissao text CONSTRAINT perfil_permissoes_permissao_check CHECK(permissao IN ('admin.usuarios','conteudo.editar')),PRIMARY KEY(perfil_id,permissao));
    CREATE TABLE public.usuario_perfis(usuario_id uuid REFERENCES public.profiles(id),perfil_id uuid REFERENCES public.perfis(id),PRIMARY KEY(usuario_id,perfil_id));
    CREATE FUNCTION public.is_active_user(uuid) RETURNS boolean LANGUAGE sql AS $$ SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id=$1 AND is_active) $$;
    CREATE FUNCTION public.tem_permissao(text) RETURNS boolean LANGUAGE sql AS $$ SELECT false $$;
    INSERT INTO profiles VALUES('${admin}','admin@test',true),('${ana}','ana@test',true),('${alexey}','alexey@test',true);
    INSERT INTO perfis(id,nome,sistema) VALUES('${legacy}','Antigo',false),('${sistema}','Administrador',true);
    INSERT INTO perfil_permissoes VALUES('${legacy}','conteudo.editar');
    INSERT INTO usuario_perfis VALUES('${admin}','${sistema}'),('${ana}','${legacy}');`);
  for (const file of ["0024_departamentos_hierarquia_acesso.sql", "0025_departamentos_corrigir_variavel_perfil.sql", "0026_departamentos_escopo_email_e_avisos.sql"]) await db.exec(readFileSync(new URL(`../../drizzle/migrations/${file}`, import.meta.url), "utf8"));
  await db.exec(`CREATE OR REPLACE FUNCTION public.tem_permissao(text) RETURNS boolean LANGUAGE sql AS $$ SELECT usuario_tem_permissao(auth.uid(),$1) $$; SELECT set_config('request.jwt.claim.role','service_role',false); SELECT reservar_departamentos();`);
  await db.query("SELECT aplicar_departamentos($1::jsonb)", [JSON.stringify(snapshot)]);
}, 30000);
afterAll(async () => { await db.close(); });
it("substitui permissões antigas, preservando Administrador", async () => {
  expect((await db.query<{ permitido: boolean }>("SELECT usuario_tem_permissao($1,'conteudo.editar') as permitido", [ana])).rows[0]?.permitido).toBe(false);
  expect((await db.query<{ permitido: boolean }>("SELECT usuario_tem_permissao($1,'admin.usuarios') as permitido", [admin])).rows[0]?.permitido).toBe(true);
});
it("Ana recebe Alexey e liderado sem conta, sem consultar outros setores", async () => {
  await db.query("SELECT set_config('test.uid',$1,false)", [ana]);
  const r = await db.query<{ escopo: { emails: string[] } }>("SELECT meu_escopo_departamento() as escopo");
  expect(r.rows[0]?.escopo.emails.sort()).toEqual(["alexey@test", "ana@test", "semconta@test"]);
});
it("Alexey visualização não consulta Ana", async () => {
  await db.query("SELECT set_config('test.uid',$1,false)", [alexey]);
  const r = await db.query<{ escopo: { emails: string[] } }>("SELECT meu_escopo_departamento() as escopo");
  expect(r.rows[0]?.escopo.emails).toEqual(["alexey@test"]);
});
it("sincronização é idempotente e retira acessos removidos da planilha", async () => {
  await db.query("SELECT aplicar_departamentos($1::jsonb)", [JSON.stringify(snapshot)]);
  expect((await db.query("SELECT * FROM perfis WHERE departamento_sp_id='30'")).rows).toHaveLength(2);
  const atualizado = { ...snapshot, departamentos: [{ ...snapshot.departamentos[0], perfis: [{ nivel: "coordenador", permissoes: [] }, { nivel: "supervisor", permissoes: [] }] }], hierarquia: [] };
  await db.query("SELECT aplicar_departamentos($1::jsonb)", [JSON.stringify(atualizado)]);
  expect((await db.query<{ permitido: boolean }>("SELECT usuario_tem_permissao($1,'pendencias.liderados') as permitido", [ana])).rows[0]?.permitido).toBe(false);
});
it("usuário comum não aplica permissões nem altera perfil automático", async () => {
  await db.exec("SELECT set_config('request.jwt.claim.role','authenticated',false); SET ROLE authenticated;");
  await expect(db.query("SELECT aplicar_departamentos($1::jsonb)", [JSON.stringify(snapshot)])).rejects.toThrow();
  await db.exec("RESET ROLE; GRANT SELECT,UPDATE ON perfis TO authenticated; SET ROLE authenticated;");
  await expect(db.query("UPDATE perfis SET ativo=false WHERE departamento_sp_id='30'")).rejects.toThrow("SharePoint");
  await db.exec("RESET ROLE");
});