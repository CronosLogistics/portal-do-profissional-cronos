import { useQuery } from "@tanstack/react-query";
import { imagensInsider, insiderKey, lerEdicaoPorAviso } from "@/lib/insider-client";
import { nomeMes, type ConteudoInsider, type PessoaInsider } from "@/lib/insider.rules";
import banner from "@/assets/banner_cronos_insider.webp.asset.json";
import aniv from "@/assets/aniv_cronos_insider.webp.asset.json";
import tempo from "@/assets/tempo_casa_cronos_insider.webp.asset.json";
import mes from "@/assets/mes_cronos_insider.webp.asset.json";
import assinatura from "@/assets/ass_cronos_insider.webp.asset.json";
import rodape from "@/assets/rodape_cronos_insider.webp.asset.json";

function Texto({ value }: { value: string }) {
  return value ? <p className="whitespace-pre-line break-words px-4 py-5 text-base leading-relaxed sm:px-10">{value}</p> : null;
}
function Pessoas({ pessoas, urls, mesAno }: { pessoas: PessoaInsider[]; urls: Record<string, string>; mesAno: string }) {
  const mesNome = nomeMes(mesAno).split(" de ")[0];
  return <div className="grid grid-cols-2 gap-x-4 gap-y-6 px-4 py-6 sm:grid-cols-4 sm:px-10 lg:grid-cols-5">{pessoas.map(p => <article key={p.id} className="min-w-0 text-center">
    <div className="mb-2 flex aspect-square items-center justify-center overflow-hidden rounded-md bg-muted text-2xl font-bold text-accent">
      {p.foto && urls[p.foto] ? <img src={urls[p.foto]} alt={p.nome} className="h-full w-full object-cover" /> : p.nome.split(/\s+/).filter(Boolean).slice(0, 2).map(n => n[0]).join("")}
    </div>
    {p.anos && <p className="font-bold text-primary">{p.anos} {p.anos === 1 ? "ano" : "anos"}</p>}
    <h3 className="break-words text-sm font-bold text-foreground">{p.nome}</h3>
    <p className="mt-1 break-words text-xs text-muted-foreground">{[p.departamento, p.escritorio].filter(Boolean).join(" · ")}</p>
    <p className="text-xs text-muted-foreground">{String(p.dia).padStart(2, "0")} de {mesNome}</p>
  </article>)}</div>;
}
export function InsiderJornal({ conteudo, mesAno }: { conteudo: ConteudoInsider; mesAno: string }) {
  const imgs = useQuery({ queryKey: [...insiderKey, "imagens", conteudo], queryFn: () => imagensInsider(conteudo), staleTime: 45 * 60000, refetchInterval: 45 * 60000, retry: false });
  const urls = imgs.data ?? {};
  return <article className="mx-auto w-full max-w-[820px] bg-card py-4 text-card-foreground">
    {imgs.error && <p role="alert" className="px-4 text-sm text-destructive">Não foi possível carregar as fotos. Reabra a edição para tentar novamente.</p>}
    <img src={banner.url} alt="Cronos Insider" className="h-auto w-full px-4 sm:px-10" />
    <p className="px-4 pt-4 text-sm font-bold capitalize text-accent sm:px-10">{nomeMes(mesAno)}</p>
    <Texto value={conteudo.abertura} />
    <img src={conteudo.bannerMes && urls[conteudo.bannerMes] ? urls[conteudo.bannerMes] : mes.url} alt="Destaques do mês" className="h-auto w-full px-4 sm:px-10" />
    <Texto value={conteudo.antesEventos} />
    <div className="grid grid-cols-1 gap-6 px-4 py-5 sm:grid-cols-3 sm:px-10">{conteudo.eventos.map(e => <article key={e.id} className="min-w-0 text-center">
      {e.imagem && urls[e.imagem] && <img src={urls[e.imagem]} alt={e.titulo} className="mx-auto mb-3 aspect-square w-full max-w-44 rounded-md object-contain" />}
      <h3 className="break-words font-bold">{e.titulo}</h3><p className="mt-2 break-words text-sm font-bold text-accent">{e.data}</p><p className="whitespace-pre-line break-words text-sm">{e.descricao}</p>
    </article>)}</div>
    <img src={aniv.url} alt="Aniversariantes" className="h-auto w-full px-4 sm:px-10" />
    <Texto value={conteudo.antesAniversarios} /><Pessoas pessoas={conteudo.aniversariantes} urls={urls} mesAno={mesAno} />
    <img src={tempo.url} alt="Tempo de empresa" className="h-auto w-full px-4 sm:px-10" />
    <Texto value={conteudo.antesTempoCasa} /><Pessoas pessoas={conteudo.tempoCasa} urls={urls} mesAno={mesAno} />
    <Texto value={conteudo.encerramento} />
    <img src={assinatura.url} alt="Assinatura People Management" className="h-auto w-full px-4 sm:px-10" />
    <img src={rodape.url} alt="Cronos Logistics — certificações e escritórios" className="h-auto w-full px-4 pt-4 sm:px-10" />
  </article>;
}
export function InsiderPublicado({ avisoId, fallback }: { avisoId: string; fallback: React.ReactNode }) {
  const q = useQuery({ queryKey: [...insiderKey, "publicado", avisoId], queryFn: () => lerEdicaoPorAviso(avisoId), retry: false });
  if (q.isPending) return <p className="text-muted-foreground">Carregando edição…</p>;
  if (q.error) return <p role="alert" className="text-destructive">Não foi possível carregar esta edição. Feche e tente novamente.</p>;
  return q.data ? <InsiderJornal conteudo={q.data.conteudo} mesAno={q.data.mes_ano} /> : fallback;
}