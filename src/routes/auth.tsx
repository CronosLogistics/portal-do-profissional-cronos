import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, Loader2, ShieldCheck } from "lucide-react";
import loginImage from "@/assets/portal-login.jpg";

import cronosLogo from "@/assets/cronos-full-logo.png.asset.json";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Entrar | Portal do Profissional Cronos" },
      { name: "description", content: "Acesso ao Portal do Profissional da Cronos Logistics." },
      { property: "og:title", content: "Entrar | Portal do Profissional Cronos" },
      { property: "og:description", content: "Acesso restrito aos profissionais da Cronos Logistics." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/", replace: true });
    });
  }, [navigate]);

  async function handleMicrosoft() {
    setError(null);
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("microsoft", { redirect_uri: window.location.origin });
    if (result.error) {
      setLoading(false);
      return setError("Não foi possível entrar com a Microsoft. Tente novamente.");
    }
    if (result.redirected) return;
    navigate({ to: "/", replace: true });
  }

  return (
    <main className="login-page">
      <section className="login-image-panel" aria-label="Profissionais da Cronos">
        <img src={loginImage} alt="Profissionais trabalhando juntos em uma operação logística" width={1024} height={1536} className="login-photo" />
        <div className="login-image-shade" />
        <img src={cronosLogo.url} alt="Cronos Logistics" className="login-image-logo" />
        <div className="login-image-caption"><p>CRONOS LOGISTICS</p><h2>Portal do<br />Profissional</h2></div>
      </section>
      <section className="login-form-panel">
        <div className="login-form-content">
          <span className="login-eyebrow">PORTAL DO PROFISSIONAL</span>
          <h1>Bem-vindo(a).</h1>
          <p className="login-description">Entre com sua conta corporativa para acessar o portal.</p>
          <Button type="button" className="login-microsoft" disabled={loading} onClick={handleMicrosoft}>
            {loading ? <Loader2 className="animate-spin" /> : <svg viewBox="0 0 21 21" aria-hidden="true" className="microsoft-icon"><rect x="1" y="1" width="9" height="9" className="ms-red" /><rect x="11" y="1" width="9" height="9" className="ms-green" /><rect x="1" y="11" width="9" height="9" className="ms-blue" /><rect x="11" y="11" width="9" height="9" className="ms-yellow" /></svg>}
            {loading ? "Conectando..." : "Entrar com Microsoft"}<ArrowRight className="ml-auto" />
          </Button>
          {error ? <p role="alert" className="mt-4 text-sm text-destructive">{error}</p> : null}
          <div className="login-security"><ShieldCheck /><span>Acesso corporativo seguro</span></div>
          <div className="login-help"><p>Precisa de ajuda para acessar?</p><span>Fale com a equipe de Gestão de Pessoas.</span></div>
        </div>
        <footer className="login-footer"><span>Cronos Logistics</span><span>Uso interno</span></footer>
      </section>
    </main>
  );
}
