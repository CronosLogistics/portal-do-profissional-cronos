import type { ReactNode } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { TableHead } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { DirecaoOrdenacao, EstadoOrdenacao } from "@/lib/tabela-ordenacao";

type PropsBase<K extends string> = {
  coluna: K;
  ordenacao: EstadoOrdenacao<K> | null;
  onOrdenar: (coluna: K) => void;
  children: ReactNode;
  className?: string;
  align?: "left" | "right";
};

function Icone({ ativo, direcao }: { ativo: boolean; direcao?: DirecaoOrdenacao }) {
  if (!ativo) return <ArrowUpDown className="size-3.5 opacity-50" aria-hidden />;
  if (direcao === "desc") return <ArrowDown className="size-3.5" aria-hidden />;
  return <ArrowUp className="size-3.5" aria-hidden />;
}

function BotaoOrdenacao<K extends string>({
  coluna,
  ordenacao,
  onOrdenar,
  children,
  className,
  align = "left",
}: PropsBase<K>) {
  const ativo = ordenacao?.coluna === coluna;
  const direcao = ativo ? ordenacao.direcao : undefined;
  const rotulo = typeof children === "string" ? children : "coluna";
  return (
    <button
      type="button"
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 font-medium text-muted-foreground transition-colors hover:text-foreground",
        align === "right" && "flex-row-reverse",
        className,
      )}
      aria-label={
        ativo
          ? `Ordenar ${rotulo} ${direcao === "asc" ? "decrescente" : "sem ordenação"}`
          : `Ordenar ${rotulo} crescente`
      }
      title={ativo ? (direcao === "asc" ? "Crescente" : "Decrescente") : "Ordenar"}
      onClick={() => onOrdenar(coluna)}
    >
      <span className="truncate">{children}</span>
      <Icone ativo={ativo} direcao={direcao} />
    </button>
  );
}

/** Cabeçalho ordenável para o componente Table (shadcn). */
export function TableHeadOrdenavel<K extends string>({
  coluna,
  ordenacao,
  onOrdenar,
  children,
  className,
  align = "left",
}: PropsBase<K>) {
  return (
    <TableHead className={cn(align === "right" && "text-right", className)}>
      <BotaoOrdenacao coluna={coluna} ordenacao={ordenacao} onOrdenar={onOrdenar} align={align}>
        {children}
      </BotaoOrdenacao>
    </TableHead>
  );
}

/** Cabeçalho ordenável para tabelas HTML nativas. */
export function ThOrdenavel<K extends string>({
  coluna,
  ordenacao,
  onOrdenar,
  children,
  className,
  align = "left",
}: PropsBase<K>) {
  return (
    <th className={cn("py-2 pr-4 text-left", align === "right" && "text-right", className)}>
      <BotaoOrdenacao coluna={coluna} ordenacao={ordenacao} onOrdenar={onOrdenar} align={align}>
        {children}
      </BotaoOrdenacao>
    </th>
  );
}
