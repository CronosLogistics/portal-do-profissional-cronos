import { Link } from "@tanstack/react-router";
import { MapPin } from "lucide-react";
import { useOffice } from "./OfficeContext";

import cronosLogo from "@/assets/cronos-full-logo.png.asset.json";

const links = [
  { to: "/beneficios", label: "Benefícios" },
  { to: "/parceiros", label: "Parceiros e descontos" },
  { to: "/recompensas", label: "Programas de Recompensas" },
] as const;

export function Navbar() {
  const { office, openPicker } = useOffice();
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-xl">
      <nav className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3.5">
        <Link to="/" className="flex items-center" aria-label="Cronos Logistics">
          <img
            src={cronosLogo.url}
            alt="Cronos Logistics"
            className="h-8 w-auto shrink-0 object-contain sm:h-9"
          />
        </Link>

        <div className="flex flex-wrap items-center gap-1 text-sm">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              activeProps={{ className: "text-foreground" }}
              className="rounded-md px-3 py-2 text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
          <button
            type="button"
            onClick={openPicker}
            className="flex items-center gap-1.5 rounded-md px-3 py-2 text-muted-foreground transition-colors hover:text-foreground"
            title="Trocar escritório"
          >
            <MapPin className="h-4 w-4 text-accent" aria-hidden="true" />
            {office ? office.name : "Escolher escritório"}
          </button>
          <Link
            to="/admin"
            className="rounded-md border border-border px-3 py-2 text-muted-foreground transition-colors hover:border-primary/60 hover:text-foreground"
          >
            Área restrita
          </Link>
        </div>
      </nav>
    </header>
  );
}
