import { criarIdCliente } from "@/lib/client-id";
import { useRef, useState, type RefObject } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowDown, ArrowUp, Eye, ImagePlus, Pencil, Plus, Save, Send, Trash2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter } from "@/components/ui/alert-dialog";
import { avisosKey, perfisRemetentes } from "@/lib/avisos-client";
import { enviarImagemInsider, insiderKey, listarEdicoesInsider, publicarEdicao, type EdicaoInsider } from "@/lib/insider-client";
import { prepararEdicaoInsider, salvarEdicaoInsider } from "@/lib/insider.functions";
import { mesBrasilia, nomeMes, type ConteudoInsider, type PessoaInsider } from "@/lib/insider.rules";
import { InsiderJornal } from "./InsiderJornal";

export function InsiderEditor() {
  const qc = useQueryClient();
  const lista = useQuery({ queryKey: insiderKey, queryFn: listarEdicoesInsider, retry: false });
  const [mes, setMes] = useState(() => mesBrasilia());
  const [edicao, setEdicao] = useState<EdicaoInsider | null>(null);
  const preparar = useServerFn(prepararEdicaoInsider);
  const gerar = useMutation({ mutationFn: () => preparar({ data: { mes } }), onSuccess: async () => { await qc.invalidateQueries({ queryKey: insiderKey }); toast.success("Edição preparada."); }, onError: (e: Error) => toast.error(e.message) });
  return <section className="mt-5">
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-bold">Edições do Cronos Insider</h2><div className="flex items-center gap-2"><Input type="month" aria-label="Mês da edição" value={mes} onChange={e => setMes(e.target.value)} className="w-44" /><Button disabled={gerar.isPending || !mes} onClick={() => gerar.mutate()}><Plus />{gerar.isPending ? "Preparando…" : "Preparar edição"}</Button></div></div>
    {lista.isPending && <p className="text-muted-foreground">Carregando edições…</p>}
    {lista.error && <p role="alert" className="text-destructive">{lista.error.message}</p>}
    {lista.data?.length === 0 && <p className="border-y py-10 text-center text-muted-foreground">Nenhuma edição preparada.</p>}
    <div className="grid gap-3">{lista.data?.map(e => <article key={e.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-card p-4"><div className="min-w-0"><span className="text-xs font-bold uppercase text-accent">{e.aviso_id ? "Publicada" : "Rascunho"}</span><h3 className="break-words font-bold">{e.titulo}</h3><p className="text-xs text-muted-foreground">{e.conteudo.aniversariantes.length} aniversariantes · {e.conteudo.tempoCasa.length} aniversários de empresa</p></div><Button variant="outline" onClick={() => setEdicao(e)}><Pencil />{e.aviso_id ? "Corrigir edição" : "Editar edição"}</Button></article>)}</div>
    {edicao && <EditarEdicao key={edicao.id} edicao={edicao} onClose={() => setEdicao(null)} />}
  </section>;
}

/** Cancelling the native file picker restores window focus; Radix Dialog treats that as dismiss and runs the close animation while `open` stays true — blank modal. */
function marcarSeletorArquivo(ref: RefObject<boolean>) {
  ref.current = true;
  const liberar = () => {
    // Keep the guard until after Radix processes focus/pointer-outside from the cancelled picker.
    window.setTimeout(() => { ref.current = false; }, 300);
    window.removeEventListener("focus", liberar);
  };
  window.addEventListener("focus", liberar);
}

function ImagemCampo({ id, value, onChange, label, seletorAberto }: { id: string; value: string; onChange: (v: string) => void; label: string; seletorAberto: RefObject<boolean> }) {
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  return <div className="flex items-center gap-2">
    <Button type="button" variant="ghost" className="h-auto px-0 text-sm text-accent hover:bg-transparent hover:text-accent" disabled={busy} onClick={() => { marcarSeletorArquivo(seletorAberto); inputRef.current?.click(); }}>
      <ImagePlus className="size-4" />{busy ? "Enviando…" : value ? "Trocar imagem" : label}
    </Button>
    <input ref={inputRef} className="sr-only" type="file" aria-label={label} accept="image/jpeg,image/png,image/webp" disabled={busy} tabIndex={-1} onChange={async e => {
      const input = e.currentTarget;
      const file = input.files?.[0];
      if (!file) return;
      setBusy(true);
      try { onChange(await enviarImagemInsider(id, file)); }
      catch (err) { toast.error(err instanceof Error ? err.message : "Falha ao enviar imagem."); }
      finally { setBusy(false); input.value = ""; }
    }} />
    {value && <Button size="icon" variant="ghost" title="Remover imagem" aria-label="Remover imagem" onClick={() => onChange("")}><Trash2 /></Button>}
  </div>;
}
function PessoasEditor({ pessoas, id, onChange, seletorAberto }: { pessoas: PessoaInsider[]; id: string; onChange: (v: PessoaInsider[]) => void; seletorAberto: RefObject<boolean> }) {
  return <div className="grid gap-2 sm:grid-cols-2">{pessoas.map((p, i) => <article key={p.id} className="rounded-md border p-3"><p className="break-words font-bold">{p.nome}</p><p className="mb-2 text-xs text-muted-foreground">Dia {p.dia}{p.anos ? ` · ${p.anos} ${p.anos === 1 ? "ano" : "anos"}` : ""} · {[p.departamento, p.escritorio].filter(Boolean).join(" · ")}</p><ImagemCampo id={id} value={p.foto} label={`Foto de ${p.nome}`} seletorAberto={seletorAberto} onChange={foto => onChange(pessoas.map((x, n) => n === i ? { ...x, foto } : x))} /></article>)}</div>;
}
function EditarEdicao({ edicao, onClose }: { edicao: EdicaoInsider; onClose: () => void }) {
  const qc = useQueryClient();
  const seletorAberto = useRef(false);
  const [atual, setAtual] = useState(edicao), [titulo, setTitulo] = useState(edicao.titulo), [conteudo, setConteudo] = useState(edicao.conteudo), [preview, setPreview] = useState(false), [confirmar, setConfirmar] = useState(false), [perfil, setPerfil] = useState("");
  const remetentes = useQuery({ queryKey: [...avisosKey, "remetentes"], queryFn: perfisRemetentes });
  const salvarFn = useServerFn(salvarEdicaoInsider);
  const salvar = useMutation({ mutationFn: async () => { const r = await salvarFn({ data: { id: atual.id, revisao: atual.revisao, titulo, conteudo } }); const next = { ...atual, titulo, conteudo, revisao: r.revisao }; setAtual(next); await qc.invalidateQueries({ queryKey: insiderKey }); await qc.invalidateQueries({ queryKey: avisosKey }); return next; }, onError: (e: Error) => toast.error(e.message) });
  const publicar = useMutation({ mutationFn: async () => { const next = await salvar.mutateAsync(); await publicarEdicao(next, perfil); }, onSuccess: async () => { await qc.invalidateQueries({ queryKey: insiderKey }); await qc.invalidateQueries({ queryKey: avisosKey }); toast.success("Cronos Insider publicado."); onClose(); }, onError: (e: Error) => toast.error(e.message) });
  const mudar = <K extends keyof ConteudoInsider>(key: K, value: ConteudoInsider[K]) => setConteudo(c => ({ ...c, [key]: value }));
  const textos: [keyof Pick<ConteudoInsider, "abertura" | "antesEventos" | "antesAniversarios" | "antesTempoCasa" | "encerramento">, string][] = [["abertura", "Mensagem de abertura"], ["antesEventos", "Texto dos destaques do mês"], ["antesAniversarios", "Mensagem para aniversariantes"], ["antesTempoCasa", "Mensagem de tempo de empresa"], ["encerramento", "Encerramento"]];
  function mover(index: number, delta: number) { const eventos = [...conteudo.eventos]; const outro = eventos[index + delta], item = eventos[index]; if (!outro || !item) return; eventos[index] = outro; eventos[index + delta] = item; mudar("eventos", eventos); }
  const bloquearFora = (e: Event) => { if (seletorAberto.current) e.preventDefault(); };
  return <Dialog open onOpenChange={o => { if (!o && !seletorAberto.current) onClose(); }}><DialogContent className="flex max-h-[92dvh] w-[calc(100%-2rem)] max-w-5xl flex-col overflow-hidden p-4 sm:p-6" onPointerDownOutside={bloquearFora} onInteractOutside={bloquearFora} onFocusOutside={bloquearFora}><DialogHeader><DialogTitle>Cronos Insider - {nomeMes(edicao.mes_ano)}</DialogTitle><DialogDescription>{atual.aviso_id ? "Correção da edição publicada" : "Rascunho"}</DialogDescription></DialogHeader>
    <div className="flex flex-wrap gap-2 border-b pb-3"><Button variant="outline" onClick={() => setPreview(!preview)}>{preview ? <ArrowLeft /> : <Eye />}{preview ? "Voltar à edição" : "Pré-visualizar"}</Button><Button disabled={salvar.isPending || publicar.isPending} onClick={() => salvar.mutate(undefined, { onSuccess: () => toast.success("Edição salva.") })}><Save />{salvar.isPending ? "Salvando…" : "Salvar"}</Button>{!atual.aviso_id && <Button variant="outline" disabled={salvar.isPending || publicar.isPending || !remetentes.data?.length} onClick={() => setConfirmar(true)}><Send />Publicar</Button>}</div>
    <div className="min-h-0 overflow-y-auto">{preview ? <InsiderJornal conteudo={conteudo} mesAno={edicao.mes_ano} /> : <div className="space-y-6 py-3">
      <div className="space-y-2"><Label htmlFor="insider-titulo">Título</Label><Input id="insider-titulo" value={titulo} maxLength={120} onChange={e => setTitulo(e.target.value)} /></div>
      {textos.slice(0, 2).map(([key, label]) => <div key={key} className="space-y-2"><Label htmlFor={`insider-${key}`}>{label}</Label><Textarea id={`insider-${key}`} rows={key === "abertura" ? 6 : 3} value={conteudo[key]} onChange={e => mudar(key, e.target.value)} maxLength={key === "abertura" ? 20000 : 10000} /></div>)}
      <ImagemCampo id={atual.id} value={conteudo.bannerMes} label="Substituir banner do mês" seletorAberto={seletorAberto} onChange={v => mudar("bannerMes", v)} />
      <section className="space-y-3 border-t pt-5"><div className="flex items-center justify-between"><h3 className="font-bold">Eventos do mês</h3><Button size="sm" variant="outline" disabled={conteudo.eventos.length >= 30} onClick={() => mudar("eventos", [...conteudo.eventos, { id: criarIdCliente(), titulo: "", data: "", descricao: "", imagem: "" }])}><Plus />Evento</Button></div>{conteudo.eventos.map((e, i) => <article key={e.id} className="space-y-3 rounded-md border p-4"><div className="flex justify-between"><h4 className="font-bold">Evento {i + 1}</h4><div className="flex"><Button size="icon" variant="ghost" aria-label="Mover evento para cima" title="Mover para cima" disabled={i === 0} onClick={() => mover(i, -1)}><ArrowUp /></Button><Button size="icon" variant="ghost" aria-label="Mover evento para baixo" title="Mover para baixo" disabled={i === conteudo.eventos.length - 1} onClick={() => mover(i, 1)}><ArrowDown /></Button><Button size="icon" variant="ghost" aria-label="Remover evento" title="Remover evento" onClick={() => mudar("eventos", conteudo.eventos.filter(x => x.id !== e.id))}><Trash2 /></Button></div></div>{(["titulo", "data", "descricao"] as const).map(key => <div key={key} className="space-y-1"><Label htmlFor={`${e.id}-${key}`}>{key === "titulo" ? "Título do evento" : key === "data" ? "Data do evento" : "Descrição do evento"}</Label><Textarea id={`${e.id}-${key}`} rows={key === "descricao" ? 3 : 1} maxLength={key === "descricao" ? 5000 : key === "titulo" ? 200 : 100} value={e[key]} onChange={ev => mudar("eventos", conteudo.eventos.map(x => x.id === e.id ? { ...x, [key]: ev.target.value } : x))} /></div>)}<ImagemCampo id={atual.id} value={e.imagem} label={`Imagem do evento ${i + 1}`} seletorAberto={seletorAberto} onChange={imagem => mudar("eventos", conteudo.eventos.map(x => x.id === e.id ? { ...x, imagem } : x))} /></article>)}</section>
      {textos.slice(2, 4).map(([key, label]) => <section key={key} className="space-y-3 border-t pt-5"><h3 className="font-bold">{key === "antesAniversarios" ? "Aniversariantes" : "Tempo de empresa"}</h3><Label htmlFor={`insider-${key}`}>{label}</Label><Textarea id={`insider-${key}`} rows={3} maxLength={10000} value={conteudo[key]} onChange={e => mudar(key, e.target.value)} /><PessoasEditor id={atual.id} pessoas={key === "antesAniversarios" ? conteudo.aniversariantes : conteudo.tempoCasa} seletorAberto={seletorAberto} onChange={v => mudar(key === "antesAniversarios" ? "aniversariantes" : "tempoCasa", v)} /></section>)}
      <div className="space-y-2 border-t pt-5"><Label htmlFor="insider-encerramento">Encerramento</Label><Textarea id="insider-encerramento" rows={3} maxLength={10000} value={conteudo.encerramento} onChange={e => mudar("encerramento", e.target.value)} /></div>
    </div>}</div>
    <AlertDialog open={confirmar} onOpenChange={setConfirmar}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Publicar Cronos Insider?</AlertDialogTitle><AlertDialogDescription>A edição ficará disponível para os profissionais no portal.</AlertDialogDescription></AlertDialogHeader><Select value={perfil} onValueChange={setPerfil}><SelectTrigger aria-label="Perfil remetente"><SelectValue placeholder="Escolha o perfil remetente" /></SelectTrigger><SelectContent>{remetentes.data?.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}</SelectContent></Select><AlertDialogFooter><AlertDialogCancel>Voltar</AlertDialogCancel><AlertDialogAction disabled={!perfil || publicar.isPending} onClick={() => publicar.mutate()}>Confirmar publicação</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </DialogContent></Dialog>;
}
