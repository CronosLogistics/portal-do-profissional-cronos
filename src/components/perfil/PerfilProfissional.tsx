import { useFotoProfissional, useMinhaFoto } from "@/hooks/use-minha-foto";
import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  Award,
  BookOpen,
  Building2,
  Cake,
  CalendarDays,
  Copy,
  Heart,
  Lock,
  Mail,
  MapPin,
  Pencil,
  Plus,
  Rocket,
  Trophy,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { meuPerfil, perfilColega } from "@/lib/perfil.functions";
import { minhasCompetencias, salvarCompetencias } from "@/lib/competencias.functions";
import { PRIVACIDADE_PADRAO, salvarPrivacidade, type PrivacidadePerfil } from "@/lib/privacidade.functions";
import { salvarSobre } from "@/lib/sobre.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useOffice } from "@/components/clube/OfficeContext";
import { useCurrentUser } from "@/hooks/useAuth";
import {
  iniciaisDe,
  type PerfilBadge,
} from "@/lib/perfil.mock";
import { cn } from "@/lib/utils";

const MAX_BADGES_FIXADAS = 3;
const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const mesAno = (iso: string) => { const [a, m] = iso.split("-"); return `${MESES[Number(m) - 1]?.slice(0, 3)}/${a}`; };
const diaMes = (iso: string) => { const [, m, dd] = iso.split("-"); return `${Number(dd)} de ${MESES[Number(m) - 1]}`; };
const dataCurta = (iso: string | null) => (iso ? iso.slice(0, 10).split("-").reverse().join("/") : "");

const iconesBadge = {
  rocket: Rocket,
  heart: Heart,
  book: BookOpen,
  cake: Cake,
  users: Users,
  trophy: Trophy,
} as const;

function Secao({
  titulo,
  acao,
  children,
  className,
}: {
  titulo: string;
  acao?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("perfil-card", className)}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <h2 className="text-base font-bold text-foreground sm:text-lg">{titulo}</h2>
        {acao}
      </div>
      {children}
    </section>
  );
}

function BadgeCard({
  badge,
  onToggleFixar,
}: {
  badge: PerfilBadge;
  onToggleFixar: (id: string) => void;
}) {
  const Icon = iconesBadge[badge.icone];
  return (
    <button
      type="button"
      disabled={badge.bloqueada}
      onClick={() => onToggleFixar(badge.id)}
      className={cn(
        "perfil-badge-tile group text-left transition",
        badge.bloqueada && "opacity-45",
        badge.fixada && "ring-1 ring-[var(--perfil-accent)]/50",
      )}
      title={
        badge.bloqueada
          ? "Conquista ainda bloqueada"
          : badge.fixada
            ? "Remover do topo"
            : "Fixar no topo do perfil"
      }
    >
      <span
        className={cn(
          "perfil-badge-icon",
          badge.bloqueada ? "bg-muted text-muted-foreground" : "bg-[var(--perfil-accent)]/15 text-[var(--perfil-accent)]",
        )}
      >
        {badge.bloqueada ? <Lock className="size-5" /> : <Icon className="size-5" />}
      </span>
      <span className="mt-3 block text-sm font-semibold text-foreground">{badge.titulo}</span>
      <span className="mt-1 block text-xs text-muted-foreground">{badge.descricao}</span>
    </button>
  );
}

