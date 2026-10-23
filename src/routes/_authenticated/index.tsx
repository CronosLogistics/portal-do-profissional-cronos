import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Award, Megaphone, CalendarCheck, ClipboardList, Gift, GraduationCap, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/hooks/useAuth";
import { useNaoLidos } from "@/hooks/useAvisos";
import { LINKS } from "@/components/treinamentos/content";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({ meta: [
    { title: "Início | Portal do Profissional Cronos" },
    { name: "description", content: "Acesse os cadastros, treinamentos, benefícios e serviços do Portal do Profissional Cronos." },
    { property: "og:title", content: "Início | Portal do Profissional Cronos" },
    { property: "og:description", content: "Área de trabalho dos profissionais da Cronos Logistics." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: Home,
});

const baseActions = [
  { title: "Cadastrar diploma ou certificado", category: "Treinamentos", icon: GraduationCap, href: LINKS.diplomasCertificados },
  { title: "Cadastrar treinamento", category: "Treinamentos · Líderes", icon: ClipboardList, href: LINKS.cadastroTreinamento },
  { title: "Agendar treinamento existente", category: "Treinamentos · Líderes", icon: CalendarCheck, href: LINKS.agendamentoDireto },
  { title: "Ver meus benefícios", category: "Benefícios", icon: Gift, to: "/beneficios" as const },
  { title: "Parceiros e descontos", category: "Parceiros", icon: Tag, to: "/parceiros" as const },
  { title: "Programas de recompensas", category: "Recompensas", icon: Award, to: "/recompensas" as const },
];

function Home() {
  const me = useCurrentUser();
  const naoLidos = useNaoLidos().data ?? 0;
  const actions = [
    { title: naoLidos ? `${naoLidos} ${naoLidos === 1 ? "aviso não lido" : "avisos não lidos"}` : "Avisos", category: naoLidos ? "Avisos · Ver agora" : "Avisos · Em dia", icon: Megaphone, to: "/avisos" as const },
    ...baseActions,
  ];
  const firstName = me.data?.fullName.trim().split(" ")[0];
  return <main className="portal-home">
    <header className="portal-page-heading">
      <h1>{firstName ? `Olá, ${firstName}!` : "Olá!"}</h1>
      <p>O que deseja fazer agora?</p>
    </header>
    <div className="portal-action-grid">
      {actions.map(action => {
        const content = <><span className="portal-action-icon"><action.icon /></span><h2>{action.title}</h2><div className="portal-action-bottom"><span>{action.category}</span><ArrowRight /></div></>;
        return <Button asChild variant="outline" key={action.title} className="portal-action-card">
          {action.href ? <a href={action.href} target="_blank" rel="noreferrer">{content}</a> : <Link to={action.to}>{content}</Link>}
        </Button>;
      })}
    </div>
    <div className="portal-home-note"><span>Portal do Profissional</span><span>Cronos Logistics</span></div>
  </main>;
}
