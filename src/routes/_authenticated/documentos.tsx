import { createFileRoute } from "@tanstack/react-router";
import { ExternalLink, FolderOpen } from "lucide-react";

export const Route = createFileRoute("/_authenticated/documentos")({
  head: () => ({
    meta: [
      { title: "Documentos Cronos | Portal do Profissional Cronos" },
      { name: "description", content: "Qualidade e Modelo documental da Cronos Logistics." },
      { property: "og:title", content: "Documentos Cronos | Portal do Profissional Cronos" },
      { property: "og:description", content: "Acesso aos links de Qualidade e Modelo documental da Cronos Logistics." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DocumentosPage,
});

const documentos = [
  {
    titulo: "Qualidade",
    descricao:
      "Repositório dos documentos institucionais e estratégicos da Cronos, que estabelecem diretrizes, políticas e orientações gerais aplicáveis a toda a empresa, incluindo documentos do Sistema de Gestão da Qualidade e demais referências corporativas.",
    url: "https://cronoslogisticscombr.sharepoint.com/sites/CronosLogistics-Principal/Qualidade/Forms/AllItems.aspx?id=%2Fsites%2FCronosLogistics%2DPrincipal%2FQualidade%2FQualidade&viewid=36d8fdb7%2D3836%2D47a6%2D8923%2Dd2b071c6f62d",
  },
  {
    titulo: "Modelo documental",
    descricao:
      "Repositório de modelos padronizados de documentos da Cronos, disponíveis para consulta, download e edição. Devem ser utilizados como referência para a elaboração de documentos, respeitando os padrões de estrutura e identidade documental estabelecidos pela empresa.",
    url: "https://cronoslogisticscombr.sharepoint.com/:f:/s/CronosLogistics-Principal/IgAPDfRFrN4hSL_lTlt7l0VMAawrJeZ4LyYLFVtzJYFUL7M?e=1IjAYm",
  },
];

function DocumentosPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-8">
      <header>
        <h1 className="text-3xl font-bold text-foreground">Documentos Cronos</h1>
      </header>
      {documentos.map((documento) => (
        <section key={documento.titulo} className="mt-8">
          <h2 className="text-lg font-bold text-primary">{documento.titulo}</h2>
          <p className="mb-3 mt-1 text-sm text-muted-foreground">{documento.descricao}</p>
          <a
            href={documento.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-w-0 items-center justify-between gap-4 rounded-lg border bg-card p-4 hover:bg-muted/50"
          >
            <span className="flex min-w-0 items-center gap-3 font-semibold text-foreground">
              <FolderOpen className="h-5 w-5 shrink-0 text-primary" />
              <span className="break-words">{documento.titulo}</span>
            </span>
            <span className="flex shrink-0 items-center gap-1 text-sm font-medium text-primary">
              <span className="hidden sm:inline">Abrir</span>
              <ExternalLink className="h-4 w-4" />
            </span>
          </a>
        </section>
      ))}
    </main>
  );
}