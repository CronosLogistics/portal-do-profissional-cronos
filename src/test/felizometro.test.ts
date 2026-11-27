import { describe, expect, it } from "vitest";
import { comparativoSemanal, mediaHumor, pulsoDoDia, type GrupoHumor } from "@/lib/felizometro.rules";

const grupo = (dia: string, pontos: 1 | 5): GrupoHumor => ({ dia, setor: "Tecnologia", total: 5, media: pontos, muito_dificil: pontos === 1 ? 5 : 0, desanimado: 0, neutro: 0, tranquilo: 0, muito_bem: pontos === 5 ? 5 : 0 });
describe("pulso semanal", () => {
  it("abre somente na segunda e sexta", () => {
    expect(pulsoDoDia("2026-11-23")).toBe("segunda");
    expect(pulsoDoDia("2026-11-27")).toBe("sexta");
    for (const dia of ["2026-11-24", "2026-11-25", "2026-11-26", "2026-11-28", "2026-11-29"]) expect(pulsoDoDia(dia)).toBeNull();
  });
  it("compara o começo e fechamento da mesma semana sem inventar valores ausentes", () => {
    expect(comparativoSemanal([grupo("2026-11-23", 5), grupo("2026-11-27", 1), grupo("2026-11-30", 5)])).toEqual([
      { semana: "2026-11-23", segunda: 5, sexta: 1 },
      { semana: "2026-11-30", segunda: 5, sexta: null },
    ]);
  });
  it("pondera a média pelo número de respostas", () => {
    const grande = { ...grupo("2026-11-23", 1), total: 15, muito_dificil: 15 };
    expect(mediaHumor([grupo("2026-11-23", 5), grande])).toBe(2);
    expect(mediaHumor([])).toBeNull();
  });
});