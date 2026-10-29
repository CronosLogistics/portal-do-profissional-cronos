CREATE TABLE public.mural_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL CHECK (char_length(titulo) BETWEEN 1 AND 120),
  texto text NOT NULL DEFAULT '',
  imagem_path text,
  data_post date NOT NULL DEFAULT (now() AT TIME ZONE 'America/Sao_Paulo')::date,
  visivel_ate date,
  autor_id uuid NOT NULL DEFAULT auth.uid(),
  criado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mural_posts TO authenticated;
GRANT ALL ON public.mural_posts TO service_role;
ALTER TABLE public.mural_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mural ler" ON public.mural_posts FOR SELECT TO authenticated USING (public.is_active_user(auth.uid()));
CREATE POLICY "mural criar" ON public.mural_posts FOR INSERT TO authenticated WITH CHECK (public.tem_permissao('conteudo.editar') AND autor_id = auth.uid());
CREATE POLICY "mural editar" ON public.mural_posts FOR UPDATE TO authenticated USING (public.tem_permissao('conteudo.editar')) WITH CHECK (public.tem_permissao('conteudo.editar'));
CREATE POLICY "mural apagar" ON public.mural_posts FOR DELETE TO authenticated USING (public.tem_permissao('conteudo.editar'));

CREATE TABLE public.mural_comentarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.mural_posts(id) ON DELETE CASCADE,
  usuario_id uuid NOT NULL DEFAULT auth.uid(),
  texto text NOT NULL CHECK (char_length(btrim(texto)) BETWEEN 1 AND 1000),
  criado_em timestamptz NOT NULL DEFAULT now(),
  editado_em timestamptz
);
CREATE INDEX ON public.mural_comentarios(post_id, criado_em);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mural_comentarios TO authenticated;
GRANT ALL ON public.mural_comentarios TO service_role;
ALTER TABLE public.mural_comentarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "coment ler" ON public.mural_comentarios FOR SELECT TO authenticated USING (public.is_active_user(auth.uid()));
CREATE POLICY "coment criar" ON public.mural_comentarios FOR INSERT TO authenticated WITH CHECK (usuario_id = auth.uid() AND public.is_active_user(auth.uid()));
CREATE POLICY "coment editar" ON public.mural_comentarios FOR UPDATE TO authenticated USING (usuario_id = auth.uid()) WITH CHECK (usuario_id = auth.uid());
CREATE POLICY "coment apagar" ON public.mural_comentarios FOR DELETE TO authenticated USING (usuario_id = auth.uid() OR public.tem_permissao('conteudo.editar'));

CREATE OR REPLACE FUNCTION public.mural_coment_antes() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.post_id := OLD.post_id; NEW.usuario_id := OLD.usuario_id; NEW.criado_em := OLD.criado_em;
  IF NEW.texto IS DISTINCT FROM OLD.texto THEN NEW.editado_em := now(); END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER mural_coment_antes BEFORE UPDATE ON public.mural_comentarios FOR EACH ROW EXECUTE FUNCTION public.mural_coment_antes();

CREATE OR REPLACE FUNCTION public.listar_mural() RETURNS TABLE(id uuid, titulo text, texto text, imagem_path text, data_post date, visivel_ate date, criado_em timestamptz, comentarios jsonb)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.titulo, p.texto, p.imagem_path, p.data_post, p.visivel_ate, p.criado_em,
    coalesce((SELECT jsonb_agg(jsonb_build_object('id',c.id,'texto',c.texto,'criado_em',c.criado_em,'editado_em',c.editado_em,'usuario_id',c.usuario_id,'nome',coalesce(pr.full_name,pr.email,'Profissional')) ORDER BY c.criado_em)
      FROM public.mural_comentarios c LEFT JOIN public.profiles pr ON pr.id = c.usuario_id WHERE c.post_id = p.id), '[]'::jsonb)
  FROM public.mural_posts p
  WHERE public.is_active_user(auth.uid())
  ORDER BY p.data_post DESC, p.criado_em DESC;
$$;
REVOKE ALL ON FUNCTION public.listar_mural() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.listar_mural() TO authenticated;

CREATE OR REPLACE FUNCTION public.mural_vigentes() RETURNS TABLE(id uuid, titulo text, texto text, imagem_path text, data_post date)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.titulo, p.texto, p.imagem_path, p.data_post FROM public.mural_posts p
  WHERE public.is_active_user(auth.uid())
    AND p.data_post <= (now() AT TIME ZONE 'America/Sao_Paulo')::date
    AND coalesce(p.visivel_ate, p.data_post + 2) >= (now() AT TIME ZONE 'America/Sao_Paulo')::date
  ORDER BY p.data_post DESC, p.criado_em DESC LIMIT 5;
$$;
REVOKE ALL ON FUNCTION public.mural_vigentes() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.mural_vigentes() TO authenticated;

CREATE POLICY "mural ver arquivos" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'mural' AND public.is_active_user(auth.uid()));
CREATE POLICY "mural upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'mural' AND public.tem_permissao('conteudo.editar'));
CREATE POLICY "mural remover" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'mural' AND public.tem_permissao('conteudo.editar'));