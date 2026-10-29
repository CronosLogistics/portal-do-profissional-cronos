ALTER TABLE public.perfil_permissoes DROP CONSTRAINT perfil_permissoes_permissao_check;
ALTER TABLE public.perfil_permissoes ADD CONSTRAINT perfil_permissoes_permissao_check CHECK (permissao IN ('admin.usuarios','admin.perfis','avisos.publicar','avisos.gerenciar','avisos.insider','conteudo.editar','documentos.gerenciar'));

INSERT INTO public.perfil_permissoes (perfil_id, permissao)
SELECT id, 'documentos.gerenciar' FROM public.perfis WHERE nome IN ('Qualidade','Administrador')
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.minhas_permissoes()
 RETURNS text[] LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT coalesce(array_agg(c), '{}') FROM unnest(ARRAY['admin.usuarios','admin.perfis','avisos.publicar','avisos.gerenciar','avisos.insider','conteudo.editar','documentos.gerenciar']) c
  WHERE public.usuario_tem_permissao(auth.uid(), c);
$$;

CREATE TABLE public.documentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL CHECK (char_length(btrim(titulo)) BETWEEN 1 AND 150),
  url text NOT NULL CHECK (url ~* '^https?://'),
  criado_por uuid DEFAULT auth.uid(),
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documentos TO authenticated;
GRANT ALL ON public.documentos TO service_role;
ALTER TABLE public.documentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "documentos_ler" ON public.documentos FOR SELECT TO authenticated USING (public.is_active_user(auth.uid()));
CREATE POLICY "documentos_inserir" ON public.documentos FOR INSERT TO authenticated WITH CHECK (public.tem_permissao('documentos.gerenciar'));
CREATE POLICY "documentos_editar" ON public.documentos FOR UPDATE TO authenticated USING (public.tem_permissao('documentos.gerenciar')) WITH CHECK (public.tem_permissao('documentos.gerenciar'));
CREATE POLICY "documentos_excluir" ON public.documentos FOR DELETE TO authenticated USING (public.tem_permissao('documentos.gerenciar'));
CREATE TRIGGER documentos_atualizado BEFORE UPDATE ON public.documentos FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();