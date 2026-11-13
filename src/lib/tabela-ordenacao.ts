export type DirecaoOrdenacao = "asc" | "desc";

export type EstadoOrdenacao<K extends string = string> = {
  coluna: K;
  direcao: DirecaoOrdenacao;
};

export type ValorOrdenacao = string | number | boolean | Date | null | undefined;

function valorComparavel(valor: ValorOrdenacao): string | number | boolean | null {
  if (valor == null || valor === "") return null;
  if (valor instanceof Date) {
    const t = valor.getTime();
    return Number.isFinite(t) ? t : null;
  }
  if (typeof valor === "string") {
    const t = Date.parse(valor);
    if (/^\d{4}-\d{2}-\d{2}/.test(valor) && Number.isFinite(t)) return t;
    return valor.trim().toLocaleLowerCase("pt-BR");
  }
  return valor;
}

export function compararValoresOrdenacao(a: ValorOrdenacao, b: ValorOrdenacao, direcao: DirecaoOrdenacao): number {
  const va = valorComparavel(a);
  const vb = valorComparavel(b);
  if (va == null && vb == null) return 0;
  if (va == null) return 1;
  if (vb == null) return -1;
  let cmp = 0;
  if (typeof va === "string" && typeof vb === "string") cmp = va.localeCompare(vb, "pt-BR", { numeric: true, sensitivity: "base" });
  else if (va < vb) cmp = -1;
  else if (va > vb) cmp = 1;
  return direcao === "asc" ? cmp : -cmp;
}

export function ordenarItensTabela<T, K extends string>(
  itens: readonly T[],
  ordenacao: EstadoOrdenacao<K> | null,
  extratores: Record<K, (item: T) => ValorOrdenacao>,
): T[] {
  if (!ordenacao) return [...itens];
  const extrair = extratores[ordenacao.coluna];
  if (!extrair) return [...itens];
  return [...itens].sort((a, b) => compararValoresOrdenacao(extrair(a), extrair(b), ordenacao.direcao));
}

export function proximaOrdenacao<K extends string>(
  atual: EstadoOrdenacao<K> | null,
  coluna: K,
): EstadoOrdenacao<K> | null {
  if (atual?.coluna !== coluna) return { coluna, direcao: "asc" };
  if (atual.direcao === "asc") return { coluna, direcao: "desc" };
  return null;
}
