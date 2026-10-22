import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Lock } from "lucide-react";

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
    <div className="flex min-h-screen items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <img src={cronosLogo.url} alt="Cronos Logistics" className="mx-auto mb-8 h-10 w-auto" />
        <div className="glass-card rounded-2xl p-8">
          <div className="mb-6 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl gradient-primary">
              <Lock className="h-5 w-5 text-primary-foreground" />
            </span>
            <div>
              <p className="text-xs uppercase tracking-widest text-primary">Portal do Profissional</p>
              <h1 className="font-display text-xl font-bold">Entrar</h1>
            </div>
          </div>

          <p className="mb-4 text-sm text-muted-foreground">Use sua conta corporativa da Cronos.</p>
          <Button type="button" className="w-full" disabled={loading} onClick={handleMicrosoft}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (
              <svg viewBox="0 0 21 21" className="mr-2 h-4 w-4" aria-hidden="true">
                <rect x="1" y="1" width="9" height="9" fill="#f25022" />
                <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
                <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
                <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
              </svg>
            )}
            Entrar com Microsoft
          </Button>
          {error ? <p role="alert" className="mt-4 text-sm text-destructive">{error}</p> : null}
        </div>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Ainda não tem acesso? Solicite à equipe de Gestão de Pessoas.
        </p>
      </div>
    </div>
  );
}
