CREATE TABLE IF NOT EXISTS public.perfil_privacidade (
  usuario_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  mostrar_badges boolean NOT NULL DEFAULT true,
  mostrar_aniversario boolean NOT NULL DEFAULT true,
  mostrar_elogios boolean NOT NULL DEFAULT false
);
GRANT SELECT, INSERT, UPDATE ON public.perfil_privacidade TO authenticated;
GRANT ALL ON public.perfil_privacidade TO service_role;
ALTER TABLE public.perfil_privacidade ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'perfil_privacidade'
      AND policyname = 'Privacidade do proprio profissional ativo'
  ) THEN
    CREATE POLICY "Privacidade do proprio profissional ativo" ON public.perfil_privacidade
    FOR ALL TO authenticated
    USING (usuario_id = auth.uid() AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_active = true))
    WITH CHECK (usuario_id = auth.uid() AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_active = true));
  END IF;
END $$;