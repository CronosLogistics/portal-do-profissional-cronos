import { createFileRoute, Link } from "@tanstack/react-router";
import { PerfilProfissional } from "@/components/perfil/PerfilProfissional";

export const Route = createFileRoute("/_authenticated/perfil_/$id")({
  head: () => ({
    meta: [
      { title: "Perfil do colega | Portal do Profissional Cronos" },
      { name: "description", content: "Perfil profissional de um colega da Cronos Logistics, com dados oficiais, elogios e treinamentos." },
      { property: "og:title", content: "Perfil do colega | Portal do Profissional Cronos" },
      { property: "og:description", content: "Perfil profissional de um colega da Cronos Logistics, com dados oficiais, elogios e treinamentos." },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PerfilColegaPage,
  notFoundComponent: () => <p className="p-6 text-sm">Perfil não encontrado. <Link to="/perfil" className="text-accent underline">Voltar</Link></p>,
});

function PerfilColegaPage() {
  const { id } = Route.useParams();
  return (
    <main>
      <PerfilProfissional usuarioId={id} />
    </main>
  );
}
