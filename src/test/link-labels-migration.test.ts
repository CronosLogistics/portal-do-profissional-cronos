// @vitest-environment node
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { expect, it } from "vitest";

it("adds editable link labels without changing existing links and preserves them on reapplication", async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      CREATE TABLE public.reward_programs(id integer PRIMARY KEY, website text, materials_url text);
      CREATE TABLE public.benefits(id integer PRIMARY KEY, website text, materials_url text);
      CREATE TABLE public.partners(id integer PRIMARY KEY, website text);
      INSERT INTO reward_programs VALUES(1,'https://example.com/reward','https://example.com/reward-materials');
      INSERT INTO benefits VALUES(1,'https://example.com/benefit','https://example.com/benefit-materials');
      INSERT INTO partners VALUES(1,'https://example.com/partner');
    `);
    const sql = readFileSync(new URL("../../drizzle/migrations/0037_rotulos_links_conteudo.sql", import.meta.url), "utf8");
    await db.exec(sql);
    for (const table of ["reward_programs", "benefits", "partners"]) {
      await db.query(`UPDATE public.${table} SET website_label=$1 WHERE id=1`, ["Consultar recursos"]);
    }
    for (const table of ["reward_programs", "benefits"]) {
      await db.query(`UPDATE public.${table} SET materials_label=$1 WHERE id=1`, ["Abrir arquivos"]);
    }
    await db.exec(sql);
    for (const [table, suffix] of [["reward_programs", "reward"], ["benefits", "benefit"], ["partners", "partner"]]) {
      const result = await db.query(`SELECT website,website_label FROM public.${table} WHERE id=1`);
      expect(result.rows).toEqual([{website:`https://example.com/${suffix}`,website_label:"Consultar recursos"}]);
    }
    for (const [table, suffix] of [["reward_programs", "reward"], ["benefits", "benefit"]]) {
      const result = await db.query(`SELECT materials_url,materials_label FROM public.${table} WHERE id=1`);
      expect(result.rows).toEqual([{materials_url:`https://example.com/${suffix}-materials`,materials_label:"Abrir arquivos"}]);
    }
  } finally {
    await db.close();
  }
}, 30000);