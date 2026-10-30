import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LogOut } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AdminTabs } from "@/components/clube/AdminTabs";
import { ALL_FIELDS, PAGE_GROUPS, resolveAll } from "@/lib/site-content";

export const Route = createFileRoute("/_authenticated/admin/pagina-inicial")({
  head: () => ({
    meta: [
      { title: "Página inicial | Portal do Profissional Cronos" },
      { name: "description", content: "Edite os textos da página inicial do Portal do Profissional Cronos." },
      { property: "og:title", content: "Editar página inicial" },
      { property: "og:description", content: "Painel interno de textos da página inicial." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminHome,
});

function AdminHome() {
  const navigate = useNavigate();
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.from("site_content").select("key, value");
      const map: Record<string, string> = {};
      for (const r of data ?? []) map[r.key] = r.value;
      setValues(resolveAll(map));
      setLoading(false);
    })();
  }, []);

  async function save() {
    setSaving(true);
    const rows = ALL_FIELDS.map((f) => ({ key: f.key, value: values[f.key] ?? "" }));
    const { error } = await supabase.from("site_content").upsert(rows, { onConflict: "key" });
    setSaving(false);
    if (error) toast.error("Não foi possível salvar.");
    else toast.success("Textos atualizados.");
  }

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-border/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-5">
          <div>
            <p className="text-xs uppercase tracking-widest text-accent">Área restrita</p>
            <h1 className="font-display text-xl font-bold">Textos do site</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild><Link to="/">Voltar ao portal</Link></Button>
            <Button size="sm" onClick={save} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-10">
        <AdminTabs />
        {loading ? (
          <p className="mt-8 text-sm text-muted-foreground">Carregando...</p>
        ) : (
          <div className="mt-8 grid gap-6">
            {PAGE_GROUPS.map((g) => (
            <div key={g.title} className="glass-card grid gap-5 rounded-2xl p-6">
            <h2 className="font-display text-lg font-bold">{g.title}</h2>
            {(g.fields as ReadonlyArray<{ key: string; label: string; multiline?: boolean }>).map((f) => (
              <label key={f.key} className="grid gap-1.5">
                <span className="text-sm font-medium">{f.label}</span>
                {f.multiline ? (
                  <Textarea
                    rows={4}
                    value={values[f.key] ?? ""}
                    onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                  />
                ) : (
                  <Input
                    value={values[f.key] ?? ""}
                    onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                  />
                )}
              </label>
            ))}
            </div>
            ))}
            <p className="text-xs text-muted-foreground">Campos deixados em branco voltam ao texto padrão.</p>
            <div className="flex justify-end">
              <Button onClick={save} disabled={saving} className="h-11">
                {saving ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
