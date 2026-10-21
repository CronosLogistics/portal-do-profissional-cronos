import { useMemo, useState } from "react";
import { Search } from "lucide-react";

import { cn } from "@/lib/utils";
import { getIcon, iconKeywords, iconNames } from "@/components/clube/ContentIcon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

function suggest(title: string): string[] {
  const words = norm(title).split(/[^a-z0-9]+/).filter((w) => w.length > 2);
  if (!words.length) return [];
  return iconNames
    .map((n) => {
      const kw = norm(iconKeywords[n] ?? "");
      const score = words.reduce((acc, w) => acc + (kw.includes(w) ? 1 : 0), 0);
      return { n, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map((x) => x.n);
}

function IconButton({ name, selected, onClick }: { name: string; selected: boolean; onClick: () => void }) {
  const Icon = getIcon(name);
  return (
    <button
      type="button"
      title={name}
      aria-label={name}
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "flex h-11 w-11 items-center justify-center rounded-lg border transition-colors",
        selected
          ? "border-primary bg-gradient-to-br from-primary to-accent text-primary-foreground"
          : "border-input text-muted-foreground hover:border-primary/50 hover:text-foreground",
      )}
    >
      <Icon className="h-5 w-5" aria-hidden="true" />
    </button>
  );
}

export function IconPicker({
  value,
  onChange,
  title = "",
}: {
  value: string;
  onChange: (name: string) => void;
  title?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const Current = getIcon(value);
  const suggestions = useMemo(() => suggest(title), [title]);
  const filtered = useMemo(() => {
    const q = norm(query.trim());
    if (!q) return iconNames;
    return iconNames.filter((n) => norm(n).includes(q) || norm(iconKeywords[n] ?? "").includes(q));
  }, [query]);

  function pick(n: string) {
    onChange(n);
    setOpen(false);
  }

  return (
    <>
      <div className="flex items-center gap-3">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent text-primary-foreground">
          <Current className="h-6 w-6" aria-hidden="true" />
        </span>
        <Button type="button" variant="outline" onClick={() => setOpen(true)}>
          Escolher ícone
        </Button>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Escolher ícone</DialogTitle>
          </DialogHeader>
          {suggestions.length > 0 ? (
            <div>
              <p className="mb-2 text-sm font-medium">Sugeridos para "{title}"</p>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((n) => (
                  <IconButton key={n} name={n} selected={value === n} onClick={() => pick(n)} />
                ))}
              </div>
            </div>
          ) : null}
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar ícone (ex.: saúde, viagem, bebê)"
              className="pl-9"
            />
          </div>
          <p className="text-xs text-muted-foreground">{filtered.length} ícones</p>
          <div className="flex flex-wrap gap-2">
            {filtered.map((n) => (
              <IconButton key={n} name={n} selected={value === n} onClick={() => pick(n)} />
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
