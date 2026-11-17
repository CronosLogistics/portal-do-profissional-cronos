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
        <h2 className="text-base font-bold text-white sm:text-lg">{titulo}</h2>
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
          badge.bloqueada ? "bg-white/5 text-white/40" : "bg-[var(--perfil-accent)]/15 text-[var(--perfil-accent)]",
        )}
      >
        {badge.bloqueada ? <Lock className="size-5" /> : <Icon className="size-5" />}
      </span>
      <span className="mt-3 block text-sm font-semibold text-white">{badge.titulo}</span>
      <span className="mt-1 block text-xs text-white/55">{badge.descricao}</span>
    </button>
  );
}

export function PerfilProfissional() {
  const me = useCurrentUser();
  const { office } = useOffice();
  const demo = PERFIL_DEMO;

  const nome = me.data?.fullName || "Maria Gerotti";
  const email = me.data?.email || "maria.gerotti@cronoslogistics.com.br";
  const area = me.data?.departamento || demo.area;
  const unidade = office?.name || demo.unidade;
  const iniciais = iniciaisDe(nome) || "MG";

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
      <article className="perfil-card overflow-hidden p-0">
        <div className="perfil-cover" aria-hidden="true" />
        <div className="relative px-5 pb-5 pt-0 sm:px-8 sm:pb-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-5">
              <div className="perfil-avatar-wrap -mt-12 sm:-mt-14">
                <span className="perfil-avatar-lg" aria-hidden="true">
                  {iniciais}
                </span>
                <span className="perfil-avatar-badge" title="Badge em destaque">
                  <Award className="size-3.5" />
                </span>
              </div>
              <div className="min-w-0 pb-1">
                <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">{nome}</h1>
                <p className="mt-1 text-sm text-white/75 sm:text-base">
                  {demo.cargo} · {area}
                </p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-white/65">
                  <span className="perfil-meta-pill">
                    <MapPin className="size-3.5" />
                    {unidade}
                  </span>
                  <span className="perfil-meta-pill">
                    <CalendarDays className="size-3.5" />
                    Na Cronos desde {demo.desde}
                  </span>
                  <span className="perfil-meta-pill">
                    <UserRound className="size-3.5" />
                    Gestor: {demo.gestor}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 sm:pb-1">
              <Button
                type="button"
                variant="outline"
                className="border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white"
                onClick={() => void copiarLink()}
              >
                <Copy />
                Copiar link
              </Button>
              <Button
                type="button"
                className="bg-[var(--perfil-accent)] text-white hover:bg-[var(--perfil-accent)]/90"
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
              { label: "Elogios recebidos", valor: demo.stats.elogios },
              { label: "Treinamentos concluídos", valor: demo.stats.treinamentos },
              { label: "Certificados", valor: demo.stats.certificados },
            ].map((item) => (
              <div key={item.label} className="perfil-stat">
                <dt className="text-xs text-white/55">{item.label}</dt>
                <dd className="mt-1 text-xl font-bold text-white">{item.valor}</dd>
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
                  className="bg-[var(--perfil-accent)] text-white hover:bg-[var(--perfil-accent)]/90"
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
                className="w-full resize-y rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white/90 outline-none focus:border-[var(--perfil-accent)]"
              />
            ) : (
              <p className="text-sm leading-relaxed text-white/70">{sobre}</p>
            )}
          </Secao>

          <Secao
            titulo="Badges e conquistas"
            acao={<span className="text-xs text-white/45">Fixe até {MAX_BADGES_FIXADAS} no topo do perfil</span>}
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
              {demo.elogios.map((elogio) => (
                <li key={elogio.id} className="flex gap-3">
                  <span className="perfil-mini-avatar shrink-0">{elogio.iniciais}</span>
                  <div className="min-w-0">
                    <p className="text-sm text-white/55">
                      <span className="font-semibold text-white">{elogio.autor}</span>
                      {" · "}
                      {elogio.papel}
                      {" · "}
                      {elogio.quando}
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-white/80">{elogio.texto}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Secao>

          <Secao titulo="Treinamentos e certificados">
            <ul className="space-y-3">
              {demo.treinamentos.map((item) => (
                <li key={item.id} className="flex items-start gap-3 rounded-xl border border-white/10 bg-black/15 px-3 py-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-[var(--perfil-accent)]/15 text-[var(--perfil-accent)]">
                    {item.tipo === "certificado" ? <Award className="size-5" /> : <BookOpen className="size-5" />}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white">{item.titulo}</p>
                    <p className="mt-0.5 text-xs text-white/55">{item.detalhe}</p>
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
                <dt className="flex items-center gap-1.5 text-white/45">
                  <Mail className="size-3.5" />
                  E-mail corporativo
                </dt>
                <dd className="mt-1 break-all text-white/90">{email}</dd>
              </div>
              <div>
                <dt className="text-white/45">Área</dt>
                <dd className="mt-1 text-white/90">{area}</dd>
              </div>
              <div>
                <dt className="flex items-center gap-1.5 text-white/45">
                  <Building2 className="size-3.5" />
                  Unidade
                </dt>
                <dd className="mt-1 text-white/90">{unidade}</dd>
              </div>
              {privacidade.mostrarAniversario && (
                <div>
                  <dt className="text-white/45">Aniversário</dt>
                  <dd className="mt-1 text-white/90">{demo.aniversario}</dd>
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
                    className="ml-1 rounded-full p-0.5 text-white/50 hover:bg-white/10 hover:text-white"
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
                className="border-white/15 bg-black/20 text-white placeholder:text-white/35"
              />
              <Button
                type="submit"
                className="shrink-0 bg-[var(--perfil-accent)] text-white hover:bg-[var(--perfil-accent)]/90"
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
                  <span className="text-sm text-white/80">{label}</span>
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
            <p className="mt-4 text-xs leading-relaxed text-white/40">
              Gestores sempre podem ver pendências, feedbacks e elogios da equipe.
            </p>
          </Secao>
        </aside>
      </div>
    </div>
  );
}
