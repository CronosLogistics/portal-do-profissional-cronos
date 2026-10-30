import { Link } from "@tanstack/react-router";
import { Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/hooks/useAuth";

/** Botão de edição exibido só a quem pode editar conteúdos (Gestão de Pessoas e Administrador). */
export function GerenciarConteudo({ to, label }: { to: "/admin" | "/admin/beneficios" | "/admin/recompensas"; label: string }) {
  const me = useCurrentUser();
  if (!me.data?.can("conteudo.editar")) return null;
  return (
    <Button asChild className="mt-5">
      <Link to={to}><Pencil className="mr-1.5 h-4 w-4" />{label}</Link>
    </Button>
  );
}
