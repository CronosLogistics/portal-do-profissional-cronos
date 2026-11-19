// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

it("persiste Sobre mim do dono e impede escrita de outro profissional", async () => {
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
    await db.exec(readFileSync("drizzle/migrations/0059_perfil_sobre.sql", "utf8"));
    await db.exec(`SET ROLE authenticated; SET test.uid = '00000000-0000-4000-8000-000000000001';`);
    await db.query("INSERT INTO perfil_sobre (usuario_id, texto) VALUES (auth.uid(), $1)", ["Olá, sou analista."]);
    const leitura = () => db.query<{ texto: string }>("SELECT texto FROM perfil_sobre");
    expect((await leitura()).rows[0]?.texto).toBe("Olá, sou analista.");
    await db.query("UPDATE perfil_sobre SET texto = $1 WHERE usuario_id = auth.uid()", [""]);
    expect((await leitura()).rows[0]?.texto).toBe("");
    await db.exec(`SET test.uid = '00000000-0000-4000-8000-000000000002';`);
    expect((await leitura()).rows).toEqual([]);
    await expect(db.query("INSERT INTO perfil_sobre VALUES ('00000000-0000-4000-8000-000000000001', 'hack')")).rejects.toThrow();
  } finally {
    await db.close();
  }
});
