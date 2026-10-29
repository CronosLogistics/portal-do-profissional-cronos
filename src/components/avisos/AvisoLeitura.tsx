import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageCircle, SmilePlus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { useCurrentUser } from "@/hooks/useAuth";
import {
  apagarComentarioCompilado,
  avisosKey,
  comentarCompilado,
  EMOJIS_COMPILADO,
  htmlCompilado,
  interacoesCompilado,
  marcarLido,
  reagirCompilado,
  type ComentarioCompilado,
  type EmojiCompilado,
} from "@/lib/avisos-client";
import { formatarDataBrasilia } from "@/lib/avisos-rules";

export type AvisoExibido = {
  id?: string;
  titulo: string;
  mensagem: string;
  perfil_nome: string;
  publicar_em: string;
  editado_em?: string | null;
  lido?: boolean;
  tipo?: string;
};

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
        <DialogTitle className="text-xl pr-16">{aviso.titulo}</DialogTitle>
        <DialogDescription>
          {formatarDataBrasilia(aviso.publicar_em)}
          {aviso.editado_em ? " · editado" : ""}
        </DialogDescription>
      </DialogHeader>
      {aviso.tipo === "compilado" && aviso.id ? <CompiladoHtml avisoId={aviso.id} fallback={aviso.mensagem} /> : <AvisoHtml html={aviso.mensagem} />}
      {aviso.tipo === "compilado" && aviso.id ? <CompiladoInteracoes avisoId={aviso.id} /> : null}
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

const interacoesKey = (avisoId: string) => [...avisosKey, "compilado-interacoes", avisoId] as const;

