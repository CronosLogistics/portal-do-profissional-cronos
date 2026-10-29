import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { avisosKey, htmlCompilado, marcarLido } from "@/lib/avisos-client";
import { formatarDataBrasilia } from "@/lib/avisos-rules";

export type AvisoExibido = { id?: string; titulo: string; mensagem: string; perfil_nome: string; publicar_em: string; editado_em?: string | null; lido?: boolean; tipo?: string };

/** Mensagem já limpa pelo banco (só negrito, itálico, listas e links). */
export function AvisoHtml({ html }: { html: string }) {
  return (
    <div
      className="aviso-html"
      dangerouslySetInnerHTML={{ __html: html }}
      onClick={(e) => {
        const a = (e.target as HTMLElement).closest("a");
        if (a?.href) {
          e.preventDefault();
          window.open(a.href, "_blank", "noopener,noreferrer");
        }
      }}
    />
  );
}

export function AvisoCorpo({ aviso }: { aviso: AvisoExibido }) {
  return (
    <>
      <DialogHeader>
        <p className="text-xs font-bold uppercase tracking-wide text-accent">{aviso.perfil_nome}</p>
        <DialogTitle className="text-xl">{aviso.titulo}</DialogTitle>
        <DialogDescription>
          {formatarDataBrasilia(aviso.publicar_em)}
          {aviso.editado_em ? " · editado" : ""}
        </DialogDescription>
      </DialogHeader>
      {aviso.tipo === "compilado" && aviso.id ? <CompiladoHtml avisoId={aviso.id} fallback={aviso.mensagem} /> : <AvisoHtml html={aviso.mensagem} />}
    </>
  );
}

/** HTML do Power Automate exibido inteiro num quadro isolado (sem scripts), preservando tabelas e estilos. */
function CompiladoHtml({ avisoId, fallback }: { avisoId: string; fallback: string }) {
  const q = useQuery({ queryKey: [...avisosKey, "compilado-html", avisoId], queryFn: () => htmlCompilado(avisoId) });
  if (q.isLoading) return <p className="text-sm text-muted-foreground">Carregando…</p>;
  if (!q.data) return <AvisoHtml html={fallback} />;
  const doc = `<base target="_blank">${q.data}`;
  return <iframe title="Compilado de elogios" className="compilado-frame" sandbox="allow-popups allow-popups-to-escape-sandbox" srcDoc={doc} />;
}

/** Abrir o aviso grava a leitura. */
export function AvisoLeitura({ aviso, onClose }: { aviso: AvisoExibido | null; onClose: () => void }) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!aviso?.id || aviso.lido) return;
    void marcarLido(aviso.id).then(() => qc.invalidateQueries({ queryKey: avisosKey }));
  }, [aviso?.id, aviso?.lido, qc]);
  return (
    <Dialog open={Boolean(aviso)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className={leituraGrande(aviso) ? "leitor-modal" : "max-h-[85dvh] max-w-2xl overflow-y-auto"}>{aviso && <AvisoCorpo aviso={aviso} />}</DialogContent>
    </Dialog>
  );
}

/** Insider e compilado abrem no modal central grande (B1), em formato de página de leitura. */
export function leituraGrande(aviso: AvisoExibido | null) {
  return aviso?.tipo === "insider" || aviso?.tipo === "compilado";
}
