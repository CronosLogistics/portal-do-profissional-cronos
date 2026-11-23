CREATE TABLE public.organograma_ajustes (
  usuario_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  area text,
  oculto boolean NOT NULL DEFAULT false,
  atualizado_por uuid,
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.organograma_ajustes TO authenticated;
GRANT ALL ON public.organograma_ajustes TO service_role;
ALTER TABLE public.organograma_ajustes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ativos leem organograma" ON public.organograma_ajustes FOR SELECT TO authenticated USING (public.is_active_user(auth.uid()));

CREATE OR REPLACE FUNCTION public.pode_editar_organograma()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_active_user(auth.uid()) AND (public.has_role(auth.uid(),'admin') OR public.pode_ver_relatorios_acesso());
$$;

CREATE OR REPLACE FUNCTION public.salvar_organograma(_ajustes jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r jsonb;
BEGIN
  IF NOT public.pode_editar_organograma() THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  IF jsonb_typeof(_ajustes) <> 'array' OR jsonb_array_length(_ajustes) > 1000 THEN RAISE EXCEPTION 'Dados inválidos'; END IF;
  FOR r IN SELECT * FROM jsonb_array_elements(_ajustes) LOOP
    INSERT INTO public.organograma_ajustes(usuario_id, area, oculto, atualizado_por, atualizado_em)
    VALUES ((r->>'usuario_id')::uuid, nullif(left(trim(r->>'area'),80),''), coalesce((r->>'oculto')::boolean,false), auth.uid(), now())
    ON CONFLICT (usuario_id) DO UPDATE SET area=EXCLUDED.area, oculto=EXCLUDED.oculto, atualizado_por=EXCLUDED.atualizado_por, atualizado_em=now();
  END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.salvar_organograma(jsonb) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.salvar_organograma(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pode_editar_organograma() TO authenticated;