/** Atalho no topo (ao lado do X): reagir sem rolar; comentar leva ao final. */
function CompiladoAtalhos({ avisoId }: { avisoId: string }) {
  const qc = useQueryClient();
  const interacoes = useQuery({ queryKey: interacoesKey(avisoId), queryFn: () => interacoesCompilado(avisoId) });
  const reagir = useMutation({
    mutationFn: (emoji: EmojiCompilado) => reagirCompilado(avisoId, emoji, interacoes.data?.minha_reacao ?? null),
    onSuccess: () => qc.invalidateQueries({ queryKey: interacoesKey(avisoId) }),
    onError: () => toast.error("Não foi possível registrar a reação."),
  });

  const irComentar = () => {
    const el = document.getElementById("compilado-comentarios");
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
    setTimeout(() => document.getElementById("compilado-campo-comentario")?.focus({ preventScroll: true }), 350);
  };

  return (
    <div className="compilado-atalhos">
      <Popover>
        <PopoverTrigger asChild>
          <Button type="button" size="icon" variant="ghost" className="size-8" aria-label="Reagir">
            <SmilePlus className="size-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-auto p-2">
          <div className="flex gap-1">
            {EMOJIS_COMPILADO.map((e) => (
              <button
                key={e}
                type="button"
                className={`compilado-emoji-btn${interacoes.data?.minha_reacao === e ? " is-ativo" : ""}`}
                aria-label={`Reagir com ${e}`}
                disabled={reagir.isPending}
                onClick={() => reagir.mutate(e)}
              >
                {e}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
      <Button type="button" size="icon" variant="ghost" className="size-8" aria-label="Ir para comentários" onClick={irComentar}>
        <MessageCircle className="size-4" />
      </Button>
    </div>
  );
}

function CompiladoInteracoes({ avisoId }: { avisoId: string }) {
  const me = useCurrentUser();
  const qc = useQueryClient();
  const [texto, setTexto] = useState("");
  const interacoes = useQuery({ queryKey: interacoesKey(avisoId), queryFn: () => interacoesCompilado(avisoId) });
  const podeRemover = Boolean(me.data?.can("conteudo.editar"));

  const enviar = useMutation({
    mutationFn: () => comentarCompilado(avisoId, texto),
    onSuccess: () => {
      setTexto("");
      qc.invalidateQueries({ queryKey: interacoesKey(avisoId) });
    },
    onError: () => toast.error("Não foi possível comentar."),
  });

  const reagir = useMutation({
    mutationFn: (emoji: EmojiCompilado) => reagirCompilado(avisoId, emoji, interacoes.data?.minha_reacao ?? null),
    onSuccess: () => qc.invalidateQueries({ queryKey: interacoesKey(avisoId) }),
    onError: () => toast.error("Não foi possível registrar a reação."),
  });

  const comentarios = interacoes.data?.comentarios ?? [];
  const reacoes = interacoes.data?.reacoes ?? [];

  return (
    <section id="compilado-comentarios" className="compilado-interacoes">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {EMOJIS_COMPILADO.map((e) => {
          const r = reacoes.find((x) => x.emoji === e);
          return (
            <button
              key={e}
              type="button"
              className={`compilado-reacao-chip${r?.meu ? " is-ativo" : ""}`}
              aria-pressed={Boolean(r?.meu)}
              disabled={reagir.isPending}
              onClick={() => reagir.mutate(e)}
            >
              <span>{e}</span>
              {r ? <span className="text-xs font-semibold">{r.total}</span> : null}
            </button>
          );
        })}
      </div>
      <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-primary">
        <MessageCircle className="size-4" />
        {comentarios.length} {comentarios.length === 1 ? "comentário" : "comentários"}
      </p>
      <ul className="space-y-3">
        {comentarios.map((c) => (
          <ComentarioCompiladoItem
            key={c.id}
            c={c}
            meu={c.usuario_id === me.data?.id}
            podeRemover={podeRemover}
            onMudou={() => qc.invalidateQueries({ queryKey: interacoesKey(avisoId) })}
          />
        ))}
      </ul>
      <form
        className="mt-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (texto.trim()) enviar.mutate();
        }}
      >
        <Textarea
          id="compilado-campo-comentario"
          rows={2}
          maxLength={1000}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Deixe um comentário sobre os elogios…"
          aria-label="Comentário"
        />
        <Button type="submit" disabled={!texto.trim() || enviar.isPending}>
          Comentar
        </Button>
      </form>
    </section>
  );
}

function ComentarioCompiladoItem({
  c,
  meu,
  podeRemover,
  onMudou,
}: {
  c: ComentarioCompilado;
  meu: boolean;
  podeRemover: boolean;
  onMudou: () => void;
}) {
  const apagar = async () => {
    try {
      await apagarComentarioCompilado(c.id);
      onMudou();
    } catch {
      toast.error("Não foi possível apagar.");
    }
  };
  return (
    <li className="rounded-md bg-muted/50 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-foreground">{c.nome}</p>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          {new Date(c.criado_em).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" })}
          {c.editado_em && " · editado"}
          {(meu || podeRemover) && (
            <Button size="icon" variant="ghost" className="size-7" aria-label="Apagar comentário" onClick={apagar}>
              <Trash2 />
            </Button>
          )}
        </div>
      </div>
      <p className="mt-1 whitespace-pre-line text-sm text-foreground">{c.texto}</p>
    </li>
  );
}

/** Abrir o aviso grava a leitura. */
export function AvisoLeitura({ aviso, onClose }: { aviso: AvisoExibido | null; onClose: () => void }) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!aviso?.id || aviso.lido) return;
    void marcarLido(aviso.id).then(() => qc.invalidateQueries({ queryKey: avisosKey }));
  }, [aviso?.id, aviso?.lido, qc]);
  const grande = leituraGrande(aviso);
  const compilado = aviso?.tipo === "compilado" && aviso.id;
  return (
    <Dialog open={Boolean(aviso)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className={grande ? "leitor-modal" : "max-h-[85dvh] max-w-2xl overflow-y-auto"}>
        {compilado ? <CompiladoAtalhos avisoId={aviso.id!} /> : null}
        {aviso && <AvisoCorpo aviso={aviso} />}
      </DialogContent>
    </Dialog>
  );
}

/** Insider e compilado abrem no modal central grande (B1), em formato de página de leitura. */
export function leituraGrande(aviso: AvisoExibido | null) {
  return aviso?.tipo === "insider" || aviso?.tipo === "compilado";
}
