import { Link, useLocation } from "@tanstack/react-router";
import { useState } from "react";
import { Award, Building2, ChevronLeft, ChevronRight, Gift, GraduationCap, Home, LogOut, Menu, Settings, Tag, X } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useCurrentUser, useSignOut } from "@/hooks/useAuth";
import { visibleModules } from "@/lib/portal-modules";
import { useOffice } from "@/components/clube/OfficeContext";
import logo from "@/assets/cronos-full-logo.png.asset.json";

const icons = { "/beneficios": Gift, "/parceiros": Tag, "/recompensas": Award, "/treinamentos": GraduationCap };

export function PortalShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const me = useCurrentUser();
  const signOut = useSignOut();
  const { office, openPicker } = useOffice();
  const { pathname } = useLocation();
  const modules = visibleModules(me.data?.roles ?? []);
  const items = [{ to: "/" as const, label: "Início", icon: Home }, ...modules.map(m => ({ ...m, icon: icons[m.to] }))];
  const title = pathname.startsWith("/admin") ? "Administração" : items.find(i => i.to !== "/" && pathname.startsWith(i.to))?.label ?? "Início";
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
          {items.map(item => <Button asChild variant="ghost" key={item.to} className={`portal-nav-item ${pathname === item.to || (item.to !== "/" && pathname.startsWith(item.to)) ? "is-active" : ""}`}>
            <Link to={item.to} title={item.label} onClick={() => setMobileOpen(false)}><item.icon /><span className="sidebar-label">{item.label}</span></Link>
          </Button>)}
        </nav>
        {me.data?.isEditor && <div className="portal-admin-nav">
          <div className="portal-nav-heading sidebar-label">GESTÃO</div>
          <Button asChild variant="ghost" className={`portal-nav-item ${pathname.startsWith("/admin") ? "is-active" : ""}`}><Link to="/admin" title="Administração" onClick={() => setMobileOpen(false)}><Settings /><span className="sidebar-label">Administração</span></Link></Button>
          {me.data.isAdmin && !collapsed && <Link to="/admin/usuarios" className={`portal-subnav ${pathname === "/admin/usuarios" ? "is-selected" : ""}`} onClick={() => setMobileOpen(false)}>Usuários e acessos</Link>}
        </div>}
        <div className="portal-sidebar-bottom">
          <Button variant="ghost" className="portal-nav-item" onClick={() => void signOut()} title="Sair"><LogOut /><span className="sidebar-label">Sair</span></Button>
          <Button variant="ghost" className="portal-collapse" onClick={() => setCollapsed(v => !v)} title={collapsed ? "Expandir menu" : "Recolher menu"} aria-label={collapsed ? "Expandir menu" : "Recolher menu"}>{collapsed ? <ChevronRight /> : <ChevronLeft />}<span className="sidebar-label">Recolher menu</span></Button>
        </div>
      </aside>
      <div className="portal-workspace">
        <header className="portal-topbar">
          <div className="flex min-w-0 items-center gap-3"><Button variant="ghost" size="icon" className="portal-mobile-toggle" onClick={() => setMobileOpen(true)} aria-label="Abrir menu"><Menu /></Button><span className="text-sm text-muted-foreground">{title}</span></div>
          <div className="flex min-w-0 items-center gap-4">
            <Button variant="ghost" size="sm" onClick={openPicker} title="Trocar escritório" className="hidden text-muted-foreground sm:flex"><Building2 /><span>{office?.name || "Escritório"}</span></Button>
            <div className="portal-user"><span className="portal-avatar">{initials}</span><div className="min-w-0"><p className="truncate text-sm font-bold">{name}</p><p className="max-w-48 truncate text-xs text-muted-foreground">{me.data?.email}</p></div></div>
          </div>
        </header>
        <div className="portal-canvas">{children}</div>
      </div>
    </div>
  );
}