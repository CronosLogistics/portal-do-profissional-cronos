import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useCurrentUser } from "@/hooks/useAuth";
import { meuEscritorio } from "@/lib/office.functions";

import { listPublicOffices } from "@/lib/partners.functions";

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

export function OfficeProvider({ children }: { children: ReactNode }) {
  const [offices, setOffices] = useState<Office[]>([]);
  const [ready, setReady] = useState(false);
  const me = useCurrentUser();
  const buscar = useServerFn(meuEscritorio);
  const resolved = useQuery({ queryKey: ["meu-escritorio", me.data?.id], queryFn: () => buscar(), enabled: Boolean(me.data?.id), staleTime: 5 * 60000, retry: false });

  useEffect(() => {
    void listPublicOffices()
      .then((data) => setOffices(data ?? []))
      .catch(() => setOffices([]))
      .finally(() => setReady(true));
  }, []);

  const office = me.data?.id ? resolved.data ?? null : null;

  const value = useMemo<Ctx>(
    () => ({
      offices,
      office,
      ready,
      choose: () => {},
      openPicker: () => {},
    }),
    [offices, office, ready],
  );

  return <OfficeCtx.Provider value={value}>{children}</OfficeCtx.Provider>;
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
