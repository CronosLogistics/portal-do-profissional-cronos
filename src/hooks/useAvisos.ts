import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { avisosKey, contarNaoLidos } from "@/lib/avisos-client";
import { tituloComContador } from "@/lib/avisos-rules";

export const naoLidosKey = [...avisosKey, "nao-lidos"] as const;

/** Contador de não lidos: confere a cada 60 s (avisos agendados não geram evento). */
export function useNaoLidos() {
  return useQuery({ queryKey: naoLidosKey, queryFn: contarNaoLidos, refetchInterval: 60_000, staleTime: 15_000 });
}

/** Tempo real, conferência a cada troca de página e contador no título da aba. Usar uma vez, no PortalShell. */
export function useAvisosAoVivo(meId: string | undefined, naoLidos: number) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => {
    void qc.invalidateQueries({ queryKey: naoLidosKey });
  }, [pathname, qc]);

  useEffect(() => {
    if (!meId) return;
    const channel = supabase
      .channel(`avisos-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "avisos" }, async (payload) => {
        void qc.invalidateQueries({ queryKey: avisosKey });
        if (payload.eventType !== "INSERT") return;
        const novo = payload.new as { id: string; titulo: string; perfil_id: string; autor_id: string; publicar_em: string };
        if (novo.autor_id === meId || new Date(novo.publicar_em) > new Date()) return;
        const { data } = await supabase.from("perfis").select("nome").eq("id", novo.perfil_id).maybeSingle();
        toast(novo.titulo, {
          description: `Novo aviso de ${data?.nome ?? "Cronos"}`,
          duration: 10_000,
          action: { label: "Abrir", onClick: () => void navigate({ to: "/avisos", search: { aviso: novo.id } }) },
        });
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [meId, qc, navigate]);

  useEffect(() => {
    const aplicar = () => {
      const t = tituloComContador(document.title, naoLidos);
      if (t !== document.title) document.title = t;
    };
    aplicar();
    const el = document.querySelector("title");
    if (!el) return;
    const obs = new MutationObserver(aplicar);
    obs.observe(el, { childList: true, characterData: true, subtree: true });
    return () => {
      obs.disconnect();
      document.title = tituloComContador(document.title, 0);
    };
  }, [naoLidos, pathname]);
}
