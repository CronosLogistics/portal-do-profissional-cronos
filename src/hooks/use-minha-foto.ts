import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { minhaFotoMicrosoft } from "@/lib/foto.functions";

/** Foto Microsoft do usuário logado, guardada por 24h na sessão. */
export function useMinhaFoto() {
  const buscar = useServerFn(minhaFotoMicrosoft);
  return useQuery({ queryKey: ["minha-foto"], queryFn: () => buscar(), staleTime: 24 * 3600_000, gcTime: 24 * 3600_000, retry: false }).data ?? null;
}
