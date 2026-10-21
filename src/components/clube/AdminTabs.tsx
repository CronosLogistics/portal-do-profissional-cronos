import { Link } from "@tanstack/react-router";

const tabs = [
  { to: "/admin/pagina-inicial", label: "Textos do site" },
  { to: "/admin", label: "Parceiros" },
  { to: "/admin/beneficios", label: "Benefícios" },
  { to: "/admin/recompensas", label: "Programas de Recompensas" },
  { to: "/admin/cadastros", label: "Cadastros" },
] as const;

export function AdminTabs() {
  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map((tab) => (
        <Link
          key={tab.to}
          to={tab.to}
          activeOptions={{ exact: true }}
          activeProps={{ className: "border-primary/60 text-foreground" }}
          className="rounded-full border border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:border-primary/60 hover:text-foreground"
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