export function PerfilProfissional({ usuarioId }: { usuarioId?: string } = {}) {
  const me = useCurrentUser();
  const { office } = useOffice();
  // Perfil de colega: somente leitura, dados oficiais vindos do servidor.
  const colega = !!usuarioId && !!me.data && usuarioId !== me.data.id;
  const proprio = !usuarioId || (!!me.data && usuarioId === me.data.id);

  const buscarPerfil = useServerFn(meuPerfil);
  const buscarColega = useServerFn(perfilColega);
  const dadosMeus = useQuery({ queryKey: ["meu-perfil"], queryFn: () => buscarPerfil(), staleTime: 10 * 60_000, enabled: proprio });
  const dadosColega = useQuery({ queryKey: ["perfil-colega", usuarioId], queryFn: () => buscarColega({ data: { userId: usuarioId! } }), staleTime: 10 * 60_000, enabled: colega });
  const dados = colega ? dadosColega : dadosMeus;
  const d = dados.data;
  const dc = colega ? dadosColega.data : undefined;
  const carregando = dados.isLoading || !me.data ? "Carregando…" : "Não informado";
  const nome = (colega ? dc?.nome ?? "" : (me.data?.fullName ?? "").replace(/\s*-\s*Cronos Logistics$/i, "").trim()) || (colega && dados.isLoading ? "Carregando…" : "Profissional");
  const email = colega ? dc?.email ?? "" : me.data?.email ?? "";
  const area = d?.departamento || (colega ? null : me.data?.departamento) || carregando;
  const unidade = d?.escritorio || (colega ? null : office?.name) || carregando;
  const cargo = d?.cargo || carregando;
  const desde = d?.admissao ? mesAno(d.admissao) : carregando;
  const gestor = d?.gestor || carregando;
  const aniversario = d?.nascimento ? diaMes(d.nascimento) : carregando;
  const iniciais = iniciaisDe(nome) || "?";
  const minhaFoto = useMinhaFoto();
  const fotoColega = useFotoProfissional(colega ? usuarioId : null);
  const foto = colega ? fotoColega : minhaFoto;

  const [badges, setBadges] = useState<PerfilBadge[]>([]);
  const queryClient = useQueryClient();
  const carregarCompetencias = useServerFn(minhasCompetencias);
  const salvarCompetenciasFn = useServerFn(salvarCompetencias);
  const competenciasKey = ["minhas-competencias", me.data?.id];
  const competenciasQuery = useQuery({
    queryKey: competenciasKey,
    queryFn: () => carregarCompetencias(),
    enabled: proprio && !!me.data,
  });
  const competencias = competenciasQuery.data ?? [];
  const gravarCompetencias = useMutation({
    mutationFn: (lista: string[]) => salvarCompetenciasFn({ data: { competencias: lista } }),
    onSuccess: (lista) => queryClient.setQueryData(competenciasKey, lista),
    onError: () => toast.error("Não foi possível salvar suas competências. Tente novamente."),
  });
  const competenciasIndisponiveis = !competenciasQuery.isSuccess || gravarCompetencias.isPending;
  const [novaCompetencia, setNovaCompetencia] = useState("");
  const privacidade = d?.privacidade ?? PRIVACIDADE_PADRAO;
  const [editandoSobre, setEditandoSobre] = useState(false);
  const [rascunhoSobre, setRascunhoSobre] = useState("");
  const sobrePlaceholder = "Insira aqui informações sobre você...";
  const sobreSalvo = d?.sobre ?? "";
  const sobreVisivel = sobreSalvo.trim();
  const salvarSobreFn = useServerFn(salvarSobre);
  const gravarSobre = useMutation({
    mutationFn: (texto: string) => salvarSobreFn({ data: { texto } }),
    onSuccess: (texto) => {
      queryClient.setQueryData(["meu-perfil"], (atual: typeof d) => (atual ? { ...atual, sobre: texto } : atual));
      setEditandoSobre(false);
      toast.success("Sobre mim atualizado.");
    },
    onError: () => toast.error("Não foi possível salvar o Sobre mim. Tente novamente."),
  });
  const salvarPrivacidadeFn = useServerFn(salvarPrivacidade);
  const gravarPrivacidade = useMutation({
    mutationFn: (prefs: PrivacidadePerfil) => salvarPrivacidadeFn({ data: prefs }),
    onMutate: async (prefs) => {
      await queryClient.cancelQueries({ queryKey: ["meu-perfil"] });
      const anterior = queryClient.getQueryData<typeof d>(["meu-perfil"]);
      queryClient.setQueryData(["meu-perfil"], (atual: typeof d) => (atual ? { ...atual, privacidade: prefs } : atual));
      return { anterior };
    },
    onError: (_err, _prefs, ctx) => {
      if (ctx?.anterior !== undefined) queryClient.setQueryData(["meu-perfil"], ctx.anterior);
      toast.error("Não foi possível salvar suas preferências de privacidade. Tente novamente.");
    },
    onSuccess: (prefs) => {
      queryClient.setQueryData(["meu-perfil"], (atual: typeof d) => (atual ? { ...atual, privacidade: prefs } : atual));
    },
  });

  const fixadas = badges.filter((b) => b.fixada && !b.bloqueada);

  function alternarFixar(id: string) {
    setBadges((atual) => {
      const alvo = atual.find((b) => b.id === id);
      if (!alvo || alvo.bloqueada) return atual;
      if (alvo.fixada) {
        return atual.map((b) =>
          b.id === id ? { ...b, fixada: false, descricao: b.descricao.replace(/^Fixada · /, "") } : b,
        );
      }
      const qtd = atual.filter((b) => b.fixada && !b.bloqueada).length;
      if (qtd >= MAX_BADGES_FIXADAS) {
        toast.message(`Você pode fixar até ${MAX_BADGES_FIXADAS} badges no topo.`);
        return atual;
      }
      return atual.map((b) =>
        b.id === id
          ? {
              ...b,
              fixada: true,
              descricao: b.descricao.startsWith("Fixada") ? b.descricao : `Fixada · ${b.descricao}`,
            }
          : b,
      );
    });
  }

  async function adicionarCompetencia() {
    const valor = novaCompetencia.trim();
    if (!valor || competenciasIndisponiveis) return;
    if (competencias.some((c) => c.toLowerCase() === valor.toLowerCase())) {
      toast.message("Essa competência já está no perfil.");
      return;
    }
    try {
      await gravarCompetencias.mutateAsync([...competencias, valor]);
      setNovaCompetencia("");
    } catch {
      // Mantém o texto digitado para tentar novamente.
    }
  }

  async function copiarLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Link do perfil copiado.");
    } catch {
      toast.error("Não foi possível copiar o link.");
    }
  }

  if (colega && dc && !dc.encontrado) {
    return <p className="mx-auto max-w-6xl px-2 py-8 text-sm text-muted-foreground">Este perfil não está disponível. <Link to="/perfil" className="font-semibold text-accent hover:underline">Ver meu perfil</Link></p>;
  }

  return (
    <div className="perfil-page mx-auto w-full max-w-6xl px-1 py-6 sm:px-2 sm:py-8">
      {d?.erro && <p className="mb-4 rounded-md border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">{d.erro}</p>}
      <article className="perfil-card overflow-hidden p-0">
        <div className="perfil-cover" aria-hidden="true" />
        <div className="relative px-5 pb-5 pt-4 sm:px-8 sm:pb-6 sm:pt-5">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-5">
              <div className="perfil-avatar-wrap shrink-0">
                <span className="perfil-avatar-lg" aria-hidden="true">
                  {foto ? <img src={foto} alt="" className="size-full rounded-full object-cover" /> : iniciais}
                </span>
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">{nome}</h1>
                <p className="mt-1 text-sm text-foreground/80 sm:text-base">
                  {cargo} · {area}
                </p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-foreground/80">
                  <span className="perfil-meta-pill">
                    <MapPin className="size-3.5" />
                    {unidade}
                  </span>
                  <span className="perfil-meta-pill">
                    <CalendarDays className="size-3.5" />
                    Na Cronos desde {desde}
                  </span>
                  <span className="perfil-meta-pill">
                    <UserRound className="size-3.5" />
                    Gestor: {gestor}
                  </span>
                </div>
              </div>
            </div>
            {!colega && <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                
                onClick={() => void copiarLink()}
              >
                <Copy />
                Copiar link
              </Button>
              <Button
                type="button"
                className="bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={() => {
                  setRascunhoSobre(sobreSalvo);
                  setEditandoSobre(true);
                }}
              >
                <Pencil />
                Editar perfil
              </Button>
            </div>}
          </div>

          <dl className={`perfil-stats mt-6 grid grid-cols-2 gap-3 ${d?.pontos != null ? "sm:grid-cols-5" : "sm:grid-cols-4"}`}>
            {[
              { label: "Badges", valor: badges.length },
              { label: "Elogios recebidos", valor: d ? d.elogiosTotal : "–" },
              { label: "Treinamentos concluídos", valor: d ? d.treinamentos.filter((t) => t.tipo === "treinamento").length : "–" },
              { label: "Certificados", valor: d ? d.treinamentos.filter((t) => t.tipo === "certificado").length : "–" },
              ...(d?.pontos != null ? [{ label: "Pontos em treinamentos", valor: `${d.pontos} pts` }] : []),
            ].map((item) => (
              <div key={item.label} className="perfil-stat">
                <dt className="text-xs text-muted-foreground">{item.label}</dt>
                <dd className="mt-1 text-xl font-bold text-foreground">{item.valor}</dd>
              </div>
            ))}
          </dl>
        </div>
      </article>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(280px,1fr)]">
        <div className="space-y-5">
          {(proprio || !!sobreVisivel) && <Secao
            titulo="Sobre mim"
            acao={
              proprio && editandoSobre ? (
                <Button
                  type="button"
                  size="sm"
                  disabled={gravarSobre.isPending}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                  onClick={() => gravarSobre.mutate(rascunhoSobre)}
                >
                  Salvar
                </Button>
              ) : null
            }
          >
            {proprio && editandoSobre ? (
              <textarea
                value={rascunhoSobre}
                onChange={(e) => setRascunhoSobre(e.target.value)}
                placeholder={sobrePlaceholder}
                maxLength={1000}
                rows={4}
                className="w-full resize-y rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-foreground/80 outline-none placeholder:text-muted-foreground focus:border-[var(--perfil-accent)]"
              />
            ) : (
              <p className={cn("text-sm leading-relaxed", sobreVisivel ? "text-foreground/80" : "text-muted-foreground")}>
                {sobreVisivel || sobrePlaceholder}
              </p>
            )}
          </Secao>}

          {(proprio || privacidade.mostrarBadges) && (
          <Secao
            titulo="Badges e conquistas"
          >
            {badges.length === 0 && <p className="text-sm text-muted-foreground">Nenhum badge por enquanto.</p>}
            {fixadas.length > 0 && (
              <div className="mb-4 grid gap-3 sm:grid-cols-3">
                {fixadas.map((badge) => (
                  <BadgeCard key={`fixada-${badge.id}`} badge={badge} onToggleFixar={alternarFixar} />
                ))}
              </div>
            )}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {badges
                .filter((badge) => !badge.fixada)
                .map((badge) => (
                  <BadgeCard key={badge.id} badge={badge} onToggleFixar={alternarFixar} />
                ))}
            </div>
          </Secao>
          )}

          {(proprio || privacidade.mostrarElogios) && (
          <Secao
            titulo="Elogios recebidos"
            acao={colega ? null :
              <Link to="/feedback" className="text-sm font-semibold text-[var(--perfil-accent)] hover:underline">
                Ver todos
              </Link>
            }
          >
            <ul className="space-y-4">
              {d?.elogios.length === 0 && <li className="text-sm text-muted-foreground">Nenhum elogio recebido ainda.</li>}
              {d?.elogios.map((elogio) => (
                <li key={elogio.id} className="flex gap-3">
                  <span className="perfil-mini-avatar shrink-0">{iniciaisDe(elogio.autor ?? "") || "C"}</span>
                  <div className="min-w-0">
                    <p className="text-sm text-muted-foreground">
                      <span className="font-semibold text-foreground">{elogio.autor ?? "Cronos"}</span>
                      {elogio.data ? ` · ${dataCurta(elogio.data)}` : ""}
                    </p>
                    <p className="mt-1 line-clamp-4 text-sm leading-relaxed text-foreground/80">{elogio.texto}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Secao>
          )}

          <Secao titulo="Treinamentos e certificados">
            {!d?.treinamentos.length && <p className="text-sm text-muted-foreground">{dados.isLoading ? "Carregando…" : "Nenhum treinamento aprovado registrado."}</p>}
            <ul className="space-y-3">
              {(d?.treinamentos ?? []).map((item) => (
                <li key={item.id} className="flex items-start gap-3 rounded-xl border border-border bg-muted/50 px-3 py-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-[var(--perfil-accent)]/15 text-[var(--perfil-accent)]">
                    {item.tipo === "certificado" ? <Award className="size-5" /> : <BookOpen className="size-5" />}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">{item.titulo}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{item.detalhe}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Secao>
        </div>

        <aside className="space-y-5">
          <Secao titulo="Informações">
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="flex items-center gap-1.5 text-muted-foreground">
                  <Mail className="size-3.5" />
                  E-mail corporativo
                </dt>
                <dd className="mt-1 break-all text-foreground/80">{email}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Área</dt>
                <dd className="mt-1 text-foreground/80">{area}</dd>
              </div>
              <div>
                <dt className="flex items-center gap-1.5 text-muted-foreground">
                  <Building2 className="size-3.5" />
                  Unidade
                </dt>
                <dd className="mt-1 text-foreground/80">{unidade}</dd>
              </div>
              {((proprio && privacidade.mostrarAniversario) || (colega && !!d?.nascimento)) && (
                <div>
                  <dt className="text-muted-foreground">Aniversário</dt>
                  <dd className="mt-1 text-foreground/80">{aniversario}</dd>
                </div>
              )}
            </dl>
          </Secao>

          {!colega && <>
          <Secao titulo="Competências">
            {competenciasQuery.isError && <p className="mb-3 text-sm text-destructive">Não foi possível carregar suas competências. <Button variant="link" size="sm" onClick={() => void competenciasQuery.refetch()}>Tentar novamente</Button></p>}
            <div className="flex flex-wrap gap-2">
              {competencias.map((skill) => (
                <span key={skill} className="perfil-skill">
                  {skill}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={competenciasIndisponiveis}
                    className="ml-1 rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                    aria-label={`Remover ${skill}`}
                    onClick={() => gravarCompetencias.mutate(competencias.filter((c) => c !== skill))}
                  >
                    <X className="size-3" />
                  </Button>
                </span>
              ))}
            </div>
            <form
              className="mt-4 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                void adicionarCompetencia();
              }}
            >
              <Input
                value={novaCompetencia}
                disabled={competenciasIndisponiveis}
                onChange={(e) => setNovaCompetencia(e.target.value)}
                placeholder="Adicionar competência"
                className="border-border bg-muted/50 text-foreground placeholder:text-muted-foreground"
              />
              <Button
                type="submit"
                disabled={competenciasIndisponiveis}
                className="shrink-0 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Plus />
                Adicionar
              </Button>
            </form>
          </Secao>

          <Secao titulo="Privacidade">
            <ul className="space-y-4">
              {(
                [
                  ["mostrarBadges", "Mostrar badges para todos"],
                  ["mostrarAniversario", "Mostrar aniversário"],
                  ["mostrarElogios", "Mostrar elogios recebidos"],
                ] as const
              ).map(([chave, label]) => (
                <li key={chave} className="flex items-center justify-between gap-3">
                  <span className="text-sm text-foreground/80">{label}</span>
                  <Switch
                    checked={privacidade[chave]}
                    disabled={!dadosMeus.isSuccess || gravarPrivacidade.isPending}
                    onCheckedChange={(checked) =>
                      gravarPrivacidade.mutate({ ...privacidade, [chave]: checked })
                    }
                    aria-label={label}
                  />
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
              Gestores sempre podem ver pendências, feedbacks e elogios da equipe.
            </p>
          </Secao>
          </>}
        </aside>
      </div>
    </div>
  );
}
