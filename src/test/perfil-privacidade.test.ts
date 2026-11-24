// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

it("persiste preferências de privacidade do dono e impede escrita de outro profissional", async () => {
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
    await db.exec(readFileSync("drizzle/migrations/0062_perfil_privacidade.sql", "utf8"));
    await db.exec(`SET ROLE authenticated; SET test.uid = '00000000-0000-4000-8000-000000000001';`);
    await db.query(
      "INSERT INTO perfil_privacidade (usuario_id, mostrar_badges, mostrar_aniversario, mostrar_elogios) VALUES (auth.uid(), $1, $2, $3)",
      [false, false, true],
    );
    const leitura = () =>
      db.query<{ mostrar_badges: boolean; mostrar_aniversario: boolean; mostrar_elogios: boolean }>(
        "SELECT mostrar_badges, mostrar_aniversario, mostrar_elogios FROM perfil_privacidade",
      );
    expect((await leitura()).rows[0]).toEqual({
      mostrar_badges: false,
      mostrar_aniversario: false,
      mostrar_elogios: true,
    });
    await db.query(
      "UPDATE perfil_privacidade SET mostrar_badges = $1, mostrar_aniversario = $2, mostrar_elogios = $3 WHERE usuario_id = auth.uid()",
      [true, true, false],
    );
    expect((await leitura()).rows[0]).toEqual({
      mostrar_badges: true,
      mostrar_aniversario: true,
      mostrar_elogios: false,
    });
    await db.exec(`SET test.uid = '00000000-0000-4000-8000-000000000002';`);
    expect((await leitura()).rows).toEqual([]);
    await expect(
      db.query("INSERT INTO perfil_privacidade (usuario_id) VALUES ('00000000-0000-4000-8000-000000000001')"),
    ).rejects.toThrow();
  } finally {
    await db.close();
  }
});
