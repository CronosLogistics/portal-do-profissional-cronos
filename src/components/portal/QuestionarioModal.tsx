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
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EditorTexto } from "@/components/portal/EditorTexto";
import { avisosKey } from "@/lib/avisos-client";
import { criarQuestionario, editarQuestionario, responderQuestionario } from "@/lib/questionarios.functions";
import { criarIdCliente } from "@/lib/client-id";
import {
  novoQuestionarioSchema,
  perguntaPadrao,
  type PerguntaQuestionario,
  type Questionario,
  type RespostaItem,
  type TipoPergunta,
} from "@/lib/questionarios.rules";
import { limparTextoFormatado, textoParaEditor } from "@/lib/rich-text";

const novaPergunta = (tipo: TipoPergunta = "texto") => perguntaPadrao(tipo, criarIdCliente());

function HtmlRico({ html }: { html: string }) {
  if (!html) return null;
  return <div className="aviso-html break-words text-sm text-muted-foreground" dangerouslySetInnerHTML={{ __html: limparTextoFormatado(textoParaEditor(html)) }} />;
}

function respostasIniciais(perguntas: PerguntaQuestionario[]): RespostaItem[] {
  return perguntas.map(p => (p.tipo === "checkbox" ? [] : p.tipo === "bloco" ? null : ""));
}

