import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { minhasPendencias } from "@/lib/pendencias.functions";
import { minhasPendenciasPessoas } from "@/lib/pendencias-pessoas.functions";
import { LISTAS_PESSOAS, type TipoPendenciaPessoas } from "@/lib/pendencias-pessoas.rules";
import { somarPendencias } from "@/lib/pendencias-visibility";

export const pendenciasKey = ["pendencias"] as const;
export const pendenciasPessoasKey = ["pendencias-pessoas"] as const;

/** Total e estado de carga das pendências pessoais (Qualidade + Gestão de Pessoas). */
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
  const total = useMemo(() => {
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
  const pronto = Boolean(userId) && !qualidade.isLoading && !pessoas.isLoading && (qualidade.isFetched || qualidade.isError) && (pessoas.isFetched || pessoas.isError);
  return { total, pronto };
}

/** Avisa uma vez por sessão, no canto superior direito, se o colaborador tiver pendências. */
export function useAlertaPendenciasLogin(userId: string | undefined, total: number, pronto: boolean) {
  const navigate = useNavigate();

  useEffect(() => {
    if (!userId || !pronto || total <= 0) return;
    const flag = `portal-pendencias:${userId}`;
    if (sessionStorage.getItem(flag)) return;
    sessionStorage.setItem(flag, "1");
    const qtd = total === 1 ? "1 pendência" : `${total} pendências`;
    toast(`Você tem ${qtd}`, {
      description: "Há itens aguardando sua atenção. Abra Pendências para resolver.",
      duration: 12_000,
      action: { label: "Ver pendências", onClick: () => void navigate({ to: "/pendencias" }) },
    });
  }, [userId, pronto, total, navigate]);
}
