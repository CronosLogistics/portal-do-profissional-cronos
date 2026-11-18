import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { fotoProfissional, minhaFotoMicrosoft } from "@/lib/foto.functions";

/** Foto Microsoft do usuário logado, guardada por 24h na sessão. */
export function useMinhaFoto() {
  const buscar = useServerFn(minhaFotoMicrosoft);
  return useQuery({ queryKey: ["minha-foto"], queryFn: () => buscar(), staleTime: 24 * 3600_000, gcTime: 24 * 3600_000, retry: false }).data ?? null;
}

/** Foto Microsoft de qualquer profissional ativo, guardada por 24h. */
export function useFotoProfissional(userId: string | null | undefined) {
  const buscar = useServerFn(fotoProfissional);
  return useQuery({
    queryKey: ["foto-profissional", userId],
    queryFn: () => buscar({ data: { userId: userId! } }),
    enabled: !!userId,
    staleTime: 24 * 3600_000, gcTime: 24 * 3600_000, retry: false,
  }).data ?? null;
}
