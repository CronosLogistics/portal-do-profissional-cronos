import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Award, BarChart3, CalendarDays, ListChecks, MessageSquareHeart, Building2, ClipboardList, FolderOpen, PartyPopper, ChevronLeft, ChevronRight, Gift, GraduationCap, Home, LogOut, Megaphone, Menu, Settings, Tag, X } from "lucide-react";
import { TourBoasVindas } from "@/components/portal/TourBoasVindas";
import { AvisosBell } from "@/components/avisos/AvisosBell";
import { useAvisosAoVivo, useNaoLidos } from "@/hooks/useAvisos";
import { useAlertaPendenciasLogin, useTotalPendencias } from "@/hooks/usePendencias";
import { useQuestionariosPendentes } from "@/hooks/useQuestionarios";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useCurrentUser, useSignOut } from "@/hooks/useAuth";
import { principalNav, visibleModules, type PortalModule, type PortalNavGroup } from "@/lib/portal-modules";
import { useOffice } from "@/components/clube/OfficeContext";
import logo from "@/assets/cronos-full-logo.png.asset.json";

function ContadorNav({ valor }: { valor: number }) {
  if (valor <= 0) return null;
  return <span className="portal-count-badge portal-nav-badge">{valor > 99 ? "99+" : valor}</span>;
}

const moduleIcons: Record<PortalModule["to"], LucideIcon> = {
  "/avisos": Megaphone,
  "/ferias": CalendarDays,
  "/mural": PartyPopper,
  "/beneficios": Gift,
  "/parceiros": Tag,
  "/recompensas": Award,
  "/treinamentos": GraduationCap,
  "/formularios": ClipboardList,
  "/formularios-internos": ClipboardList,
  "/documentos": FolderOpen,
  "/feedback": MessageSquareHeart,
  "/feedback-gestor": MessageSquareHeart,
  "/pendencias": ListChecks,
};

const groupIcons: Record<PortalNavGroup, LucideIcon> = { beneficios: Gift, feedbacks: MessageSquareHeart, avisos: Megaphone, formularios: ClipboardList };

type NavTarget = "/" | PortalModule["to"] | "/admin" | "/admin/usuarios";

function matchesPath(pathname: string, to: string) {
  return pathname === to || pathname.startsWith(`${to}/`);
}

function SidebarBranch({
  label,
  icon: Icon,
  parentTo,
  sectionActive,
  parentActive,
  open,
  onOpenChange,
  iconOnly,
  onNavigate,
  badge,
  children,
}: {
  label: string;
  icon: LucideIcon;
  parentTo: NavTarget;
  sectionActive: boolean;
  parentActive: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  iconOnly: boolean;
  onNavigate: () => void;
  badge?: number;
  children: ReactNode;
}) {
  if (iconOnly) {
    return (
      <Button asChild variant="ghost" className={`portal-nav-item ${sectionActive ? "is-active" : ""}`}>
        <Link to={parentTo} title={label} onClick={onNavigate}>
          <Icon />
          <ContadorNav valor={badge ?? 0} />
        </Link>
      </Button>
    );
  }
  const rowActive = parentActive;
  return (
    <div className={`portal-nav-group ${open ? "is-open" : ""}`}>
      <button
        type="button"
        className={`portal-nav-item portal-nav-parent ${rowActive ? "is-active" : ""} ${sectionActive && !rowActive ? "is-current" : ""}`}
        aria-expanded={open}
        onClick={() => onOpenChange(!open)}
      >
        <Icon />
        <span className="sidebar-label">{label}</span>
        <ContadorNav valor={badge ?? 0} />
        <ChevronRight className="portal-nav-chevron-icon" aria-hidden="true" />
      </button>
      <div className="portal-submenu" inert={!open} aria-hidden={!open}>
        <div className="portal-submenu-inner">
          <div className="portal-submenu-content">{children}</div>
        </div>
      </div>
    </div>
  );
}

