import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Trash2, Send, Save } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { criarQuestionario, editarQuestionario, responderQuestionario } from "@/lib/questionarios.functions";
import { novoQuestionarioSchema, type Questionario } from "@/lib/questionarios.rules";

export function QuestionarioModal({ questionario, edicao = false, onClose }: { questionario?: Questionario; edicao?: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const criar = useServerFn(criarQuestionario), responder = useServerFn(responderQuestionario), editar = useServerFn(editarQuestionario);
  const respondendo = Boolean(questionario && !edicao);
  const [titulo, setTitulo] = useState(edicao ? questionario?.titulo ?? "" : ""); const [descricao, setDescricao] = useState(edicao ? questionario?.descricao ?? "" : "");
  const [anonimo, setAnonimo] = useState(edicao ? questionario?.anonimo ?? false : false); const [perguntas, setPerguntas] = useState(edicao ? questionario?.perguntas ?? [""] : [""]);
  const [respostas, setRespostas] = useState(() => questionario?.perguntas.map(() => "") ?? []);
  const dados = { titulo, descricao, anonimo, perguntas };
  const valido = respondendo ? respostas.every(r => r.trim().length > 0) : novoQuestionarioSchema.safeParse(dados).success;
  const salvar = useMutation({
    mutationFn: () => questionario ? edicao ? editar({ data: { ...dados, id: questionario.id } }) : responder({ data: { id: questionario.id, respostas } }) : criar({ data: dados }),
    onSuccess: async result => { await qc.invalidateQueries({ queryKey: ["questionarios"] }); toast.success(edicao ? "Formulário atualizado." : respondendo ? "Resposta salva." : "Formulário criado."); if (!result.registrado) toast.warning("Salvo no portal; registro no SharePoint pendente. A gestão pode reenviar."); onClose(); },
    onError: error => toast.error(error.message),
  });
  return <Dialog open onOpenChange={open => { if (!open && !salvar.isPending) onClose(); }}><DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl"><DialogHeader><DialogTitle>{edicao ? "Editar formulário interno" : questionario?.titulo ?? "Novo formulário interno"}</DialogTitle><DialogDescription>{edicao ? "Respostas recebidas preservadas; anonimato mantido." : questionario ? questionario.anonimo ? "Resposta anônima" : "Resposta identificada" : "Cadastro de questionário"}</DialogDescription></DialogHeader>
    <form className="space-y-5" onSubmit={e => { e.preventDefault(); if (valido && !salvar.isPending) salvar.mutate(); }}>
      {respondendo && questionario ? <>{questionario.descricao && <p className="whitespace-pre-wrap text-sm text-muted-foreground">{questionario.descricao}</p>}{questionario.perguntas.map((p, i) => <div key={i} className="space-y-2"><Label htmlFor={`resposta-${i}`}>{i + 1}. {p}</Label><Textarea id={`resposta-${i}`} required maxLength={5000} value={respostas[i]} disabled={salvar.isPending} onChange={e => setRespostas(values => values.map((v, n) => n === i ? e.target.value : v))} /></div>)}</> : <>
        <div className="space-y-2"><Label htmlFor="questionario-titulo">Título</Label><Input id="questionario-titulo" required maxLength={200} value={titulo} onChange={e => setTitulo(e.target.value)} disabled={salvar.isPending} /></div>
        <div className="space-y-2"><Label htmlFor="questionario-descricao">Descrição (opcional)</Label><Textarea id="questionario-descricao" maxLength={2000} value={descricao} onChange={e => setDescricao(e.target.value)} disabled={salvar.isPending} /></div>
        <div className="flex items-center justify-between gap-3"><Label htmlFor="questionario-anonimo">Formulário anônimo</Label><Switch id="questionario-anonimo" checked={anonimo} onCheckedChange={setAnonimo} disabled={salvar.isPending || edicao} /></div>
        {perguntas.map((p, i) => <div key={i} className="space-y-2"><div className="flex items-center justify-between"><Label htmlFor={`pergunta-${i}`}>{i + 1}ª pergunta</Label><div className="flex gap-1">{perguntas.length > 1 && <Button type="button" size="icon" variant="ghost" title="Remover pergunta" aria-label={`Remover pergunta ${i + 1}`} disabled={salvar.isPending} onClick={() => setPerguntas(values => values.filter((_, n) => n !== i))}><Trash2 /></Button>}{i === perguntas.length - 1 && <Button type="button" size="icon" variant="outline" title="Adicionar pergunta" aria-label="Adicionar pergunta" disabled={salvar.isPending || perguntas.length >= 30} onClick={() => setPerguntas(values => [...values, ""])}><Plus /></Button>}</div></div><Input id={`pergunta-${i}`} required maxLength={1000} value={p} disabled={salvar.isPending} onChange={e => setPerguntas(values => values.map((v, n) => n === i ? e.target.value : v))} /></div>)}
      </>}
      <DialogFooter><Button type="button" variant="outline" disabled={salvar.isPending} onClick={onClose}>Cancelar</Button><Button type="submit" disabled={!valido || salvar.isPending}>{edicao ? <Save /> : <Send />}{salvar.isPending ? "Salvando…" : edicao ? "Salvar alterações" : respondendo ? "Enviar resposta" : "Criar formulário"}</Button></DialogFooter>
    </form>
  </DialogContent></Dialog>;
}