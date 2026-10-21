import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Lock } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Área restrita | Espaço do Profissional Cronos" },
      {
        name: "description",
        content:
          "Acesso restrito às equipes de Administração e Gestão de Pessoas para atualizar as parcerias do Espaço do Profissional Cronos.",
      },
      { property: "og:title", content: "Área restrita | Espaço do Profissional Cronos" },
      {
        property: "og:description",
        content: "Entrada para a equipe responsável por atualizar as parcerias.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/admin", replace: true });
    });
  }, [navigate]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error("Não foi possível entrar. Verifique e-mail e senha.");
      return;
    }
    navigate({ to: "/admin", replace: true });
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
          ← Voltar ao Clube de Vantagens
        </Link>

        <div className="glass-card mt-6 rounded-3xl p-8">
          <span className="gradient-primary inline-flex h-11 w-11 items-center justify-center rounded-xl">
            <Lock className="h-5 w-5 text-primary-foreground" />
          </span>
          <h1 className="mt-5 font-display text-2xl font-bold">Área restrita</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Espaço da Administração e da Gestão de Pessoas para cadastrar e atualizar as
            parcerias do clube.
          </p>

          <form onSubmit={handleSubmit} className="mt-7 grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">E-mail corporativo</Label>
              <Input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={6}
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>
            <Button type="submit" disabled={loading} className="mt-2 h-11">
              {loading ? "Aguarde..." : "Entrar"}
            </Button>
          </form>

          <p className="mt-5 text-xs text-muted-foreground">
            O acesso é liberado apenas para as contas autorizadas da Administração e da Gestão de
            Pessoas. Em caso de dúvida, procure a equipe de BI &amp; Inovação.
          </p>
        </div>
      </div>
    </div>
  );
}
