import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { excluirQuestionario } from "@/lib/questionarios.functions";
import type { Questionario } from "@/lib/questionarios.rules";

export function QuestionarioExcluir({ questionario, onClose }: { questionario: Questionario; onClose: () => void }) {
  const excluir = useServerFn(excluirQuestionario), qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => excluir({ data: { id: questionario.id } }),
    onSuccess: async () => { await qc.invalidateQueries({ queryKey: ["questionarios"] }); toast.success("Formulário e respostas excluídos do portal e do SharePoint."); onClose(); },
    onError: async error => { await qc.invalidateQueries({ queryKey: ["questionarios"] }); toast.error(error.message); },
  });
  return <Dialog open onOpenChange={open => { if (!open && !mutation.isPending) onClose(); }}><DialogContent className="sm:max-w-lg"><DialogHeader><DialogTitle>Excluir formulário?</DialogTitle><DialogDescription>O formulário “{questionario.titulo}” e todas as respostas recebidas serão removidos do portal e do SharePoint. Esta ação não pode ser desfeita.</DialogDescription></DialogHeader>{mutation.error && <p role="alert" className="text-sm text-destructive">{mutation.error.message}</p>}<DialogFooter><Button variant="outline" disabled={mutation.isPending} onClick={onClose}>Cancelar</Button><Button variant="destructive" disabled={mutation.isPending} onClick={() => mutation.mutate()}><Trash2 />{mutation.isPending ? "Excluindo…" : "Excluir formulário e respostas"}</Button></DialogFooter></DialogContent></Dialog>;
}