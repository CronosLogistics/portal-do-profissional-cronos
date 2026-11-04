/** Uma categoria ou grupo só aparece quando há pendências atribuídas. */
export function temPendencias(...totais: number[]): boolean {
  return totais.some(total => total > 0);
}

/** Soma as pendências abertas; o badge da navbar só zera quando todas forem finalizadas. */
export function somarPendencias(...totais: number[]): number {
  return totais.reduce((soma, total) => soma + Math.max(0, total), 0);
}