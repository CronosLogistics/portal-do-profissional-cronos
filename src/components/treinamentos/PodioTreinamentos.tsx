import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Trophy } from "lucide-react";
import { podioTreinamentos, type PodioItem } from "@/lib/ranking.functions";
import { useFotoProfissional } from "@/hooks/use-minha-foto";

const MEDALHA: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

function Lugar({ item }: { item: PodioItem }) {
  const foto = useFotoProfissional(item.userId);
  const primeiro = item.posicao === 1;
  const iniciais = item.nome.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
  const nome = item.userId
    ? <Link to="/perfil/$id" params={{ id: item.userId }} className="font-bold text-secondary hover:underline">{item.nome}</Link>
    : <span className="font-bold text-secondary">{item.nome}</span>;
  return (
    <div className={`flex flex-1 flex-col items-center text-center ${primeiro ? "sm:order-2" : item.posicao === 2 ? "sm:order-1" : "sm:order-3"}`}>
      <div className="relative mb-3">
        <div className={`${primeiro ? "h-24 w-24 ring-4" : "h-20 w-20 ring-2"} overflow-hidden rounded-full bg-muted ring-primary`}>
          {foto ? <img src={foto} alt={item.nome} className="h-full w-full object-cover" /> : <span className="flex h-full w-full items-center justify-center text-xl font-bold text-primary">{iniciais}</span>}
        </div>
        <span className="absolute -bottom-2 -right-2 text-3xl" aria-label={`${item.posicao}º lugar`}>{MEDALHA[item.posicao]}</span>
      </div>
      {nome}
      {item.subtitulo && <p className="text-xs text-muted-foreground">{item.subtitulo}</p>}
      <span className="gradient-primary mt-2 inline-flex rounded-full px-4 py-1 text-sm font-bold text-primary-foreground">{item.pontos} pts</span>
      <div className={`mt-3 hidden w-full rounded-t-xl border border-border bg-muted/60 sm:flex sm:items-start sm:justify-center sm:pt-2 ${primeiro ? "h-28" : item.posicao === 2 ? "h-20" : "h-14"}`}>
        <span className="font-display text-2xl font-bold text-primary">{item.posicao}º</span>
      </div>
    </div>
  );
}

export function PodioTreinamentos() {
  const buscar = useServerFn(podioTreinamentos);
  const { data, isLoading } = useQuery({ queryKey: ["podio-treinamentos"], queryFn: () => buscar(), staleTime: 10 * 60_000 });
  return (
    <div className="glass-card mb-8 rounded-2xl p-6">
      <div className="mb-6 flex items-center gap-2">
        <Trophy className="h-5 w-5 text-primary" />
        <h3 className="font-display text-xl font-bold">Top 3 em pontuação</h3>
        {data?.periodo && <span className="ml-auto text-xs text-muted-foreground">{data.periodo}</span>}
      </div>
      {isLoading ? <p className="text-sm text-muted-foreground">Carregando ranking…</p>
        : data?.erro ? <p className="text-sm text-muted-foreground">{data.erro}</p>
        : !data?.itens.length ? <p className="text-sm text-muted-foreground">Ainda não há pontuações neste semestre.</p>
        : <div className="flex flex-col gap-8 sm:flex-row sm:items-end sm:gap-4">{data.itens.map((i) => <Lugar key={`${i.posicao}-${i.nome}`} item={i} />)}</div>}
    </div>
  );
}
