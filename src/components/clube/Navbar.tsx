import { Link } from "@tanstack/react-router";
import { LogOut, MapPin, Menu, Settings, UserCircle } from "lucide-react";
import { useState } from "react";

import { useOffice } from "./OfficeContext";
import cronosLogo from "@/assets/cronos-full-logo.png.asset.json";
import { useCurrentUser, useSignOut } from "@/hooks/useAuth";
import { visibleModules } from "@/lib/portal-modules";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Navbar() {
  const { office, openPicker } = useOffice();
  const me = useCurrentUser();
  const signOut = useSignOut();
  const [open, setOpen] = useState(false);
  const modules = visibleModules(me.data?.roles ?? []);

  const linkClass =
    "rounded-md px-3 py-2 text-muted-foreground transition-colors hover:text-foreground";
  const activeClass = { className: "bg-secondary/25 text-foreground" };

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-xl">
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3.5">
        <Link to="/" className="flex items-center gap-3" aria-label="Portal do Profissional Cronos">
          <img src={cronosLogo.url} alt="Cronos Logistics" className="h-8 w-auto shrink-0 object-contain sm:h-9" />
          <span className="hidden border-l border-border pl-3 text-xs uppercase tracking-widest text-muted-foreground lg:inline">
            Portal do Profissional
          </span>
        </Link>

        <div className="hidden items-center gap-1 text-sm md:flex">
          {modules.map((m) => (
            <Link key={m.to} to={m.to} activeProps={activeClass} className={linkClass}>
              {m.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-1 text-sm">
          <button
            type="button"
            onClick={openPicker}
            className="hidden items-center gap-1.5 rounded-md px-3 py-2 text-muted-foreground transition-colors hover:text-foreground sm:flex"
            title="Trocar escritório"
          >
            <MapPin className="h-4 w-4 text-primary" aria-hidden="true" />
            {office ? office.name : "Escritório"}
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-1.5 rounded-md px-2 py-2 text-muted-foreground hover:text-foreground" aria-label="Minha conta">
              <UserCircle className="h-5 w-5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <p className="truncate font-semibold">{me.data?.fullName || "Minha conta"}</p>
                <p className="truncate text-xs text-muted-foreground">{me.data?.email}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {me.data?.isEditor ? (
                <DropdownMenuItem asChild>
                  <Link to="/admin"><Settings className="mr-2 h-4 w-4" /> Área administrativa</Link>
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuItem onClick={() => void signOut()}>
                <LogOut className="mr-2 h-4 w-4" /> Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <button
            type="button"
            className="rounded-md p-2 text-muted-foreground hover:text-foreground md:hidden"
            onClick={() => setOpen((o) => !o)}
            aria-label="Abrir menu"
            aria-expanded={open}
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </nav>
      {open ? (
        <div className="border-t border-border/70 px-4 py-3 md:hidden">
          <div className="flex flex-col gap-1 text-sm">
            {modules.map((m) => (
              <Link key={m.to} to={m.to} activeProps={activeClass} className={linkClass} onClick={() => setOpen(false)}>
                {m.label}
              </Link>
            ))}
            <button type="button" onClick={() => { openPicker(); setOpen(false); }} className={`${linkClass} flex items-center gap-1.5 text-left`}>
              <MapPin className="h-4 w-4 text-primary" /> {office ? office.name : "Escolher escritório"}
            </button>
          </div>
        </div>
      ) : null}
    </header>
  );
}
