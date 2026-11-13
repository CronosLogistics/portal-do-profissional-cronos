import { useState } from "react";
import {
  ordenarItensTabela,
  proximaOrdenacao,
  type EstadoOrdenacao,
  type ValorOrdenacao,
} from "@/lib/tabela-ordenacao";

export function useOrdenacaoTabela<T, K extends string>(
  itens: readonly T[],
  extratores: Record<K, (item: T) => ValorOrdenacao>,
  inicial: EstadoOrdenacao<K> | null = null,
) {
  const [ordenacao, setOrdenacao] = useState<EstadoOrdenacao<K> | null>(inicial);
  return {
    itens: ordenarItensTabela(itens, ordenacao, extratores),
    ordenacao,
    alternar: (coluna: K) => setOrdenacao((atual) => proximaOrdenacao(atual, coluna)),
  };
}
