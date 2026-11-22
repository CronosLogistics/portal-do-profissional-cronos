CREATE TABLE IF NOT EXISTS public.perfil_sobre (
  usuario_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  texto text NOT NULL DEFAULT '',
  CONSTRAINT perfil_sobre_texto_tamanho CHECK (char_length(texto) <= 1000)
);
GRANT SELECT, INSERT, UPDATE ON public.perfil_sobre TO authenticated;
GRANT ALL ON public.perfil_sobre TO service_role;
ALTER TABLE public.perfil_sobre ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Sobre do proprio profissional ativo" ON public.perfil_sobre
FOR ALL TO authenticated
USING (usuario_id = auth.uid() AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_active = true))
WITH CHECK (usuario_id = auth.uid() AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_active = true));