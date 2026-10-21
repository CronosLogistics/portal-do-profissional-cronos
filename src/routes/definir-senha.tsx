import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/portal/PasswordInput";

export const Route = createFileRoute("/definir-senha")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Definir senha | Portal do Profissional Cronos" },
      { name: "description", content: "Defina sua senha de acesso ao Portal do Profissional Cronos." },
      { property: "og:title", content: "Definir senha | Portal do Profissional Cronos" },
      { property: "og:description", content: "Crie ou redefina sua senha de acesso ao portal." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DefinirSenhaPage,
});

function DefinirSenhaPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState<"loading" | "ok" | "invalid">("loading");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // O link do convite/recuperação cria a sessão a partir do endereço.
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) setReady("ok");
    });
    const timer = setTimeout(async () => {
      const { data } = await supabase.auth.getSession();
      setReady(data.session ? "ok" : "invalid");
    }, 1200);
    return () => {
      sub.subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (password.length < 8) return setError("A senha deve ter pelo menos 8 caracteres.");
    if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return setError("Use letras e números na senha.");
    if (password !== confirm) return setError("A confirmação deve ser igual à senha.");
    setSaving(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (err) {
      const m = err.message.toLowerCase();
      return setError(
        m.includes("pwned") || m.includes("weak") || m.includes("guess")
          ? "Esta senha é muito comum. Escolha uma senha mais forte."
          : m.includes("different")
            ? "A nova senha deve ser diferente da anterior."
            : "Não foi possível salvar a senha. Solicite um novo link.",
      );
    }
    toast.success("Senha definida com sucesso.");
    navigate({ to: "/", replace: true });
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-16">
      <div className="glass-card w-full max-w-md rounded-2xl p-8">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl gradient-primary">
            <KeyRound className="h-5 w-5 text-primary-foreground" />
          </span>
          <div>
            <p className="text-xs uppercase tracking-widest text-primary">Portal do Profissional</p>
            <h1 className="font-display text-xl font-bold">Definir senha</h1>
          </div>
        </div>
        {ready === "loading" ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Validando seu link...
          </div>
        ) : ready === "invalid" ? (
          <div className="space-y-4 text-sm text-muted-foreground">
            <p>Este link expirou ou já foi usado. Solicite um novo na tela de login, em "Esqueci minha senha".</p>
            <Button onClick={() => navigate({ to: "/auth" })} className="w-full">Ir para o login</Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="space-y-2">
              <Label htmlFor="pw">Nova senha</Label>
              <PasswordInput id="pw" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
              <p className="text-xs text-muted-foreground">Mínimo de 8 caracteres, com letras e números.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pw2">Confirmar senha</Label>
              <PasswordInput id="pw2" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            </div>
            {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Salvar senha
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
