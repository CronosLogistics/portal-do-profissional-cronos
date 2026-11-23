import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Eye, EyeOff, Maximize, Minus, Pencil, Plus, Save, Search, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFotoProfissional } from "@/hooks/use-minha-foto";
import { carregarOrganograma, salvarOrganograma, type PessoaOrganograma } from "@/lib/organograma.functions";
import { AREAS, NIVEIS, type Area } from "@/lib/organograma.rules";
import { cn } from "@/lib/utils";

const orgQuery = queryOptions({ queryKey: ["organograma"], queryFn: () => carregarOrganograma(), staleTime: 5 * 60_000 });

export const Route = createFileRoute("/_authenticated/organograma")({
  head: () => ({
    meta: [
      { title: "Organograma | Portal do Profissional Cronos" },
      { name: "description", content: "Organograma dinâmico da Cronos Logistics com os profissionais ativos." },
      { property: "og:title", content: "Organograma | Portal do Profissional Cronos" },
      { property: "og:description", content: "Estrutura da Cronos Logistics por área, atualizada com os profissionais ativos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(orgQuery),
  component: OrganogramaPage,
});

type Ajuste = { area: Area; oculto: boolean };
const iniciais = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase();

function Foto({ id, nome, size = 40 }: { id: string; nome: string; size?: number }) {
  const foto = useFotoProfissional(id);
  return foto ? (
    <img src={foto} alt="" className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />
  ) : (
    <span className="flex shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-accent" style={{ width: size, height: size }}>{iniciais(nome)}</span>
  );
}

function OrganogramaPage() {
  const { data } = useSuspenseQuery(orgQuery);
  const qc = useQueryClient();
  const salvar = useServerFn(salvarOrganograma);
  const [editando, setEditando] = useState(false);
  const [rascunho, setRascunho] = useState<Record<string, Ajuste>>({});
  const [salvando, setSalvando] = useState(false);
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [view, setView] = useState({ x: 24, y: 24, z: 0.6 });
  const viewRef = useRef(view);
  viewRef.current = view;
  const box = useRef<HTMLDivElement>(null);
  const conteudo = useRef<HTMLDivElement>(null);
  const arrasto = useRef<{ x: number; y: number; vx: number; vy: number } | null>(null);

  const pessoas = useMemo(() => data.pessoas.map((p) => ({ ...p, ...(rascunho[p.id] ?? {}) })), [data.pessoas, rascunho]);
  const visiveis = pessoas.filter((p) => !p.oculto);
  const termo = busca.trim().toLowerCase();
  const porArea = useMemo(() => {
    const m = new Map<Area, PessoaOrganograma[]>();
    for (const a of AREAS) m.set(a, []);
    for (const p of visiveis) m.get(p.area)!.push(p);
    for (const l of m.values()) l.sort((a, b) => NIVEIS.indexOf(a.nivel) - NIVEIS.indexOf(b.nivel) || a.nome.localeCompare(b.nome, "pt-BR"));
    return m;
  }, [visiveis]);
  const niveis = NIVEIS.map((n) => ({ n, q: visiveis.filter((p) => p.nivel === n).length })).filter((x) => x.q);
  const maxNivel = Math.max(1, ...niveis.map((x) => x.q));
  const deps = new Set(visiveis.map((p) => p.departamento).filter(Boolean)).size;
  const sel = pessoas.find((p) => p.id === selecionado) ?? null;
  const ocultos = pessoas.filter((p) => p.oculto && (!termo || p.nome.toLowerCase().includes(termo)));

  const ajustar = useCallback(() => {
    const b = box.current?.getBoundingClientRect(), c = conteudo.current;
    if (!b || !c) return;
    const z = Math.min(1.2, Math.max(0.15, Math.min((b.width - 48) / c.scrollWidth, (b.height - 48) / c.scrollHeight)));
    setView({ z, x: (b.width - c.scrollWidth * z) / 2, y: 24 });
  }, []);
  useEffect(() => { ajustar(); }, [ajustar]);

  const zoomEm = (next: number, px: number, py: number) => {
    const v = viewRef.current, z = Math.min(2, Math.max(0.15, next)), k = z / v.z;
    setView({ z, x: px - (px - v.x) * k, y: py - (py - v.y) * k });
  };
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      if (e.ctrlKey || e.metaKey) {
        const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1);
        zoomEm(viewRef.current.z * Math.exp(-dy * 0.002), e.clientX - r.left, e.clientY - r.top);
      } else setView((v) => ({ ...v, x: v.x - e.deltaX, y: v.y - e.deltaY }));
    };
    const onKey = (e: KeyboardEvent) => { if (e.shiftKey && e.code === "Digit1") ajustar(); };
    el.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKey);
    return () => { el.removeEventListener("wheel", onWheel); window.removeEventListener("keydown", onKey); };
  }, [ajustar]);
  const zoomBotao = (f: number) => { const r = box.current!.getBoundingClientRect(); zoomEm(view.z * f, r.width / 2, r.height / 2); };

  const mudar = (p: PessoaOrganograma, d: Partial<Ajuste>) => setRascunho((r) => ({ ...r, [p.id]: { area: p.area, oculto: p.oculto, ...r[p.id], ...d } }));
  const gravar = async () => {
    setSalvando(true);
    try {
      await salvar({ data: { ajustes: Object.entries(rascunho).map(([usuario_id, a]) => ({ usuario_id, ...a })) } });
      await qc.invalidateQueries({ queryKey: ["organograma"] });
      setRascunho({});
      setEditando(false);
      toast.success("Organograma salvo.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível salvar.");
    } finally { setSalvando(false); }
  };

  const Cartao = ({ p }: { p: PessoaOrganograma }) => {
    const destaque = termo && p.nome.toLowerCase().includes(termo);
    return (
      <div
        onPointerDown={(e) => e.stopPropagation()}
        onClick={() => setSelecionado(p.id)}
        className={cn("flex w-full cursor-pointer items-center gap-2 rounded-lg border bg-card p-2 text-left shadow-sm transition hover:border-primary",
          selecionado === p.id && "border-primary ring-2 ring-primary/30", destaque && "ring-2 ring-accent", termo && !destaque && "opacity-40")}
      >
        <Foto id={p.id} nome={p.nome} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{p.nome}</p>
          <p className="truncate text-xs text-muted-foreground">{p.cargo ?? "Sem cargo"}</p>
          {editando && (
            <select value={p.area} onChange={(e) => mudar(p, { area: e.target.value as Area })} onClick={(e) => e.stopPropagation()} className="mt-1 w-full rounded border bg-background px-1 py-0.5 text-xs" aria-label={`Área de ${p.nome}`}>
              {AREAS.map((a) => <option key={a}>{a}</option>)}
            </select>
          )}
        </div>
        {editando && (
          <button type="button" onClick={(e) => { e.stopPropagation(); mudar(p, { oculto: true }); }} className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-primary" aria-label={`Remover ${p.nome}`}><EyeOff className="h-4 w-4" /></button>
        )}
      </div>
    );
  };

  const diretoria = porArea.get("Diretoria")!;
  const areas = AREAS.filter((a) => a !== "Diretoria" && porArea.get(a)!.length);

  return (
    <main className="flex h-[calc(100vh-4rem)] min-h-[520px] flex-col px-4 py-4 sm:px-6">
      <header className="mb-3 flex flex-wrap items-center gap-3">
        <h1 className="mr-auto text-2xl font-bold text-foreground">Organograma</h1>
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar profissional" className="w-56 pl-8" />
        </div>
        {data.podeEditar && (editando ? (
          <>
            <Button variant="outline" onClick={() => { setRascunho({}); setEditando(false); }}><X className="h-4 w-4" />Cancelar</Button>
            <Button onClick={gravar} disabled={salvando || !Object.keys(rascunho).length}><Save className="h-4 w-4" />{salvando ? "Salvando…" : "Salvar alterações"}</Button>
          </>
        ) : (
          <Button variant="outline" onClick={() => setEditando(true)}><Pencil className="h-4 w-4" />Modo de edição</Button>
        ))}
      </header>
      {data.erro && <p className="mb-2 text-sm text-destructive">{data.erro}</p>}
      <div className="flex min-h-0 flex-1 gap-4">
        <div
          ref={box}
          className={cn("relative min-w-0 flex-1 cursor-grab touch-none overflow-hidden rounded-xl border active:cursor-grabbing", editando ? "org-canvas-edicao" : "bg-muted/40")}
          onPointerDown={(e) => { arrasto.current = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y }; (e.target as HTMLElement).setPointerCapture?.(e.pointerId); }}
          onPointerMove={(e) => { const a = arrasto.current; if (a) setView((v) => ({ ...v, x: a.vx + e.clientX - a.x, y: a.vy + e.clientY - a.y })); }}
          onPointerUp={() => { arrasto.current = null; }}
        >
          <div ref={conteudo} className="absolute left-0 top-0 w-max" style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.z})`, transformOrigin: "0 0" }}>
            <div className="flex flex-col items-center">
              <section className="w-[520px] rounded-xl border-2 border-sidebar bg-card p-3">
                <h2 className="mb-2 rounded-md bg-sidebar px-3 py-1.5 text-center text-sm font-bold uppercase tracking-wide text-sidebar-foreground">Diretoria</h2>
                <div className="grid grid-cols-2 gap-2">{diretoria.map((p) => <Cartao key={p.id} p={p} />)}</div>
              </section>
              <div className="h-8 w-0.5 bg-primary" />
              <div className="flex gap-6 border-t-2 border-primary pt-0">
                {areas.map((a) => (
                  <div key={a} className="flex flex-col items-center">
                    <div className="h-6 w-0.5 bg-primary" />
                    <section className="w-64 rounded-xl border bg-card/95 p-3 shadow-sm">
                      <h2 className="mb-2 rounded-md bg-sidebar px-3 py-1.5 text-center text-xs font-bold uppercase tracking-wide text-sidebar-foreground">{a} <span className="font-normal opacity-80">({porArea.get(a)!.length})</span></h2>
                      <div className="space-y-1.5">{porArea.get(a)!.map((p) => <Cartao key={p.id} p={p} />)}</div>
                    </section>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="absolute bottom-3 right-3 flex items-center gap-1 rounded-lg border bg-card p-1 shadow" onPointerDown={(e) => e.stopPropagation()}>
            <Button size="icon" variant="ghost" onClick={() => zoomBotao(1 / 1.2)} aria-label="Diminuir zoom"><Minus className="h-4 w-4" /></Button>
            <span className="w-12 text-center text-xs tabular-nums">{Math.round(view.z * 100)}%</span>
            <Button size="icon" variant="ghost" onClick={() => zoomBotao(1.2)} aria-label="Aumentar zoom"><Plus className="h-4 w-4" /></Button>
            <Button size="sm" variant="ghost" onClick={ajustar}><Maximize className="h-4 w-4" />Ajustar</Button>
          </div>
          <p className="pointer-events-none absolute bottom-4 left-3 hidden text-xs text-muted-foreground md:block">Arraste para mover · Ctrl + roda (ou pinça) para zoom · Shift+1 ajusta à tela</p>
        </div>
        <aside className="hidden w-72 shrink-0 overflow-y-auto rounded-xl border bg-card p-4 lg:block">
          {sel ? (
            <div>
              <button type="button" onClick={() => setSelecionado(null)} className="mb-3 text-xs text-accent hover:underline">← Detalhes gerais</button>
              <div className="flex flex-col items-center text-center">
                <Foto id={sel.id} nome={sel.nome} size={80} />
                <p className="mt-2 font-bold text-foreground">{sel.nome}</p>
                <p className="text-sm text-muted-foreground">{sel.cargo ?? "Sem cargo"}</p>
              </div>
              <dl className="mt-4 space-y-2 text-sm">
                <div><dt className="text-xs text-muted-foreground">Área</dt><dd>{sel.area}</dd></div>
                <div><dt className="text-xs text-muted-foreground">Departamento</dt><dd>{sel.departamento ?? "-"}</dd></div>
                <div><dt className="text-xs text-muted-foreground">Nível</dt><dd>{sel.nivel}</dd></div>
              </dl>
              <Button asChild className="mt-4 w-full" variant="outline"><Link to="/perfil/$id" params={{ id: sel.id }}>Ver perfil</Link></Button>
            </div>
          ) : (
            <div>
              <h2 className="font-bold text-foreground">Organograma Cronos</h2>
              <div className="mt-3 grid grid-cols-2 gap-2 text-center">
                <div className="rounded-lg bg-muted p-2"><p className="text-xl font-bold text-primary">{visiveis.length}</p><p className="text-xs text-muted-foreground">profissionais ativos</p></div>
                <div className="rounded-lg bg-muted p-2"><p className="text-xl font-bold text-primary">{deps}</p><p className="text-xs text-muted-foreground">departamentos</p></div>
              </div>
              <h3 className="mt-4 text-xs font-bold uppercase text-accent">Por nível</h3>
              <ul className="mt-2 space-y-1.5">
                {niveis.map(({ n, q }) => (
                  <li key={n} className="text-xs">
                    <div className="flex justify-between"><span>{n}</span><span className="font-semibold">{q}</span></div>
                    <div className="mt-0.5 h-1.5 rounded bg-muted"><div className="h-full rounded bg-primary" style={{ width: `${(q / maxNivel) * 100}%` }} /></div>
                  </li>
                ))}
              </ul>
              {editando && (
                <>
                  <h3 className="mt-5 text-xs font-bold uppercase text-accent">Fora do organograma ({ocultos.length})</h3>
                  <p className="text-xs text-muted-foreground">Clique para adicionar de volta.</p>
                  <ul className="mt-2 space-y-1">
                    {ocultos.map((p) => (
                      <li key={p.id}><button type="button" onClick={() => mudar(p, { oculto: false })} className="flex w-full items-center gap-2 rounded px-2 py-1 text-left text-sm hover:bg-muted"><Eye className="h-3.5 w-3.5 text-accent" /><span className="truncate">{p.nome}</span></button></li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}
        </aside>
      </div>
    </main>
  );
}
