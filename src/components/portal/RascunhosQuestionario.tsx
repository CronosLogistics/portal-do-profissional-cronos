import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { FileText, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { excluirRascunhoQuestionario, listarRascunhosQuestionario } from "@/lib/questionarios-rascunhos.functions";
import type { RascunhoQuestionario } from "@/lib/questionarios-importacao.rules";

export function RascunhosQuestionario({ onAbrir }: { onAbrir: (r: RascunhoQuestionario) => void }) {
  const qc = useQueryClient();
  const listar = useServerFn(listarRascunhosQuestionario), excluir = useServerFn(excluirRascunhoQuestionario);
  const { data = [] } = useQuery({ queryKey: ["questionarios", "rascunhos"], queryFn: () => listar() });
  const apagar = useMutation({
    mutationFn: (id: string) => excluir({ data: { id } }),
    onSuccess: async () => { await qc.invalidateQueries({ queryKey: ["questionarios", "rascunhos"] }); toast.success("Rascunho excluído."); },
    onError: e => toast.error(e.message),
  });
  if (!data.length) return null;
  return (
    <section className="mb-8">
      <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-secondary">Rascunhos</h2>
      <div className="divide-y border-y">
        {data.map(r => (
          <article key={r.id} className="flex flex-wrap items-center justify-between gap-4 py-4">
            <div className="min-w-0 flex-1">
              <h3 className="flex items-center gap-2 break-words font-bold text-primary"><FileText className="size-4" />{r.titulo || "Sem título"}</h3>
              <p className="mt-1 text-xs text-muted-foreground">Rascunho · {r.perguntas.length} itens · atualizado em {new Date(r.atualizado_em).toLocaleString("pt-BR")}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onAbrir(r)}><Pencil />Continuar</Button>
              <Button variant="ghost" size="icon" aria-label={`Excluir rascunho ${r.titulo}`} disabled={apagar.isPending} onClick={() => { if (window.confirm("Excluir este rascunho?")) apagar.mutate(r.id); }}><Trash2 className="text-destructive" /></Button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
