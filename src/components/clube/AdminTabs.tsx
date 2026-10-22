import { Link } from "@tanstack/react-router";

import { useCurrentUser } from "@/hooks/useAuth";

const tabs = [
  { to: "/admin/pagina-inicial", label: "Textos do portal" },
  { to: "/admin", label: "Parceiros" },
  { to: "/admin/beneficios", label: "Benefícios" },
  { to: "/admin/recompensas", label: "Programas de Recompensas" },
  { to: "/admin/cadastros", label: "Cadastros" },
] as const;

export function AdminTabs() {
  const me = useCurrentUser();
  const all = me.data?.isAdmin ? [...tabs, { to: "/admin/usuarios", label: "Usuários" } as const] : tabs;
  return (
    <div className="grid gap-3">
    <p className="rounded-md border border-primary/40 bg-primary/5 px-4 py-3 text-sm text-foreground">
      Benefícios, parceiros, recompensas e textos exibidos no portal vêm do painel atual do Espaço do Profissional.
      Para alterá-los, use{" "}
      <a href="https://espacodoprofissionalcronos.lovable.app/admin" target="_blank" rel="noreferrer" className="font-semibold text-accent underline">
        o painel atual
      </a>
      .
    </p>
    <div className="flex flex-wrap gap-2">
      {all.map((tab) => (
        <Link
          key={tab.to}
          to={tab.to}
          activeOptions={{ exact: true }}
          activeProps={{ className: "border-primary bg-primary/10 text-secondary" }}
          className="rounded-md border border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:border-primary/60 hover:text-foreground"
        >
          {tab.label}
        </Link>
      ))}
    </div>
    </div>
  );
}
