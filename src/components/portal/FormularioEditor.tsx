import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Formulario } from "@/lib/formularios";
import { formulariosKey, salvarFormulario } from "@/lib/formularios-client";

export function FormularioEditor({ formulario, setores, onClose }: { formulario?: Formulario; setores: string[]; onClose: () => void }) {
  const qc = useQueryClient();
  const [dados, setDados] = useState({ setor: formulario?.setor ?? "", titulo: formulario?.titulo ?? "", codigo: formulario?.codigo ?? "", descricao: formulario?.descricao ?? "", acao: formulario?.acao ?? "", url: formulario?.url ?? "" });
  const valido = dados.setor.trim() && dados.titulo.trim() && dados.acao.trim() && /^https:\/\/\S+$/i.test(dados.url.trim());
  const salvar = useMutation({
    mutationFn: () => salvarFormulario({ setor: dados.setor.trim(), titulo: dados.titulo.trim(), codigo: dados.codigo.trim(), descricao: dados.descricao.trim(), acao: dados.acao.trim(), url: dados.url.trim() }, formulario?.id),
    onSuccess: async () => { await qc.invalidateQueries({ queryKey: formulariosKey }); toast.success("Formulário salvo."); onClose(); },
    onError: () => toast.error("Não foi possível salvar o formulário. Confira os campos e sua permissão."),
  });
  const campos = [{ key: "setor", label: "Setor", max: 100 }, { key: "titulo", label: "Título", max: 200 }, { key: "codigo", label: "Código RQ (opcional)", max: 100 }, { key: "acao", label: "Nome do link", max: 200 }, { key: "url", label: "Endereço (URL)", max: 2048 }] as const;
  return <Dialog open onOpenChange={open => { if (!open && !salvar.isPending) onClose(); }}><DialogContent className="max-h-[90dvh] overflow-y-auto"><DialogHeader><DialogTitle>{formulario ? "Editar formulário" : "Novo formulário"}</DialogTitle><DialogDescription>{formulario?.titulo ?? "Cadastro de formulário"}</DialogDescription></DialogHeader>
    <form onSubmit={e => { e.preventDefault(); if (valido && !salvar.isPending) salvar.mutate(); }} className="space-y-4">
      {campos.map(c => <div key={c.key} className="space-y-1.5"><Label htmlFor={`formulario-${c.key}`}>{c.label}</Label><Input id={`formulario-${c.key}`} list={c.key === "setor" ? "formulario-setores" : undefined} type={c.key === "url" ? "url" : "text"} required={c.key !== "codigo"} maxLength={c.max} value={dados[c.key]} disabled={salvar.isPending} onChange={e => setDados(d => ({ ...d, [c.key]: e.target.value }))} /> </div>)}
      <datalist id="formulario-setores">{setores.map(s => <option key={s} value={s} />)}</datalist>
      <div className="space-y-1.5"><Label htmlFor="formulario-descricao">Descrição (opcional)</Label><Textarea id="formulario-descricao" maxLength={2000} value={dados.descricao} disabled={salvar.isPending} onChange={e => setDados(d => ({ ...d, descricao: e.target.value }))} /></div>
      <DialogFooter><Button type="button" variant="outline" disabled={salvar.isPending} onClick={onClose}>Cancelar</Button><Button type="submit" disabled={!valido || salvar.isPending}>{salvar.isPending ? "Salvando…" : "Salvar"}</Button></DialogFooter>
    </form>
  </DialogContent></Dialog>;
}