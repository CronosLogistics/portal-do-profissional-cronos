import { createFileRoute } from "@tanstack/react-router";
import { PerfilProfissional } from "@/components/perfil/PerfilProfissional";

export const Route = createFileRoute("/_authenticated/perfil")({
  head: () => ({
    meta: [
      { title: "Meu perfil | Portal do Profissional Cronos" },
      {
        name: "description",
        content: "Perfil profissional com badges, competências, elogios e conquistas na Cronos Logistics.",
      },
      { property: "og:title", content: "Meu perfil | Portal do Profissional Cronos" },
      {
        property: "og:description",
        content: "Perfil profissional com badges, competências, elogios e conquistas na Cronos Logistics.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PerfilPage,
});

function PerfilPage() {
  return (
    <main>
      <PerfilProfissional />
    </main>
  );
}
