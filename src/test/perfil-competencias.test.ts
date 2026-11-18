// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

it("mantém competências salvas em nova leitura e preserva a remoção", async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      CREATE ROLE authenticated;
      CREATE ROLE service_role;
      CREATE SCHEMA auth;
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT current_setting('test.uid', true)::uuid $$;
      CREATE TABLE public.profiles (id uuid PRIMARY KEY, is_active boolean);
      GRANT SELECT ON public.profiles TO authenticated;
      GRANT USAGE ON SCHEMA auth TO authenticated;
      INSERT INTO profiles VALUES ('00000000-0000-4000-8000-000000000001', true), ('00000000-0000-4000-8000-000000000002', true);
    `);
    await db.exec(readFileSync("drizzle/migrations/0058_perfil_competencias_persistentes.sql", "utf8"));
    await db.exec(`SET ROLE authenticated; SET test.uid = '00000000-0000-4000-8000-000000000001';`);
    await db.query("INSERT INTO perfil_competencias (usuario_id, competencias) VALUES (auth.uid(), $1)", [["SQL", "Comunicação"]]);
    const leitura = () => db.query<{ competencias: string[] }>("SELECT competencias FROM perfil_competencias");
    expect((await leitura()).rows[0]?.competencias).toEqual(["SQL", "Comunicação"]);
    await db.query("UPDATE perfil_competencias SET competencias = $1 WHERE usuario_id = auth.uid()", [["Comunicação"]]);
    expect((await leitura()).rows[0]?.competencias).toEqual(["Comunicação"]);
    await db.exec(`SET test.uid = '00000000-0000-4000-8000-000000000002';`);
    expect((await leitura()).rows).toEqual([]);
    await expect(db.query("INSERT INTO perfil_competencias VALUES ('00000000-0000-4000-8000-000000000001', '{}')")).rejects.toThrow();
  } finally {
    await db.close();
  }
});