import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Plus, ClipboardList, BarChart3, LockKeyhole, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useCurrentUser } from "@/hooks/useAuth";
import { listarQuestionarios } from "@/lib/questionarios.functions";
import type { Questionario } from "@/lib/questionarios.rules";
import { textoPlano } from "@/lib/rich-text";
import { QuestionarioModal } from "@/components/portal/QuestionarioModal";
import { QuestionarioResultados } from "@/components/portal/QuestionarioResultados";
import { QuestionarioExcluir } from "@/components/portal/QuestionarioExcluir";

export const questionariosOptions = queryOptions({ queryKey: ["questionarios", "lista"], queryFn: () => listarQuestionarios() });
export const Route = createFileRoute("/_authenticated/formularios-internos")({
  loader: ({ context }) => context.queryClient.ensureQueryData(questionariosOptions),
  head: () => ({ meta: [{ title: "Pesquisas | Portal do Profissional Cronos" }, { name: "description", content: "Questionários internos e respostas dos profissionais da Cronos Logistics." }, { property: "og:title", content: "Pesquisas | Portal do Profissional Cronos" }, { property: "og:description", content: "Consulte os questionários pendentes no Portal do Profissional." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: FormulariosInternos,
});
function FormulariosInternos() {
  const { data } = useSuspenseQuery(questionariosOptions); const me = useCurrentUser(); const pode = Boolean(me.data?.can("formularios.gerenciar"));
  const [modal, setModal] = useState<{ questionario?: Questionario; edicao?: boolean } | null>(null), [resultado, setResultado] = useState<Questionario | null>(null);
  const [exclusao, setExclusao] = useState<Questionario | null>(null);
  const pendentes = data.filter(q => !q.respondido && !q.excluindo), respondidos = data.filter(q => q.respondido && !q.excluindo);
  const lista = (itens: Questionario[], gestao = false) => itens.length ? <div className="divide-y border-y">{itens.map(q => <article key={q.id} className="flex flex-wrap items-center justify-between gap-4 py-5"><div className="min-w-0 flex-1"><h2 className="break-words font-bold text-primary">{q.titulo}</h2>{textoPlano(q.descricao) && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{textoPlano(q.descricao)}</p>}<p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">{q.anonimo && <LockKeyhole className="size-3" />}{q.anonimo ? "Anônimo" : "Identificado"} · {q.perguntas.filter(p => p.tipo !== "bloco").length} {q.perguntas.filter(p => p.tipo !== "bloco").length === 1 ? "pergunta" : "perguntas"}</p></div>{gestao ? <div className="flex flex-wrap gap-2"><Button disabled={q.excluindo} variant="outline" onClick={() => setModal({ questionario: q, edicao: true })}><Pencil />Editar</Button><Button disabled={q.excluindo} variant="outline" onClick={() => setResultado(q)}><BarChart3 />Resultados</Button><Button variant="ghost" size="icon" title={q.excluindo ? "Tentar excluir novamente" : "Excluir formulário"} aria-label={q.excluindo ? "Tentar excluir novamente" : `Excluir ${q.titulo}`} onClick={() => setExclusao(q)}><Trash2 className="text-destructive" /></Button>{q.excluindo && <p role="status" className="w-full text-sm text-destructive">Exclusão pendente - tente novamente.</p>}</div> : !q.respondido ? <Button onClick={() => setModal({ questionario: q })}><ClipboardList />Responder</Button> : <span className="text-sm text-muted-foreground">Respondido</span>}</article>)}</div> : <p role="status" className="py-10 text-center text-muted-foreground">{gestao ? "Nenhum formulário criado." : itens === pendentes ? "Você não tem formulários pendentes." : "Nenhum formulário respondido."}</p>;
  return <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-8"><header className="mb-6"><h1 className="text-3xl font-bold text-foreground">Pesquisas</h1></header><Tabs defaultValue="pendentes"><TabsList className="mb-6 flex h-auto w-fit flex-wrap"><TabsTrigger value="pendentes">Pendentes ({pendentes.length})</TabsTrigger><TabsTrigger value="respondidos">Respondidos</TabsTrigger>{pode && <TabsTrigger value="gestao">Gerenciar formulários</TabsTrigger>}</TabsList><TabsContent value="pendentes">{lista(pendentes)}</TabsContent><TabsContent value="respondidos">{lista(respondidos)}</TabsContent>{pode && <TabsContent value="gestao"><div className="mb-4 flex justify-end"><Button onClick={() => setModal({})}><Plus />Novo formulário</Button></div>{lista(data, true)}</TabsContent>}</Tabs>{modal && <QuestionarioModal {...modal} onClose={() => setModal(null)} />}{exclusao && <QuestionarioExcluir questionario={exclusao} onClose={() => setExclusao(null)} />}{resultado && <QuestionarioResultados questionario={resultado} onClose={() => setResultado(null)} />}</main>;
}