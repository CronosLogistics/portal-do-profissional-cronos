import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Plus, ClipboardList, BarChart3, LockKeyhole, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useCurrentUser } from "@/hooks/useAuth";
import { listarQuestionarios } from "@/lib/questionarios.functions";
import { questionarioExpirado, formatarPrazoQuestionario, type Questionario } from "@/lib/questionarios.rules";
import { temRascunhoRespostaLocal } from "@/lib/questionarios-resposta-local";
import { textoPlano } from "@/lib/rich-text";
import { QuestionarioModal } from "@/components/portal/QuestionarioModal";
import { QuestionarioResultados } from "@/components/portal/QuestionarioResultados";
import { QuestionarioExcluir } from "@/components/portal/QuestionarioExcluir";
import { RascunhosQuestionario } from "@/components/portal/RascunhosQuestionario";
import type { RascunhoQuestionario } from "@/lib/questionarios-importacao.rules";

export const questionariosOptions = queryOptions({ queryKey: ["questionarios", "lista"], queryFn: () => listarQuestionarios(), refetchInterval: 30_000 });
export const Route = createFileRoute("/_authenticated/formularios-internos")({
  validateSearch: (s: Record<string, unknown>): { pesquisa?: string } => (typeof s["pesquisa"] === "string" ? { pesquisa: s["pesquisa"] } : {}),
  loader: ({ context }) => context.queryClient.ensureQueryData(questionariosOptions),
  head: () => ({ meta: [{ title: "Pesquisas | Portal do Profissional Cronos" }, { name: "description", content: "Questionários internos e respostas dos profissionais da Cronos Logistics." }, { property: "og:title", content: "Pesquisas | Portal do Profissional Cronos" }, { property: "og:description", content: "Consulte os questionários pendentes no Portal do Profissional." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: FormulariosInternos,
});
function FormulariosInternos() {
  const { data } = useSuspenseQuery(questionariosOptions);
  const { pesquisa } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const me = useCurrentUser();
  const pode = Boolean(me.data?.can("formularios.gerenciar"));
  const [modal, setModal] = useState<{ questionario?: Questionario; edicao?: boolean; rascunho?: RascunhoQuestionario } | null>(null);
  const [resultado, setResultado] = useState<Questionario | null>(null);
  const [exclusao, setExclusao] = useState<Questionario | null>(null);
  const [agora, setAgora] = useState(() => new Date());
  useEffect(() => { const timer = window.setInterval(() => setAgora(new Date()), 1000); return () => window.clearInterval(timer); }, []);
  const pendentes = data.filter(q => !q.respondido && !q.excluindo && !questionarioExpirado(q, agora));
  const respondidos = data.filter(q => q.respondido && !q.excluindo);

  useEffect(() => {
    if (!pesquisa || modal) return;
    const alvo = data.find(q => q.id === pesquisa && !q.respondido && !q.excluindo && !questionarioExpirado(q));
    if (!alvo) {
      if (data.some(q => q.id === pesquisa)) void navigate({ search: {}, replace: true });
      return;
    }
    setModal({ questionario: alvo });
  }, [pesquisa, data, modal, navigate]);

  const fecharModal = () => {
    setModal(null);
    if (pesquisa) void navigate({ search: {}, replace: true });
  };

  const lista = (itens: Questionario[], gestao = false) => itens.length ? <div className="divide-y border-y">{itens.map(q => {
    const emAndamento = !gestao && temRascunhoRespostaLocal(me.data?.id, q.id, q.perguntas);
    return <article key={q.id} className="flex flex-wrap items-center justify-between gap-4 py-5"><div className="min-w-0 flex-1"><h2 className="break-words font-bold text-primary">{q.titulo}</h2>{textoPlano(q.descricao) && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{textoPlano(q.descricao)}</p>}<p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">{q.anonimo && <LockKeyhole className="size-3" />}{q.anonimo ? "Anônimo" : "Identificado"} · {q.perguntas.filter(p => p.tipo !== "bloco").length} {q.perguntas.filter(p => p.tipo !== "bloco").length === 1 ? "pergunta" : "perguntas"}{emAndamento ? " · Em andamento neste navegador" : ""}</p>{q.expira_em && <p className="mt-1 text-xs text-muted-foreground">{questionarioExpirado(q, agora) ? "Encerrado" : "Respostas"} até {formatarPrazoQuestionario(q.expira_em)} · 23:59 (Brasília)</p>}</div>{gestao ? <div className="flex flex-wrap gap-2"><Button disabled={q.excluindo} variant="outline" onClick={() => setModal({ questionario: q, edicao: true })}><Pencil />Editar</Button><Button disabled={q.excluindo} variant="outline" onClick={() => setResultado(q)}><BarChart3 />Resultados</Button><Button variant="ghost" size="icon" title={q.excluindo ? "Tentar excluir novamente" : "Excluir formulário"} aria-label={q.excluindo ? "Tentar excluir novamente" : `Excluir ${q.titulo}`} onClick={() => setExclusao(q)}><Trash2 className="text-destructive" /></Button>{q.excluindo && <p role="status" className="w-full text-sm text-destructive">Exclusão pendente - tente novamente.</p>}</div> : !q.respondido && !questionarioExpirado(q, agora) ? <Button onClick={() => setModal({ questionario: q })}><ClipboardList />{emAndamento ? "Continuar" : "Responder"}</Button> : <span className="text-sm text-muted-foreground">Respondido</span>}</article>;
  })}</div> : <p role="status" className="py-10 text-center text-muted-foreground">{gestao ? "Nenhum formulário criado." : itens === pendentes ? "Você não tem formulários pendentes." : "Nenhum formulário respondido."}</p>;
  return <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-8"><header className="mb-6"><h1 className="text-3xl font-bold text-foreground">Pesquisas</h1></header><Tabs defaultValue="pendentes"><TabsList className="mb-6 flex h-auto w-fit flex-wrap"><TabsTrigger value="pendentes">Pendentes ({pendentes.length})</TabsTrigger><TabsTrigger value="respondidos">Respondidos</TabsTrigger>{pode && <TabsTrigger value="gestao">Gerenciar formulários</TabsTrigger>}</TabsList><TabsContent value="pendentes">{lista(pendentes)}</TabsContent><TabsContent value="respondidos">{lista(respondidos)}</TabsContent>{pode && <TabsContent value="gestao"><div className="mb-4 flex justify-end"><Button onClick={() => setModal({})}><Plus />Novo formulário</Button></div><RascunhosQuestionario onAbrir={r => setModal({ rascunho: r })} />{lista(data, true)}</TabsContent>}</Tabs>{modal && <QuestionarioModal key={modal.rascunho?.id ?? modal.questionario?.id ?? "novo"} {...modal} onClose={fecharModal} />}{exclusao && <QuestionarioExcluir questionario={exclusao} onClose={() => setExclusao(null)} />}{resultado && <QuestionarioResultados questionario={resultado} onClose={() => setResultado(null)} />}</main>;
}
