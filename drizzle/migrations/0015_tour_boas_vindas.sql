ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tour_visto_em timestamptz;

CREATE OR REPLACE FUNCTION public.tour_pendente()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT tour_visto_em IS NULL FROM public.profiles WHERE id = auth.uid()), false)
$$;

CREATE OR REPLACE FUNCTION public.marcar_tour_visto()
RETURNS void LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.profiles SET tour_visto_em = now() WHERE id = auth.uid() AND tour_visto_em IS NULL
$$;

REVOKE ALL ON FUNCTION public.tour_pendente() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.marcar_tour_visto() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.tour_pendente() TO authenticated;
GRANT EXECUTE ON FUNCTION public.marcar_tour_visto() TO authenticated;