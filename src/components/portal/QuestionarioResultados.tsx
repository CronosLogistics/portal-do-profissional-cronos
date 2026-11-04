import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { consultarGestaoQuestionario, reenviarQuestionarioSharePoint } from "@/lib/questionarios.functions";
import type { Questionario } from "@/lib/questionarios.rules";

export function QuestionarioResultados({ questionario, onClose }: { questionario: Questionario; onClose: () => void }) {
  const consultar = useServerFn(consultarGestaoQuestionario), reenviar = useServerFn(reenviarQuestionarioSharePoint), qc = useQueryClient();
  const q = useQuery({ queryKey: ["questionarios", "gestao", questionario.id], queryFn: () => consultar({ data: { id: questionario.id } }) });
  const envio = useMutation({ mutationFn: () => reenviar({ data: { id: questionario.id } }), onSuccess: async () => { await qc.invalidateQueries({ queryKey: ["questionarios"] }); toast.success("Registros enviados ao SharePoint."); }, onError: e => toast.error(e.message) });
  return <Dialog open onOpenChange={open => { if (!open) onClose(); }}><DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>{questionario.titulo}</DialogTitle><DialogDescription>{questionario.anonimo ? "Resultados anônimos" : "Resultados identificados"}</DialogDescription></DialogHeader>
    {q.isPending && <p className="text-muted-foreground">Carregando resultados…</p>}{q.error && <p role="alert" className="text-destructive">{q.error.message}</p>}
    {q.data && <><div className="grid grid-cols-3 gap-3 border-y py-4">{[["Profissionais", q.data.total], ["Respondidos", q.data.respondidos], ["Pendentes", q.data.pendentes]].map(([label, value]) => <div key={label}><p className="text-2xl font-bold text-primary">{value}</p><p className="text-xs text-muted-foreground">{label}</p></div>)}</div>
      {q.data.sharepointPendente && <div className="flex flex-wrap items-center justify-between gap-3 text-sm"><span className="text-muted-foreground">Há registros pendentes de envio ao SharePoint.</span><Button variant="outline" size="sm" disabled={envio.isPending} onClick={() => envio.mutate()}><RefreshCw />{envio.isPending ? "Enviando…" : "Reenviar registros"}</Button></div>}
      {!questionario.anonimo && q.data.pessoasPendentes && <section><h3 className="mb-2 font-bold">Quem falta responder</h3>{q.data.pessoasPendentes.length ? <ul className="divide-y">{q.data.pessoasPendentes.map(p => <li key={p.email} className="py-2 text-sm"><p>{p.nome}</p><p className="text-xs text-muted-foreground">{p.email}</p></li>)}</ul> : <p className="text-sm text-muted-foreground">Todos responderam.</p>}</section>}
      <section><h3 className="mb-3 font-bold">Respostas</h3>{!q.data.respostas.length && <p className="text-sm text-muted-foreground">Nenhuma resposta recebida.</p>}<div className="space-y-4">{q.data.respostas.map((r, i) => <article key={i} className="rounded-lg border p-4"><h4 className="mb-3 text-sm font-bold text-primary">{questionario.anonimo ? `Resposta ${i + 1}` : r.nome || r.email}</h4>{(r.perguntas ?? questionario.perguntas).map((p, n) => <div key={n} className="mb-3 last:mb-0"><p className="text-sm font-semibold">{n + 1}. {p}</p><p className="whitespace-pre-wrap break-words text-sm text-muted-foreground">{r.respostas[n]}</p></div>)}</article>)}</div></section>
    </>}
  </DialogContent></Dialog>;
}