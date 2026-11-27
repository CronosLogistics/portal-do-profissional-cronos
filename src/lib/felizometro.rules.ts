export const SENTIMENTOS = [
  { valor: 4, emoji: "🤩", nome: "Muito bem", chave: "muito_bem" },
  { valor: 3, emoji: "😊", nome: "Tranquilo", chave: "tranquilo" },
  { valor: 2, emoji: "😟", nome: "Desanimado", chave: "desanimado" },
  { valor: 1, emoji: "😤", nome: "Estressado", chave: "estressado" },
] as const;

export function pulsoDoDia(dia: string): "segunda" | "sexta" | null {
  const numero = new Date(`${dia}T12:00:00Z`).getUTCDay();
  return numero === 1 ? "segunda" : numero === 5 ? "sexta" : null;
}

export type GrupoHumor = {
  dia: string; setor: string; total: number; media: number;
  muito_dificil: number; desanimado: number; neutro: number; tranquilo: number; muito_bem: number;
};
export type RelatorioHumor = { grupos: GrupoHumor[]; relatos: string[] };

export function mediaHumor(grupos: GrupoHumor[]): number | null {
  const total = grupos.reduce((soma, grupo) => soma + grupo.total, 0);
  const pontos = grupos.reduce((soma, g) => soma + g.muito_dificil + g.desanimado * 2 + g.neutro * 3 + g.tranquilo * 4 + g.muito_bem * 5, 0);
  return total ? pontos / total : null;
}

export function comparativoSemanal(grupos: GrupoHumor[]) {
  const semanas = new Map<string, GrupoHumor[]>();
  for (const grupo of grupos) {
    const data = new Date(`${grupo.dia}T12:00:00Z`);
    if (pulsoDoDia(grupo.dia) === "sexta") data.setUTCDate(data.getUTCDate() - 4);
    const semana = data.toISOString().slice(0, 10);
    semanas.set(semana, [...(semanas.get(semana) ?? []), grupo]);
  }
  return [...semanas].sort(([a], [b]) => a.localeCompare(b)).map(([semana, itens]) => ({
    semana,
    segunda: mediaHumor(itens.filter(g => pulsoDoDia(g.dia) === "segunda")),
    sexta: mediaHumor(itens.filter(g => pulsoDoDia(g.dia) === "sexta")),
  }));
}