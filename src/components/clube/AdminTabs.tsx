import { Link } from "@tanstack/react-router";

import { useCurrentUser } from "@/hooks/useAuth";

const tabs = [
  { to: "/admin/pagina-inicial", label: "Textos do portal" },
  { to: "/admin", label: "Parceiros" },
  { to: "/admin/beneficios", label: "Benefícios" },
  { to: "/admin/recompensas", label: "Programas de Recompensas" },
  { to: "/admin/cadastros", label: "Cadastros" },
] as const;

const tabClass =
  "rounded-md border border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:border-primary/60 hover:text-foreground";
const activeClass = { className: "border-primary bg-primary/10 text-secondary" };

export function AdminTabs() {
  const me = useCurrentUser();
  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map((tab) => (
        <Link key={tab.to} to={tab.to} activeOptions={{ exact: tab.to === "/admin" }} activeProps={activeClass} className={tabClass}>
          {tab.label}
        </Link>
      ))}
      {me.data?.isAdmin && (
        <Link to="/admin/usuarios" activeProps={activeClass} className={tabClass}>Usuários</Link>
      )}
    </div>
  );
}
