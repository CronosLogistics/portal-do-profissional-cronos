import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { minhasPendencias } from "@/lib/pendencias.functions";
import { minhasPendenciasPessoas } from "@/lib/pendencias-pessoas.functions";
import { LISTAS_PESSOAS, type TipoPendenciaPessoas } from "@/lib/pendencias-pessoas.rules";
import { somarPendencias } from "@/lib/pendencias-visibility";

export const pendenciasKey = ["pendencias"] as const;
export const pendenciasPessoasKey = ["pendencias-pessoas"] as const;

/** Total de pendências abertas (Qualidade + Gestão de Pessoas) para o badge da navbar. */
export function useTotalPendencias(userId: string | undefined) {
  const buscarQualidade = useServerFn(minhasPendencias);
  const buscarPessoas = useServerFn(minhasPendenciasPessoas);
  const qualidade = useQuery({
    queryKey: [...pendenciasKey, userId],
    queryFn: () => buscarQualidade(),
    enabled: !!userId,
    staleTime: 60_000,
  });
  const pessoas = useQuery({
    queryKey: [...pendenciasPessoasKey, userId],
    queryFn: () => buscarPessoas(),
    enabled: !!userId,
    staleTime: 60_000,
  });
  return useMemo(() => {
    // Badge conta apenas pendências pessoais; as dos liderados ficam na aba própria.
    const q = qualidade.data?.proprias;
    const p = pessoas.data;
    const tipos = Object.keys(LISTAS_PESSOAS) as TipoPendenciaPessoas[];
    return somarPendencias(
      q?.analiseNC.length ?? 0,
      q?.analiseNCMaior.length ?? 0,
      q?.planoAcao.length ?? 0,
      q?.analiseSM.length ?? 0,
      q?.planoAcaoSM.length ?? 0,
      q?.nps.length ?? 0,
      q?.revisoes.length ?? 0,
      ...tipos.map((tipo) => p?.listas[tipo]?.length ?? 0),
    );
  }, [qualidade.data, pessoas.data]);
}
