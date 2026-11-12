import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Trash2, Send, Save, FileUp, Sparkles, FileText, Eye, PencilLine } from "lucide-react";
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
import { excluirRascunhoQuestionario, importarQuestionarioForms, salvarRascunhoQuestionario } from "@/lib/questionarios-rascunhos.functions";
import { LIMITE_PDF_BYTES, MINIMO_PERGUNTAS_IA, contarPerguntasImportadas, importacaoTemPerguntasSuficientes, type RascunhoQuestionario } from "@/lib/questionarios-importacao.rules";
import {
  novoQuestionarioSchema,
  hojeQuestionarioBrasil,
  questionarioExpirado,
  formatarPrazoQuestionario,
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

function lerBase64(arquivo: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onload = () => resolve(String(leitor.result).split(",")[1] ?? "");
    leitor.onerror = () => reject(new Error("Não foi possível ler o arquivo."));
    leitor.readAsDataURL(arquivo);
  });
}

export function QuestionarioModal({ questionario, edicao = false, rascunho, onClose }: { questionario?: Questionario; edicao?: boolean; rascunho?: RascunhoQuestionario; onClose: () => void }) {
  const qc = useQueryClient();
  const criar = useServerFn(criarQuestionario), responder = useServerFn(responderQuestionario), editar = useServerFn(editarQuestionario);
  const respondendo = Boolean(questionario && !edicao);
  const criando = !questionario;
  const [titulo, setTitulo] = useState(edicao ? questionario?.titulo ?? "" : rascunho?.titulo ?? "");
  const [descricao, setDescricao] = useState(edicao ? questionario?.descricao ?? "" : rascunho?.descricao ?? "");
  const [anonimo, setAnonimo] = useState(edicao ? questionario?.anonimo ?? false : rascunho?.anonimo ?? false);
  const prazoInicial = edicao ? questionario?.expira_em ?? null : rascunho?.expira_em ?? null;
  const [temPrazo, setTemPrazo] = useState(Boolean(prazoInicial));
  const [prazo, setPrazo] = useState(prazoInicial ?? "");
  const [agora, setAgora] = useState(() => new Date());
  useEffect(() => { const timer = window.setInterval(() => setAgora(new Date()), 1000); return () => window.clearInterval(timer); }, []);
  const expirado = respondendo && questionario ? questionarioExpirado(questionario, agora) : false;
  const prazoInvalido = temPrazo && (!prazo || (prazo < hojeQuestionarioBrasil(agora) && !(edicao && prazo === prazoInicial)));
  const [perguntas, setPerguntas] = useState<PerguntaQuestionario[]>(edicao ? questionario?.perguntas ?? [novaPergunta()] : rascunho?.perguntas?.length ? rascunho.perguntas : [novaPergunta()]);
  const [rascunhoId, setRascunhoId] = useState<string | null>(rascunho?.id ?? null);
  const [versaoEditor, setVersaoEditor] = useState(0);
  const [previa, setPrevia] = useState(false);
  const [importando, setImportando] = useState(false);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [textoImportacao, setTextoImportacao] = useState("");
  const [poucasPerguntas, setPoucasPerguntas] = useState<number | null>(null);
  const importar = useServerFn(importarQuestionarioForms), guardarRascunho = useServerFn(salvarRascunhoQuestionario), apagarRascunho = useServerFn(excluirRascunhoQuestionario);
  const leitura = useMutation({
    mutationFn: async () => {
      if (arquivo && arquivo.size > LIMITE_PDF_BYTES) throw new Error("O PDF deve ter até 8 MB.");
      const pdfBase64 = arquivo ? await lerBase64(arquivo) : null;
      return importar({ data: { pdfBase64, nomeArquivo: arquivo?.name ?? null, texto: textoImportacao.trim() || null } });
    },
    onSuccess: r => {
      if (!r.perguntas.length) { toast.error("Nenhuma pergunta identificada no conteúdo enviado."); return; }
      if (!importacaoTemPerguntasSuficientes(r.perguntas)) { setPoucasPerguntas(contarPerguntasImportadas(r.perguntas)); return; }
      if (r.titulo) setTitulo(r.titulo);
      setDescricao(r.descricao);
      setPerguntas(r.perguntas);
      setVersaoEditor(v => v + 1);
      setImportando(false); setArquivo(null); setTextoImportacao("");
      toast.success(`${r.perguntas.length} itens importados. Revise antes de publicar.`);
    },
    onError: error => toast.error(error.message),
  });
  const salvarRascunho = useMutation({
    mutationFn: () => guardarRascunho({ data: { id: rascunhoId, titulo, descricao, anonimo, perguntas, expira_em: temPrazo ? prazo || null : null } }),
    onSuccess: async r => {
      setRascunhoId(r.id);
      await qc.invalidateQueries({ queryKey: ["questionarios", "rascunhos"] });
      toast.success("Rascunho salvo.");
    },
    onError: error => toast.error(error.message),
  });
  const [respostas, setRespostas] = useState<RespostaItem[]>(() => respostasIniciais(questionario?.perguntas ?? []));
  const dados = { titulo, descricao, anonimo, perguntas, expira_em: temPrazo ? prazo : null };
  const valido = respondendo
    ? !expirado && (questionario?.perguntas ?? []).every((p, i) => {
        const r = respostas[i];
        if (p.tipo === "bloco") return true;
        if (p.tipo === "checkbox") return Array.isArray(r) && r.length > 0;
        return typeof r === "string" && r.trim().length > 0;
      })
    : !prazoInvalido && novoQuestionarioSchema.safeParse(dados).success;
  const salvar = useMutation({
    mutationFn: () => questionario
      ? edicao
        ? editar({ data: { ...dados, id: questionario.id } })
        : responder({ data: { id: questionario.id, respostas } })
      : criar({ data: dados }).then(async r => { if (rascunhoId) { try { await apagarRascunho({ data: { id: rascunhoId } }); } catch { /* draft cleanup is best-effort */ } } return r; }),
    onSuccess: async result => {
      await qc.invalidateQueries({ queryKey: ["questionarios"] });
      await qc.invalidateQueries({ queryKey: avisosKey });
      if (criando) await qc.invalidateQueries({ queryKey: ["questionarios", "rascunhos"] });
      toast.success(edicao ? "Formulário atualizado." : respondendo ? "Resposta salva." : "Formulário publicado.");
      if (!result.registrado) toast.warning("Salvo no portal; registro no SharePoint pendente. A gestão pode reenviar.");
      onClose();
    },
    onError: error => {
      toast.error(error.message);
      if (error.message.includes("prazo de resposta")) { void qc.invalidateQueries({ queryKey: ["questionarios"] }); onClose(); }
    },
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
  return (<>
    <Dialog open onOpenChange={open => { if (!open && !salvar.isPending) onClose(); }}>
      <DialogContent className="flex max-h-[min(92dvh,100svh)] w-[calc(100%-2rem)] max-w-2xl flex-col gap-4 overflow-hidden p-4 sm:p-6">
        <DialogHeader className="shrink-0 pr-8">
          <DialogTitle className="break-words">{edicao ? "Editar formulário interno" : questionario?.titulo ?? "Novo formulário interno"}</DialogTitle>
          <DialogDescription>{edicao ? "Respostas recebidas preservadas; anonimato mantido." : questionario ? questionario.anonimo ? "Resposta anônima" : "Resposta identificada" : "Cadastro de questionário"}</DialogDescription>
        </DialogHeader>
        <form className="flex min-h-0 min-w-0 flex-1 flex-col gap-4" onSubmit={e => { e.preventDefault(); if (valido && !previa && !salvar.isPending) salvar.mutate(); }}>
          <div className="min-h-0 min-w-0 flex-1 space-y-5 overflow-y-auto overflow-x-hidden overscroll-contain pr-1">
            {(respondendo && questionario) || previa ? (
              <>
                {previa && <div className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">Pré-visualização: é assim que os profissionais verão o formulário <strong>{titulo || "Sem título"}</strong> ({anonimo ? "resposta anônima" : "resposta identificada"}). As respostas aqui não são enviadas.</div>}
                <HtmlRico html={previa ? descricao : questionario?.descricao ?? ""} />
                {(previa ? temPrazo && prazo : questionario?.expira_em) && <p className="text-sm text-muted-foreground">Respostas até {formatarPrazoQuestionario(previa ? prazo : questionario?.expira_em ?? "")} às 23:59 (Brasília).</p>}
                {expirado && <p role="alert" className="text-sm text-destructive">O prazo de resposta desta pesquisa foi encerrado.</p>}
                {(previa ? perguntas : questionario?.perguntas ?? []).map((p, i) => (
                  <div key={p.id} className="min-w-0 space-y-2">
                    {p.tipo === "bloco" ? <HtmlRico html={p.enunciado} /> : (
                      <>
                        <Label htmlFor={`resposta-${i}`} className="break-words">{i + 1}. {p.enunciado}</Label>
                        {p.tipo === "texto" && (
                          <Textarea id={`resposta-${i}`} required maxLength={5000} value={typeof respostas[i] === "string" ? respostas[i] as string : ""} disabled={salvar.isPending}
                            onChange={e => setRespostas(values => values.map((v, n) => n === i ? e.target.value : v))} />
                        )}
                        {p.tipo === "radio" && (
                          <RadioGroup value={typeof respostas[i] === "string" ? respostas[i] as string : ""} disabled={salvar.isPending}
                            onValueChange={value => setRespostas(values => values.map((v, n) => n === i ? value : v))}>
                            {p.opcoes.map(opcao => (
                              <label key={opcao} className="flex min-w-0 items-center gap-2 text-sm">
                                <RadioGroupItem value={opcao} id={`resposta-${i}-${opcao}`} />
                                <span className="break-words">{opcao}</span>
                              </label>
                            ))}
                          </RadioGroup>
                        )}
                        {p.tipo === "checkbox" && (
                          <div className="space-y-2">
                            {p.opcoes.map(opcao => {
                              const marcadas = Array.isArray(respostas[i]) ? respostas[i] as string[] : [];
                              return (
                                <label key={opcao} className="flex min-w-0 items-center gap-2 text-sm">
                                  <Checkbox checked={marcadas.includes(opcao)} disabled={salvar.isPending}
                                    onCheckedChange={checked => setRespostas(values => values.map((v, n) => {
                                      if (n !== i) return v;
                                      const atuais = Array.isArray(v) ? v : [];
                                      return checked ? [...atuais, opcao] : atuais.filter(x => x !== opcao);
                                    }))} />
                                  <span className="break-words">{opcao}</span>
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
                {criando && (
                  <div className="rounded-md border border-dashed p-3">
                    {!importando ? (
                      <Button type="button" variant="outline" size="sm" onClick={() => setImportando(true)} disabled={salvar.isPending}><FileUp />Importar do Microsoft Forms</Button>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-sm text-muted-foreground">No Forms, use <strong>⋯ &gt; Imprimir formulário &gt; Salvar como PDF</strong> e envie o arquivo, ou cole o texto do formulário. As perguntas atuais serão substituídas.</p>
                        <div className="space-y-1"><Label htmlFor="importar-pdf">Arquivo PDF</Label><Input id="importar-pdf" type="file" accept="application/pdf" disabled={leitura.isPending} onChange={e => setArquivo(e.target.files?.[0] ?? null)} /></div>
                        <div className="space-y-1"><Label htmlFor="importar-texto">Ou cole o texto</Label><Textarea id="importar-texto" rows={4} maxLength={60000} value={textoImportacao} disabled={leitura.isPending} onChange={e => setTextoImportacao(e.target.value)} /></div>
                        <div className="flex flex-wrap justify-end gap-2">
                          <Button type="button" variant="ghost" size="sm" disabled={leitura.isPending} onClick={() => setImportando(false)}>Cancelar</Button>
                          <Button type="button" size="sm" disabled={leitura.isPending || (!arquivo && !textoImportacao.trim())} onClick={() => leitura.mutate()}><Sparkles />{leitura.isPending ? "Lendo formulário…" : "Ler perguntas"}</Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                <div className="space-y-2"><Label htmlFor="questionario-titulo">Título</Label><Input id="questionario-titulo" required maxLength={200} value={titulo} onChange={e => setTitulo(e.target.value)} disabled={salvar.isPending} /></div>
                <div className="space-y-2"><Label>Descrição (opcional)</Label><EditorTexto key={`desc-${versaoEditor}`} id="questionario-descricao" label="Descrição" initial={descricao} onChange={setDescricao} /></div>
                <div className="flex items-center justify-between gap-3"><Label htmlFor="questionario-anonimo">Formulário anônimo</Label><Switch id="questionario-anonimo" checked={anonimo} onCheckedChange={setAnonimo} disabled={salvar.isPending || edicao} /></div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3"><Label htmlFor="questionario-tem-prazo">Definir prazo para responder</Label><Switch id="questionario-tem-prazo" checked={temPrazo} onCheckedChange={setTemPrazo} disabled={salvar.isPending} /></div>
                  {temPrazo && <div className="space-y-2"><Label htmlFor="questionario-prazo">Data de expiração</Label><Input id="questionario-prazo" type="date" required min={edicao && prazo === prazoInicial ? prazo : hojeQuestionarioBrasil(agora)} value={prazo} onChange={e => setPrazo(e.target.value)} disabled={salvar.isPending} /><p className="text-xs text-muted-foreground">Respostas até 23:59 do dia escolhido, no horário de Brasília.</p>{prazoInvalido && prazo && <p role="alert" className="text-xs text-destructive">Escolha uma data a partir de hoje.</p>}</div>}
                </div>
                {perguntas.map((p, i) => (
                  <div key={p.id} className="min-w-0 space-y-3 rounded-md border p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Label>{p.tipo === "bloco" ? `Bloco de texto ${i + 1}` : `${i + 1}ª pergunta`}</Label>
                      <div className="flex flex-wrap items-center gap-1">
                        <Select value={p.tipo} onValueChange={v => trocarTipo(i, v as TipoPergunta)} disabled={salvar.isPending}>
                          <SelectTrigger className="h-8 w-[10.5rem] max-w-full" aria-label={`Tipo do item ${i + 1}`}><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="texto">Texto aberto</SelectItem>
                            <SelectItem value="radio">Escolha única</SelectItem>
                            <SelectItem value="checkbox">Múltipla escolha</SelectItem>
                            <SelectItem value="bloco">Bloco de texto</SelectItem>
                          </SelectContent>
                        </Select>
                        {perguntas.length > 1 && <Button type="button" size="icon" variant="ghost" title="Remover" aria-label={`Remover item ${i + 1}`} disabled={salvar.isPending} onClick={() => setPerguntas(values => values.filter((_, n) => n !== i))}><Trash2 /></Button>}
                        {i === perguntas.length - 1 && <Button type="button" size="icon" variant="outline" title="Adicionar pergunta" aria-label="Adicionar pergunta" disabled={salvar.isPending || perguntas.length >= 70} onClick={() => setPerguntas(values => [...values, novaPergunta()])}><Plus /></Button>}
                      </div>
                    </div>
                    {p.tipo === "bloco" ? (
                      <EditorTexto key={`${p.id}-${versaoEditor}`} id={`pergunta-${i}`} label={`Bloco de texto ${i + 1}`} initial={p.enunciado} onChange={html => atualizar(i, { enunciado: html })} />
                    ) : (
                      <Input id={`pergunta-${i}`} required maxLength={1000} value={p.enunciado} disabled={salvar.isPending} placeholder="Enunciado da pergunta"
                        onChange={e => atualizar(i, { enunciado: e.target.value })} />
                    )}
                    {(p.tipo === "radio" || p.tipo === "checkbox") && (
                      <div className="space-y-2">
                        <Label>Opções de resposta</Label>
                        {p.opcoes.map((opcao, oi) => (
                          <div key={oi} className="flex min-w-0 gap-2">
                            <Input required maxLength={200} value={opcao} disabled={salvar.isPending} placeholder={`Opção ${oi + 1}`}
                              onChange={e => atualizar(i, { opcoes: p.opcoes.map((o, n) => n === oi ? e.target.value : o) })} />
                            {p.opcoes.length > 2 && (
                              <Button type="button" size="icon" variant="ghost" className="shrink-0" aria-label={`Remover opção ${oi + 1}`} disabled={salvar.isPending}
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
          </div>
          <DialogFooter className="shrink-0 flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:flex-wrap sm:justify-end">
            {!respondendo && <Button type="button" variant="ghost" disabled={salvar.isPending} onClick={() => { if (!previa) setRespostas(respostasIniciais(perguntas)); setPrevia(v => !v); }}>{previa ? <><PencilLine />Voltar à edição</> : <><Eye />Pré-visualizar</>}</Button>}
            <Button type="button" variant="outline" disabled={salvar.isPending} onClick={onClose}>Cancelar</Button>
            {criando && <Button type="button" variant="secondary" disabled={salvar.isPending || salvarRascunho.isPending || leitura.isPending} onClick={() => salvarRascunho.mutate()}><FileText />{salvarRascunho.isPending ? "Salvando…" : "Salvar rascunho"}</Button>}
            <Button type="submit" disabled={!valido || salvar.isPending || previa}>{edicao ? <Save /> : <Send />}{salvar.isPending ? "Salvando…" : edicao ? "Salvar alterações" : respondendo ? "Enviar resposta" : "Publicar formulário"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    <Dialog open={poucasPerguntas !== null} onOpenChange={o => { if (!o) setPoucasPerguntas(null); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Formulário com poucas perguntas</DialogTitle>
          <DialogDescription>
            A criação com IA só está disponível para formulários com no mínimo {MINIMO_PERGUNTAS_IA} perguntas. Foram encontradas {poucasPerguntas} pergunta(s); por isso, este formulário precisa ser montado manualmente.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter><Button type="button" onClick={() => { setPoucasPerguntas(null); setImportando(false); }}>Entendi, fazer manualmente</Button></DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
