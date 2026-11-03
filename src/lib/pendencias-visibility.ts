/** Uma categoria ou grupo só aparece quando há pendências atribuídas. */
export function temPendencias(...totais: number[]): boolean {
  return totais.some(total => total > 0);
}