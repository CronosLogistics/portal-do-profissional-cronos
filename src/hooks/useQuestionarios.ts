import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { contarQuestionariosPendentes } from "@/lib/questionarios.functions";

export const questionariosPendentesKey = ["questionarios", "pendentes"] as const;

/** Contador de pesquisas não respondidas para o badge do menu. */
export function useQuestionariosPendentes(userId: string | undefined) {
  const contar = useServerFn(contarQuestionariosPendentes);
  return useQuery({
    queryKey: [...questionariosPendentesKey, userId],
    queryFn: () => contar(),
    enabled: !!userId,
    refetchInterval: 60_000,
    staleTime: 15_000,
  });
}
