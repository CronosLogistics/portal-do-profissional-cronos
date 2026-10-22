import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Lock } from "lucide-react";
import { toast } from "sonner";

import cronosLogo from "@/assets/cronos-full-logo.png.asset.json";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/portal/PasswordInput";

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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/", replace: true });
    });
  }, [navigate]);

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!EMAIL_RE.test(email.trim())) return setError("Informe um e-mail válido.");
    if (!password) return setError("Informe sua senha.");
    setLoading(true);
    const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    setLoading(false);
    if (err) {
      const banned = err.message.toLowerCase().includes("banned");
      return setError(
        banned
          ? "Seu acesso está desativado. Procure a equipe de Gestão de Pessoas."
          : "E-mail ou senha incorretos.",
      );
    }
    navigate({ to: "/", replace: true });
  }

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

  async function handleForgot(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!EMAIL_RE.test(email.trim())) return setError("Informe um e-mail válido.");
    setLoading(true);
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/definir-senha`,
    });
    setLoading(false);
    if (err) return setError("Não foi possível enviar o e-mail agora. Tente novamente em instantes.");
    setSent(true);
    toast.success("Se o e-mail estiver cadastrado, você receberá um link para redefinir a senha.");
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
              <h1 className="font-display text-xl font-bold">
                {mode === "login" ? "Entrar" : "Recuperar senha"}
              </h1>
            </div>
          </div>

          {mode === "login" ? (
            <>
            <Button type="button" variant="outline" className="mb-4 w-full" disabled={loading} onClick={handleMicrosoft}>
              <svg viewBox="0 0 21 21" className="mr-2 h-4 w-4" aria-hidden="true">
                <rect x="1" y="1" width="9" height="9" fill="#f25022" />
                <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
                <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
                <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
              </svg>
              Entrar com Microsoft
            </Button>
            <div className="mb-4 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border" />ou<span className="h-px flex-1 bg-border" />
            </div>
            <form onSubmit={handleLogin} className="space-y-4" noValidate>
              <div className="space-y-2">
                <Label htmlFor="email">E-mail corporativo</Label>
                <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <PasswordInput id="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Entrar
              </Button>
              <button
                type="button"
                onClick={() => { setMode("forgot"); setError(null); setSent(false); }}
                className="w-full text-center text-sm text-muted-foreground hover:text-primary"
              >
                Esqueci minha senha
              </button>
            </form>
            </>
          ) : (
            <form onSubmit={handleForgot} className="space-y-4" noValidate>
              <p className="text-sm text-muted-foreground">
                Informe seu e-mail. Enviaremos um link para você definir uma nova senha.
              </p>
              <div className="space-y-2">
                <Label htmlFor="email-forgot">E-mail corporativo</Label>
                <Input id="email-forgot" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
              {sent ? <p className="text-sm text-success">Verifique sua caixa de entrada (e o spam).</p> : null}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Enviar link
              </Button>
              <button
                type="button"
                onClick={() => { setMode("login"); setError(null); }}
                className="w-full text-center text-sm text-muted-foreground hover:text-primary"
              >
                Voltar para o login
              </button>
            </form>
          )}
        </div>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Ainda não tem acesso? Solicite à equipe de Gestão de Pessoas.
        </p>
      </div>
    </div>
  );
}
