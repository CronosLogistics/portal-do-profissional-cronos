import { useMinhaFoto } from "@/hooks/use-minha-foto";
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
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { meuPerfil } from "@/lib/perfil.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useOffice } from "@/components/clube/OfficeContext";
import { useCurrentUser } from "@/hooks/useAuth";
import {
  iniciaisDe,
  PERFIL_DEMO,
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

export function PerfilProfissional() {
  const me = useCurrentUser();
  const { office } = useOffice();
  const demo = PERFIL_DEMO;

  const buscarPerfil = useServerFn(meuPerfil);
  const dados = useQuery({ queryKey: ["meu-perfil"], queryFn: () => buscarPerfil(), staleTime: 10 * 60_000 });
  const d = dados.data;
  const carregando = dados.isLoading ? "Carregando…" : "Não informado";
  const nome = (me.data?.fullName ?? "").replace(/\s*-\s*Cronos Logistics$/i, "").trim() || "Profissional";
  const email = me.data?.email ?? "";
  const area = d?.departamento || me.data?.departamento || carregando;
  const unidade = d?.escritorio || office?.name || carregando;
  const cargo = d?.cargo || carregando;
  const desde = d?.admissao ? mesAno(d.admissao) : carregando;
  const gestor = d?.gestor || carregando;
  const aniversario = d?.nascimento ? diaMes(d.nascimento) : carregando;
  const iniciais = iniciaisDe(nome) || "?";
  const foto = useMinhaFoto();

  const [badges, setBadges] = useState(demo.badges);
  const [competencias, setCompetencias] = useState(demo.competencias);
  const [novaCompetencia, setNovaCompetencia] = useState("");
  const [privacidade, setPrivacidade] = useState(demo.privacidade);
  const [editandoSobre, setEditandoSobre] = useState(false);
  const [sobre, setSobre] = useState(demo.sobre);

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

  function adicionarCompetencia() {
    const valor = novaCompetencia.trim();
    if (!valor) return;
    if (competencias.some((c) => c.toLowerCase() === valor.toLowerCase())) {
      toast.message("Essa competência já está no perfil.");
      return;
    }
    setCompetencias((lista) => [...lista, valor]);
    setNovaCompetencia("");
  }

  async function copiarLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Link do perfil copiado.");
    } catch {
      toast.error("Não foi possível copiar o link.");
    }
  }

  return (
    <div className="perfil-page mx-auto w-full max-w-6xl px-1 py-6 sm:px-2 sm:py-8">
      {d?.erro && <p className="mb-4 rounded-md border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">{d.erro}</p>}
      <article className="perfil-card overflow-hidden p-0">
        <div className="perfil-cover" aria-hidden="true" />
        <div className="relative px-5 pb-5 pt-0 sm:px-8 sm:pb-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-5">
              <div className="perfil-avatar-wrap -mt-12 sm:-mt-14">
                <span className="perfil-avatar-lg" aria-hidden="true">
                  {foto ? <img src={foto} alt="" className="size-full rounded-full object-cover" /> : iniciais}
                </span>
                <span className="perfil-avatar-badge" title="Badge em destaque">
                  <Award className="size-3.5" />
                </span>
              </div>
              <div className="min-w-0 pb-1">
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
            <div className="flex flex-wrap gap-2 sm:pb-1">
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
                  setEditandoSobre(true);
                  toast.message("Edição local liberada nas seções do perfil.");
                }}
              >
                <Pencil />
                Editar perfil
              </Button>
            </div>
          </div>

          <dl className="perfil-stats mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Badges", valor: demo.stats.badges },
              { label: "Elogios recebidos", valor: d ? d.elogiosTotal : "–" },
              { label: "Treinamentos concluídos", valor: d ? d.treinamentos.filter((t) => t.tipo === "treinamento").length : "–" },
              { label: "Certificados", valor: d ? d.treinamentos.filter((t) => t.tipo === "certificado").length : "–" },
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
          <Secao
            titulo="Sobre mim"
            acao={
              editandoSobre ? (
                <Button
                  type="button"
                  size="sm"
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                  onClick={() => {
                    setEditandoSobre(false);
                    toast.success("Sobre mim atualizado (somente nesta sessão).");
                  }}
                >
                  Salvar
                </Button>
              ) : null
            }
          >
            {editandoSobre ? (
              <textarea
                value={sobre}
                onChange={(e) => setSobre(e.target.value)}
                rows={4}
                className="w-full resize-y rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-foreground/80 outline-none focus:border-[var(--perfil-accent)]"
              />
            ) : (
              <p className="text-sm leading-relaxed text-foreground/80">{sobre}</p>
            )}
          </Secao>

          <Secao
            titulo="Badges e conquistas"
            acao={<span className="text-xs text-muted-foreground">Fixe até {MAX_BADGES_FIXADAS} no topo do perfil</span>}
          >
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

          <Secao
            titulo="Elogios recebidos"
            acao={
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
              {privacidade.mostrarAniversario && (
                <div>
                  <dt className="text-muted-foreground">Aniversário</dt>
                  <dd className="mt-1 text-foreground/80">{aniversario}</dd>
                </div>
              )}
            </dl>
          </Secao>

          <Secao titulo="Competências">
            <div className="flex flex-wrap gap-2">
              {competencias.map((skill) => (
                <span key={skill} className="perfil-skill">
                  {skill}
                  <button
                    type="button"
                    className="ml-1 rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                    aria-label={`Remover ${skill}`}
                    onClick={() => setCompetencias((lista) => lista.filter((c) => c !== skill))}
                  >
                    <X className="size-3" />
                  </button>
                </span>
              ))}
            </div>
            <form
              className="mt-4 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                adicionarCompetencia();
              }}
            >
              <Input
                value={novaCompetencia}
                onChange={(e) => setNovaCompetencia(e.target.value)}
                placeholder="Adicionar competência"
                className="border-border bg-muted/50 text-foreground placeholder:text-muted-foreground"
              />
              <Button
                type="submit"
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
                    onCheckedChange={(checked) =>
                      setPrivacidade((atual) => ({ ...atual, [chave]: checked }))
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
        </aside>
      </div>
    </div>
  );
}