export function PortalShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openMenus, setOpenMenus] = useState({ beneficios: false, feedbacks: false, avisos: false, formularios: false, admin: false });
  const me = useCurrentUser();
  const navigate = useNavigate();
  const signOut = useSignOut();
  const naoLidos = useNaoLidos().data ?? 0;
  const pesquisasPendentes = useQuestionariosPendentes(me.data?.id).data ?? 0;
  const { total: totalPendencias, pronto: pendenciasProntas } = useTotalPendencias(me.data?.id);
  useAlertaPendenciasLogin(me.data?.id, totalPendencias, pendenciasProntas);
  useAvisosAoVivo(me.data?.id, naoLidos);
  const { office } = useOffice();
  const { pathname } = useLocation();
  const roles = me.data?.roles ?? [];
  const modules = visibleModules(roles);
  const entries = principalNav(roles);
  const iconOnly = collapsed && !mobileOpen;
  const closeMobile = () => setMobileOpen(false);
  const activeModule = modules.find((mod) => matchesPath(pathname, mod.to));
  const title =
    pathname === "/admin/usuarios" || pathname.startsWith("/admin/usuarios/")
      ? "Usuários e acessos"
      : pathname.startsWith("/admin")
        ? "Administração"
        : (activeModule?.label ?? "Início");

  const name = me.data?.fullName || "Profissional";
  const initials = name.split(" ").filter(Boolean).slice(0, 2).map(n => n[0]).join("");
  return (
    <div className={`portal-shell ${collapsed ? "is-collapsed" : ""}`}>
      {mobileOpen && <div className="portal-scrim" onClick={() => setMobileOpen(false)} aria-hidden="true" />}
      <aside className={`portal-sidebar ${mobileOpen ? "is-open" : ""}`} aria-label="Navegação principal">
        <Link to="/" className="portal-brand" aria-label="Portal do Profissional Cronos">
          <img src={logo.url} alt="Cronos Logistics" className="portal-logo" />
          <span className="sidebar-label">Portal do<br /><strong>Profissional</strong></span>
        </Link>
        <Button className="sidebar-mobile-close" variant="ghost" size="icon" onClick={() => setMobileOpen(false)} aria-label="Fechar menu"><X /></Button>
        <div className="portal-nav-heading sidebar-label">PRINCIPAL</div>
        <nav className="portal-nav">
          {entries.map((entry) => {
            if (entry.type === "link") {
              const Icon = entry.to === "/" ? Home : moduleIcons[entry.to];
              const active = entry.to === "/" ? pathname === "/" : matchesPath(pathname, entry.to);
              return (
                <Button asChild variant="ghost" key={entry.to} className={`portal-nav-item ${active ? "is-active" : ""}`}>
                  <Link to={entry.to} title={entry.label} onClick={closeMobile}>
                    <Icon />
                    <span className="sidebar-label">{entry.label}</span>
                    {entry.to === "/avisos" && <ContadorNav valor={naoLidos} />}
                    {entry.to === "/pendencias" && <ContadorNav valor={totalPendencias} />}
                    {entry.to === "/formularios-internos" && <ContadorNav valor={pesquisasPendentes} />}
                  </Link>
                </Button>
              );
            }
            const parent = entry.children[0];
            if (!parent) return null;
            const activeChild = entry.children.find((child) => matchesPath(pathname, child.to));
            return (
              <SidebarBranch
                key={entry.id}
                label={entry.label}
                icon={groupIcons[entry.id]}
                parentTo={parent.to}
                sectionActive={Boolean(activeChild)}
                parentActive={false}
                open={openMenus[entry.id]}
                onOpenChange={(open) => setOpenMenus((state) => ({ ...state, [entry.id]: open }))}
                iconOnly={iconOnly}
                onNavigate={closeMobile}
                badge={entry.id === "formularios" && (iconOnly || !openMenus.formularios) ? pesquisasPendentes : 0}
              >
                {entry.children.map((child) => (
                  <Link
                    key={child.to}
                    to={child.to}
                    className={`portal-subnav ${matchesPath(pathname, child.to) ? "is-active" : ""}`}
                    aria-current={matchesPath(pathname, child.to) ? "page" : undefined}
                    onClick={closeMobile}
                  >
                    <span className="min-w-0">{child.label}</span>
                    {child.to === "/avisos" && <ContadorNav valor={naoLidos} />}
                    {child.to === "/formularios-internos" && <ContadorNav valor={pesquisasPendentes} />}
                  </Link>
                ))}
              </SidebarBranch>
            );
          })}
        </nav>
        {(me.data?.isAdmin || me.data?.can("acessos.relatorios")) && <div className="portal-admin-nav">
          <div className="portal-nav-heading sidebar-label">GESTÃO</div>
          {me.data.isAdmin && (
            <SidebarBranch
              label="Administração"
              icon={Settings}
              parentTo="/admin"
              sectionActive={matchesPath(pathname, "/admin")}
              parentActive={matchesPath(pathname, "/admin") && !matchesPath(pathname, "/admin/usuarios") && !matchesPath(pathname, "/admin/perfis")}
              open={openMenus.admin}
              onOpenChange={(next) => {
                setOpenMenus((state) => ({ ...state, admin: next }));
                if (next && !matchesPath(pathname, "/admin")) {
                  void navigate({ to: "/admin" });
                  closeMobile();
                }
              }}
              iconOnly={iconOnly}
              onNavigate={closeMobile}
            >
              {me.data.can("admin.usuarios") && <Link
                to="/admin/usuarios"
                className={`portal-subnav ${matchesPath(pathname, "/admin/usuarios") ? "is-active" : ""}`}
                aria-current={matchesPath(pathname, "/admin/usuarios") ? "page" : undefined}
                onClick={closeMobile}
              >
                Usuários e acessos
              </Link>}
              {me.data.can("admin.perfis") && <Link
                to="/admin/perfis"
                className={`portal-subnav ${matchesPath(pathname, "/admin/perfis") ? "is-active" : ""}`}
                aria-current={matchesPath(pathname, "/admin/perfis") ? "page" : undefined}
                onClick={closeMobile}
              >
                Perfis
              </Link>}
            </SidebarBranch>
          )}
          {me.data.can("acessos.relatorios") && (
            <Button asChild variant="ghost" className={`portal-nav-item ${matchesPath(pathname, "/relatorios-acessos") ? "is-active" : ""}`}>
              <Link to="/relatorios-acessos" title="Relatórios de acesso" onClick={closeMobile}><BarChart3 /><span className="sidebar-label">Relatórios de acesso</span></Link>
            </Button>
          )}
        </div>}
        <div className="portal-sidebar-bottom">
          <Button variant="ghost" className="portal-collapse" onClick={() => setCollapsed(v => !v)} title={collapsed ? "Expandir menu" : "Recolher menu"} aria-label={collapsed ? "Expandir menu" : "Recolher menu"}>{collapsed ? <ChevronRight /> : <ChevronLeft />}<span className="sidebar-label">Recolher menu</span></Button>
        </div>
      </aside>
      <div className="portal-workspace">
        <header className="portal-topbar">
          <div className="flex min-w-0 items-center gap-3"><Button variant="ghost" size="icon" className="portal-mobile-toggle" onClick={() => setMobileOpen(true)} aria-label="Abrir menu"><Menu /></Button><span className="text-sm text-muted-foreground">{title}</span></div>
          <div className="flex min-w-0 items-center gap-4">
            <span className="hidden items-center gap-2 text-sm text-muted-foreground sm:flex"><Building2 className="size-4" /><span>{office?.name || "Escritório não identificado"}</span></span>
            <AvisosBell naoLidos={naoLidos} />
            <div className="portal-user"><span className="portal-avatar">{initials}</span><div className="min-w-0"><p className="truncate text-sm font-bold">{name}</p><p className="max-w-48 truncate text-xs text-muted-foreground" title={me.data?.departamento ?? me.data?.email}>{me.data?.departamento ?? me.data?.email}</p></div></div>
            <Button variant="ghost" size="sm" onClick={() => void signOut()} title="Sair do portal"><LogOut className="size-4" /><span className="hidden sm:inline">Sair</span></Button>
          </div>
        </header>
        <div className="portal-canvas">
          {me.isError && <div role="alert" className="mb-4 flex flex-wrap items-center gap-3 border border-destructive p-4 text-sm text-destructive">
            <span>{me.error.message}</span><Button variant="outline" size="sm" onClick={() => void me.refetch()}>Tentar novamente</Button>
          </div>}
          {children}
        </div>
        <TourBoasVindas userId={me.data?.id} />
      </div>
    </div>
  );
}