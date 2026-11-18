CREATE TABLE public.perfil_competencias (
  usuario_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  competencias text[] NOT NULL DEFAULT '{}'
);
GRANT SELECT, INSERT, UPDATE ON public.perfil_competencias TO authenticated;
GRANT ALL ON public.perfil_competencias TO service_role;
ALTER TABLE public.perfil_competencias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Competencias do proprio profissional ativo" ON public.perfil_competencias
FOR ALL TO authenticated
USING (usuario_id = auth.uid() AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_active = true))
WITH CHECK (usuario_id = auth.uid() AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_active = true));