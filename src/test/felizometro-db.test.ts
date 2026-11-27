// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { beforeAll, afterAll, describe, expect, it } from "vitest";

const uid = "00000000-0000-4000-8000-000000000001";
const admin = "00000000-0000-4000-8000-000000000002";
const gp = "00000000-0000-4000-8000-000000000003";
const qualidade = "00000000-0000-4000-8000-000000000004";
const inativo = "00000000-0000-4000-8000-000000000005";
let db: PGlite;
async function entrar(id: string, quando = "2026-11-27T13:45:00Z") {
  await db.exec(`RESET ROLE; SET test.uid = '${id}'; SET test.agora = '${quando}'; SET ROLE authenticated;`);
}
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT current_setting('test.uid',true)::uuid $$;
    CREATE FUNCTION public.test_now() RETURNS timestamptz LANGUAGE sql AS $$ SELECT current_setting('test.agora')::timestamptz $$;
    CREATE TABLE public.profiles(id uuid PRIMARY KEY,is_active boolean,administrador boolean,gp boolean);
    INSERT INTO profiles VALUES ('${uid}',true,false,false),('${admin}',true,true,false),('${gp}',true,false,true),('${qualidade}',true,false,false),('${inativo}',false,true,true);
    CREATE FUNCTION public.is_active_user(u uuid) RETURNS boolean LANGUAGE sql AS $$ SELECT is_active FROM profiles WHERE id=u $$;
    CREATE FUNCTION public.usuario_tem_permissao(u uuid,p text) RETURNS boolean LANGUAGE sql AS $$ SELECT administrador FROM profiles WHERE id=u $$;
    CREATE FUNCTION public.meu_escopo_departamento() RETURNS jsonb LANGUAGE sql AS $$ SELECT jsonb_build_object('gestaoPessoas',gp) FROM profiles WHERE id=auth.uid() $$;
    CREATE TABLE public.departamentos_portal(id text PRIMARY KEY,nome text);
    CREATE TABLE public.profissional_departamento(usuario_id uuid,departamento_id text);
    INSERT INTO departamentos_portal VALUES ('ti','Tecnologia');
    INSERT INTO profissional_departamento VALUES ('${uid}','ti');
    GRANT USAGE ON SCHEMA auth TO authenticated;
  `);
  // A controllable test clock exercises the exact migration's Brazil-day guards.
  await db.exec(readFileSync("drizzle/migrations/0065_felizometro_anonimo.sql", "utf8").replaceAll("now()", "public.test_now()"));
  await db.exec(readFileSync("drizzle/migrations/0066_felizometro_painel_quatro_sentimentos.sql", "utf8").replaceAll("now()", "public.test_now()"));
}, 30000);
afterAll(async () => { await db?.close(); });

describe("proteções do Felizômetro", () => {
  it("permite relatório só para Gestão de Pessoas e administradores ativos", async () => {
    for (const [id, permitido] of [[uid,false],[admin,true],[gp,true],[qualidade,false],[inativo,false]] as const) {
      await entrar(id);
      expect((await db.query<{ permitido: boolean }>("SELECT pode_ver_felizometro() AS permitido")).rows[0]?.permitido).toBe(permitido);
      if (!permitido) await expect(db.query("SELECT relatorio_felizometro('2026-11-01','2026-11-30')")).rejects.toThrow();
    }
  });
  it("grava um voto com relato opcional, sem identidade, e bloqueia duplicação", async () => {
    await entrar(uid);
    expect((await db.query<{ p: { pendente: boolean } }>("SELECT felizometro_pendente() AS p")).rows[0]?.p.pendente).toBe(true);
    await db.query("SELECT responder_felizometro(4,'Uma conquista do time')");
    expect((await db.query<{ p: { pendente: boolean } }>("SELECT felizometro_pendente() AS p")).rows[0]?.p.pendente).toBe(false);
    await expect(db.query("SELECT responder_felizometro(1,'outro')")).rejects.toThrow("já respondeu");
    await expect(db.query("SELECT * FROM felizometro_respostas")).rejects.toThrow();
    await expect(db.query("SELECT * FROM felizometro_participacoes")).rejects.toThrow();
    await db.exec("RESET ROLE");
    const rows = (await db.query<{ setor: string; sentimento: number; relato: string }>("SELECT * FROM felizometro_respostas")).rows;
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ setor: "Tecnologia", sentimento: 4, relato: "Uma conquista do time" });
    expect(rows[0]).not.toHaveProperty("usuario_id");
    expect(rows[0]).not.toHaveProperty("criado_em");
  });
  it("aceita emoji sem relato e permite o próximo pulso", async () => {
    await entrar(uid,"2026-11-30T13:00:00Z");
    await db.query("SELECT responder_felizometro(5)");
    await db.exec("RESET ROLE");
    expect((await db.query<{ relato: string }>("SELECT relato FROM felizometro_respostas WHERE dia='2026-11-30'")).rows[0]?.relato).toBe("");
  });
  it("usa o dia de Brasília e bloqueia dias fora de segunda/sexta", async () => {
    await entrar(uid,"2026-11-28T01:00:00Z");
    expect((await db.query<{ p: { dia: string; pulso: string } }>("SELECT felizometro_pendente() AS p")).rows[0]?.p).toMatchObject({ dia: "2026-11-27", pulso: "sexta" });
    for (const data of ["2026-11-24T12:00:00Z","2026-11-25T12:00:00Z","2026-11-26T12:00:00Z","2026-11-28T12:00:00Z","2026-11-29T12:00:00Z"]) {
      await entrar(uid,data);
      await expect(db.query("SELECT responder_felizometro(3)")).rejects.toThrow("segundas e sextas");
    }
  });
  it("rejeita sentimentos inválidos e relatos acima de 1000 caracteres", async () => {
    await entrar(gp);
    await expect(db.query("SELECT responder_felizometro(0)")).rejects.toThrow();
    await expect(db.query("SELECT responder_felizometro(6)")).rejects.toThrow();
    await expect(db.query("SELECT responder_felizometro(3,$1)", ["a".repeat(1001)])).rejects.toThrow("1000");
    await db.query("SELECT responder_felizometro(3,$1)", ["a".repeat(1000)]);
  });
  it("oculta grupos com menos de cinco votos e dias ainda abertos", async () => {
    await db.exec("RESET ROLE");
    await db.exec(`INSERT INTO felizometro_respostas(dia,setor,sentimento,relato) SELECT '2026-11-23','Grupo grande',4,'Relato anônimo' FROM generate_series(1,5);
      INSERT INTO felizometro_respostas(dia,setor,sentimento,relato) SELECT '2026-11-23','Grupo pequeno',1,'Não revelar' FROM generate_series(1,4);
      INSERT INTO felizometro_respostas(dia,setor,sentimento,relato) SELECT '2026-11-27','Grupo atual',5,'Não revelar hoje' FROM generate_series(1,5);`);
    await entrar(admin);
    const result = (await db.query<{ r: { grupos: { total: number; setor: string; media: number }[]; relatos: string[] } }>("SELECT relatorio_felizometro('2026-11-01','2026-11-30') AS r")).rows[0]?.r;
    expect(result?.grupos).toHaveLength(1);
    expect(result?.grupos[0]).toMatchObject({ setor: "Grupo grande", total: 5, media: 4 });
    expect(result?.relatos).toEqual(Array(5).fill("Relato anônimo"));
  });
});

describe("painel consolidado protegido", () => {
  it("mantém administradores e Gestão de Pessoas autorizados, e Qualidade sem acesso ao humor", async () => {
    for (const [id, permitido] of [[admin,true],[gp,true],[qualidade,false],[uid,false],[inativo,false]] as const) {
      await entrar(id);
      const consulta = db.query("SELECT painel_felizometro('2026-11-01','2026-11-30')");
      if (permitido) await expect(consulta).resolves.toBeDefined(); else await expect(consulta).rejects.toThrow("permissão");
    }
  });
  it("aceita quatro níveis e rejeita o quinto sem registrar participação", async () => {
    await entrar(gp,"2026-12-04T12:00:00Z");
    await expect(db.query("SELECT responder_felizometro_v2(5)")).rejects.toThrow("quatro");
    await db.query("SELECT responder_felizometro_v2(4,'Conquista')");
    await expect(db.query("SELECT responder_felizometro_v2(3)")).rejects.toThrow("já respondeu");
    await db.exec("RESET ROLE");
    expect((await db.query<{ sentimento_pulso: number; sentimento: number }>("SELECT sentimento_pulso,sentimento FROM felizometro_respostas WHERE dia='2026-12-04'")).rows[0]).toEqual({ sentimento_pulso: 4, sentimento: 5 });
  });
  it("consolida apenas coortes liberadas sem retornar setor ou autoria", async () => {
    await entrar(admin);
    const r = (await db.query<{ r: { dias: Record<string,unknown>[]; relatos: string[]; ativos: number } }>("SELECT painel_felizometro('2026-11-01','2026-11-30') AS r")).rows[0]?.r;
    expect(r?.dias).toEqual([{ dia: '2026-11-23', total: 5, muito_bem: 0, tranquilo: 5, desanimado: 0, estressado: 0, neutro_legado: 0 }]);
    expect(r?.relatos).toEqual(Array(5).fill('Relato anônimo'));
    expect(r?.ativos).toBe(4);
  });
});
