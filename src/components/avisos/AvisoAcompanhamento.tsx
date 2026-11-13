import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ThOrdenavel } from "@/components/ui/cabecalho-ordenavel";
import { useOrdenacaoTabela } from "@/hooks/useOrdenacaoTabela";
import { acompanharAviso, avisosKey } from "@/lib/avisos-client";
import { formatarDataBrasilia } from "@/lib/avisos-rules";

function ListaAcompanhamento({
  confirmada,
  pessoas,
}: {
  confirmada: boolean;
  pessoas: { id: string; nome: string; confirmado_em: string | null }[];
}) {
  const lista = pessoas.filter((p) => Boolean(p.confirmado_em) === confirmada);
  const { itens, ordenacao, alternar } = useOrdenacaoTabela(lista, {
    nome: (p) => p.nome,
    confirmacao: (p) => p.confirmado_em,
  });
  return (
    <section>
      <h3 className="mb-3 font-bold text-primary">{confirmada ? "Confirmaram leitura" : "Não confirmaram"} ({lista.length})</h3>
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b">
            <ThOrdenavel coluna="nome" ordenacao={ordenacao} onOrdenar={alternar} className="py-2">Profissional</ThOrdenavel>
            {confirmada && (
              <ThOrdenavel coluna="confirmacao" ordenacao={ordenacao} onOrdenar={alternar} className="py-2">Confirmação</ThOrdenavel>
            )}
          </tr>
        </thead>
        <tbody>
          {itens.map((p) => (
            <tr key={p.id} className="border-b">
              <td className="py-2 pr-2 break-words">{p.nome}</td>
              {confirmada && (
                <td className="py-2 text-xs text-muted-foreground">{p.confirmado_em && formatarDataBrasilia(p.confirmado_em)}</td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {!lista.length && <p className="py-3 text-sm text-muted-foreground">Nenhum profissional.</p>}
    </section>
  );
}

export function AvisoAcompanhamento({ id, onClose }: { id: string | null; onClose: () => void }) {
  const q = useQuery({ queryKey: [...avisosKey, "acompanhamento", id], queryFn: () => acompanharAviso(id ?? ""), enabled: Boolean(id), refetchInterval: 30000 });
  const pessoas = q.data?.pessoas ?? [];
  return <Dialog open={Boolean(id)} onOpenChange={(o) => !o && onClose()}>
    <DialogContent className="max-h-[85dvh] max-w-3xl overflow-y-auto">
      <DialogHeader><DialogTitle>{q.data?.titulo ?? "Acompanhamento de leitura"}</DialogTitle></DialogHeader>
      {q.isLoading ? <p>Carregando...</p> : q.isError ? <p role="alert" className="text-destructive">{q.error.message}</p> : <div className="grid gap-6 sm:grid-cols-2">
        <ListaAcompanhamento confirmada pessoas={pessoas} />
        <ListaAcompanhamento confirmada={false} pessoas={pessoas} />
      </div>}
    </DialogContent>
  </Dialog>;
}
