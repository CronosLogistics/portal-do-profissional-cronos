ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS entra_oid text UNIQUE,
  ADD COLUMN IF NOT EXISTS primeiro_acesso timestamptz,
  ADD COLUMN IF NOT EXISTS ultimo_acesso timestamptz,
  ADD COLUMN IF NOT EXISTS sincronizado_em timestamptz;

CREATE TABLE IF NOT EXISTS public.status_sincronizacao (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  executado_em timestamptz,
  sucesso boolean,
  erro text,
  alterados integer NOT NULL DEFAULT 0
);
INSERT INTO public.status_sincronizacao (id) VALUES (true) ON CONFLICT DO NOTHING;
GRANT SELECT ON public.status_sincronizacao TO authenticated;
GRANT ALL ON public.status_sincronizacao TO service_role;
ALTER TABLE public.status_sincronizacao ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view sync status" ON public.status_sincronizacao
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));