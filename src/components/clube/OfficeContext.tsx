import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useLocation } from "@tanstack/react-router";
import { Building2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";

export type Office = { id: string; slug: string; name: string };

type Ctx = {
  offices: Office[];
  office: Office | null;
  ready: boolean;
  choose: (office: Office) => void;
  openPicker: () => void;
};

const OfficeCtx = createContext<Ctx>({
  offices: [],
  office: null,
  ready: false,
  choose: () => {},
  openPicker: () => {},
});

const STORAGE_KEY = "cronos-office";

export function OfficeProvider({ children }: { children: ReactNode }) {
  const [offices, setOffices] = useState<Office[]>([]);
  const [slug, setSlug] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setSlug(window.localStorage.getItem(STORAGE_KEY));
    void supabase
      .from("offices")
      .select("id, slug, name")
      .eq("is_active", true)
      .order("sort_order")
      .then(({ data }) => {
        setOffices((data as Office[]) ?? []);
        setReady(true);
      });
  }, []);

  const office = offices.find((item) => item.slug === slug) ?? null;

  const value = useMemo<Ctx>(
    () => ({
      offices,
      office,
      ready,
      choose: (item) => {
        window.localStorage.setItem(STORAGE_KEY, item.slug);
        setSlug(item.slug);
        setPickerOpen(false);
      },
      openPicker: () => setPickerOpen(true),
    }),
    [offices, office, ready],
  );

  const isRestricted = location.pathname.startsWith("/admin") || location.pathname.startsWith("/auth");
  const showPicker = !isRestricted && ready && offices.length > 0 && (!office || pickerOpen);

  return (
    <OfficeCtx.Provider value={value}>
      {children}
      {showPicker ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/85 p-4 backdrop-blur-md">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="office-title"
            className="glass-card w-full max-w-lg rounded-3xl p-8"
          >
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent text-primary-foreground">
              <Building2 className="h-6 w-6" aria-hidden="true" />
            </span>
            <h2 id="office-title" className="mt-4 font-display text-2xl font-extrabold">
              Qual é o seu escritório?
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Mostraremos as parcerias disponíveis na sua cidade. Você pode trocar quando quiser.
            </p>
            <div className="mt-6 grid gap-2 sm:grid-cols-2">
              {offices.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => value.choose(item)}
                  className={`rounded-xl border px-4 py-3 text-left text-sm font-semibold transition-colors hover:border-primary hover:bg-primary/10 ${
                    office?.id === item.id ? "border-primary bg-primary/15" : "border-border"
                  }`}
                >
                  {item.name}
                </button>
              ))}
            </div>
            {office ? (
              <button
                type="button"
                onClick={() => setPickerOpen(false)}
                className="mt-4 text-xs text-muted-foreground hover:text-foreground"
              >
                Cancelar
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </OfficeCtx.Provider>
  );
}

export function useOffice() {
  return useContext(OfficeCtx);
}

/** Filtra parceiros pelo escritório escolhido (parceiros "todos os escritórios" sempre aparecem). */
export function useOfficePartners<T extends { all_offices: boolean; office_ids: string[] }>(
  partners: T[],
): T[] {
  const { office } = useOffice();
  return useMemo(
    () =>
      office
        ? partners.filter((p) => p.all_offices || p.office_ids.includes(office.id))
        : partners,
    [partners, office],
  );
}