export function QuestionarioModal({ questionario, edicao = false, onClose }: { questionario?: Questionario; edicao?: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const criar = useServerFn(criarQuestionario), responder = useServerFn(responderQuestionario), editar = useServerFn(editarQuestionario);
  const respondendo = Boolean(questionario && !edicao);
  const [titulo, setTitulo] = useState(edicao ? questionario?.titulo ?? "" : "");
  const [descricao, setDescricao] = useState(edicao ? questionario?.descricao ?? "" : "");
  const [anonimo, setAnonimo] = useState(edicao ? questionario?.anonimo ?? false : false);
  const [perguntas, setPerguntas] = useState<PerguntaQuestionario[]>(edicao ? questionario?.perguntas ?? [novaPergunta()] : [novaPergunta()]);
  const [respostas, setRespostas] = useState<RespostaItem[]>(() => respostasIniciais(questionario?.perguntas ?? []));
  const dados = { titulo, descricao, anonimo, perguntas };
  const valido = respondendo
    ? perguntas.every((p, i) => {
        const r = respostas[i];
        if (p.tipo === "bloco") return true;
        if (p.tipo === "checkbox") return Array.isArray(r) && r.length > 0;
        return typeof r === "string" && r.trim().length > 0;
      })
    : novoQuestionarioSchema.safeParse(dados).success;
  const salvar = useMutation({
    mutationFn: () => questionario
      ? edicao
        ? editar({ data: { ...dados, id: questionario.id } })
        : responder({ data: { id: questionario.id, respostas } })
      : criar({ data: dados }),
    onSuccess: async result => {
      await qc.invalidateQueries({ queryKey: ["questionarios"] });
      await qc.invalidateQueries({ queryKey: avisosKey });
      toast.success(edicao ? "Formulário atualizado." : respondendo ? "Resposta salva." : "Formulário criado.");
      if (!result.registrado) toast.warning("Salvo no portal; registro no SharePoint pendente. A gestão pode reenviar.");
      onClose();
    },
    onError: error => toast.error(error.message),
  });
  const atualizar = (i: number, patch: Partial<PerguntaQuestionario> | PerguntaQuestionario) =>
    setPerguntas(values => values.map((p, n) => (n === i ? { ...p, ...patch } as PerguntaQuestionario : p)));
  const trocarTipo = (i: number, tipo: TipoPergunta) => {
    const atual = perguntas[i];
    if (!atual || atual.tipo === tipo) return;
    const base = { id: atual.id, enunciado: atual.tipo === "bloco" || tipo === "bloco" ? "" : atual.enunciado };
    if (tipo === "bloco") atualizar(i, { ...base, tipo });
    else if (tipo === "texto") atualizar(i, { ...base, tipo });
    else atualizar(i, { ...base, tipo, opcoes: "opcoes" in atual ? atual.opcoes : ["", ""] });
  };
  return (
    <Dialog open onOpenChange={open => { if (!open && !salvar.isPending) onClose(); }}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{edicao ? "Editar formulário interno" : questionario?.titulo ?? "Novo formulário interno"}</DialogTitle>
          <DialogDescription>{edicao ? "Respostas recebidas preservadas; anonimato mantido." : questionario ? questionario.anonimo ? "Resposta anônima" : "Resposta identificada" : "Cadastro de questionário"}</DialogDescription>
        </DialogHeader>
        <form className="space-y-5" onSubmit={e => { e.preventDefault(); if (valido && !salvar.isPending) salvar.mutate(); }}>
          {respondendo && questionario ? (
            <>
              <HtmlRico html={questionario.descricao} />
              {questionario.perguntas.map((p, i) => (
                <div key={p.id} className="space-y-2">
                  {p.tipo === "bloco" ? <HtmlRico html={p.enunciado} /> : (
                    <>
                      <Label htmlFor={`resposta-${i}`}>{i + 1}. {p.enunciado}</Label>
                      {p.tipo === "texto" && (
                        <Textarea id={`resposta-${i}`} required maxLength={5000} value={typeof respostas[i] === "string" ? respostas[i] as string : ""} disabled={salvar.isPending}
                          onChange={e => setRespostas(values => values.map((v, n) => n === i ? e.target.value : v))} />
                      )}
                      {p.tipo === "radio" && (
                        <RadioGroup value={typeof respostas[i] === "string" ? respostas[i] as string : ""} disabled={salvar.isPending}
                          onValueChange={value => setRespostas(values => values.map((v, n) => n === i ? value : v))}>
                          {p.opcoes.map(opcao => (
                            <label key={opcao} className="flex items-center gap-2 text-sm">
                              <RadioGroupItem value={opcao} id={`resposta-${i}-${opcao}`} />
                              <span>{opcao}</span>
                            </label>
                          ))}
                        </RadioGroup>
                      )}
                      {p.tipo === "checkbox" && (
                        <div className="space-y-2">
                          {p.opcoes.map(opcao => {
                            const marcadas = Array.isArray(respostas[i]) ? respostas[i] as string[] : [];
                            return (
                              <label key={opcao} className="flex items-center gap-2 text-sm">
                                <Checkbox checked={marcadas.includes(opcao)} disabled={salvar.isPending}
                                  onCheckedChange={checked => setRespostas(values => values.map((v, n) => {
                                    if (n !== i) return v;
                                    const atuais = Array.isArray(v) ? v : [];
                                    return checked ? [...atuais, opcao] : atuais.filter(x => x !== opcao);
                                  }))} />
                                <span>{opcao}</span>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
            </>
          ) : (
            <>
              <div className="space-y-2"><Label htmlFor="questionario-titulo">Título</Label><Input id="questionario-titulo" required maxLength={200} value={titulo} onChange={e => setTitulo(e.target.value)} disabled={salvar.isPending} /></div>
              <div className="space-y-2"><Label>Descrição (opcional)</Label><EditorTexto id="questionario-descricao" label="Descrição" initial={descricao} onChange={setDescricao} /></div>
              <div className="flex items-center justify-between gap-3"><Label htmlFor="questionario-anonimo">Formulário anônimo</Label><Switch id="questionario-anonimo" checked={anonimo} onCheckedChange={setAnonimo} disabled={salvar.isPending || edicao} /></div>
              {perguntas.map((p, i) => (
                <div key={p.id} className="space-y-3 rounded-md border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Label>{p.tipo === "bloco" ? `Bloco de texto ${i + 1}` : `${i + 1}ª pergunta`}</Label>
                    <div className="flex flex-wrap items-center gap-1">
                      <Select value={p.tipo} onValueChange={v => trocarTipo(i, v as TipoPergunta)} disabled={salvar.isPending}>
                        <SelectTrigger className="h-8 w-[10.5rem]" aria-label={`Tipo do item ${i + 1}`}><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="texto">Texto aberto</SelectItem>
                          <SelectItem value="radio">Escolha única</SelectItem>
                          <SelectItem value="checkbox">Múltipla escolha</SelectItem>
                          <SelectItem value="bloco">Bloco de texto</SelectItem>
                        </SelectContent>
                      </Select>
                      {perguntas.length > 1 && <Button type="button" size="icon" variant="ghost" title="Remover" aria-label={`Remover item ${i + 1}`} disabled={salvar.isPending} onClick={() => setPerguntas(values => values.filter((_, n) => n !== i))}><Trash2 /></Button>}
                      {i === perguntas.length - 1 && <Button type="button" size="icon" variant="outline" title="Adicionar pergunta" aria-label="Adicionar pergunta" disabled={salvar.isPending || perguntas.length >= 30} onClick={() => setPerguntas(values => [...values, novaPergunta()])}><Plus /></Button>}
                    </div>
                  </div>
                  {p.tipo === "bloco" ? (
                    <EditorTexto id={`pergunta-${i}`} label={`Bloco de texto ${i + 1}`} initial={p.enunciado} onChange={html => atualizar(i, { enunciado: html })} />
                  ) : (
                    <Input id={`pergunta-${i}`} required maxLength={1000} value={p.enunciado} disabled={salvar.isPending} placeholder="Enunciado da pergunta"
                      onChange={e => atualizar(i, { enunciado: e.target.value })} />
                  )}
                  {(p.tipo === "radio" || p.tipo === "checkbox") && (
                    <div className="space-y-2">
                      <Label>Opções de resposta</Label>
                      {p.opcoes.map((opcao, oi) => (
                        <div key={oi} className="flex gap-2">
                          <Input required maxLength={200} value={opcao} disabled={salvar.isPending} placeholder={`Opção ${oi + 1}`}
                            onChange={e => atualizar(i, { opcoes: p.opcoes.map((o, n) => n === oi ? e.target.value : o) })} />
                          {p.opcoes.length > 2 && (
                            <Button type="button" size="icon" variant="ghost" aria-label={`Remover opção ${oi + 1}`} disabled={salvar.isPending}
                              onClick={() => atualizar(i, { opcoes: p.opcoes.filter((_, n) => n !== oi) })}><Trash2 /></Button>
                          )}
                        </div>
                      ))}
                      <Button type="button" size="sm" variant="outline" disabled={salvar.isPending || p.opcoes.length >= 20}
                        onClick={() => atualizar(i, { opcoes: [...p.opcoes, ""] })}><Plus />Opção</Button>
                    </div>
                  )}
                </div>
              ))}
            </>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" disabled={salvar.isPending} onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={!valido || salvar.isPending}>{edicao ? <Save /> : <Send />}{salvar.isPending ? "Salvando…" : edicao ? "Salvar alterações" : respondendo ? "Enviar resposta" : "Criar formulário"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
