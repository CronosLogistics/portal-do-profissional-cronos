/** Corporate titles and department assignments both determine eligibility. */
export function elegivelRanking(cargo: string | null, niveis: readonly string[]): boolean {
  const titulo = (cargo ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  return !/\b(coordenador\w*|supervisor\w*)\b/.test(titulo)
    && !niveis.some(nivel => nivel === "coordenador" || nivel === "supervisor");
}

export function ordenarPontuacoes<T extends { pontos: number; data: string }>(linhas: readonly T[]): T[] {
  return [...linhas].sort((a, b) => b.pontos - a.pontos || (a.data || "9").localeCompare(b.data || "9"));
}