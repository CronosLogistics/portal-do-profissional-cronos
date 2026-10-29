ALTER TABLE public.documentos ADD COLUMN departamento text, ADD COLUMN cargo text;
COMMENT ON COLUMN public.mural_posts.visivel_ate IS 'DEPRECATED: posts are visible until the end of the month of data_post';

CREATE OR REPLACE FUNCTION public.mural_vigentes()
 RETURNS TABLE(id uuid, titulo text, texto text, imagem_path text, data_post date, tipo text, anos_casa integer)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT p.id, p.titulo, p.texto, p.imagem_path, p.data_post, p.tipo, p.anos_casa FROM public.mural_posts p
  WHERE public.is_active_user(auth.uid())
    AND p.data_post <= (now() AT TIME ZONE 'America/Sao_Paulo')::date
    AND date_trunc('month', p.data_post) = date_trunc('month', (now() AT TIME ZONE 'America/Sao_Paulo')::date)
  ORDER BY p.data_post DESC, p.criado_em DESC LIMIT 8;
$$;

CREATE OR REPLACE FUNCTION public.listar_mural()
 RETURNS TABLE(id uuid, titulo text, texto text, imagem_path text, data_post date, visivel_ate date, criado_em timestamp with time zone, comentarios jsonb, tipo text, anos_casa integer)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT p.id, p.titulo, p.texto, p.imagem_path, p.data_post, p.visivel_ate, p.criado_em,
    coalesce((SELECT jsonb_agg(jsonb_build_object('id',c.id,'texto',c.texto,'criado_em',c.criado_em,'editado_em',c.editado_em,'usuario_id',c.usuario_id,'nome',coalesce(pr.full_name,pr.email,'Profissional')) ORDER BY c.criado_em)
      FROM public.mural_comentarios c LEFT JOIN public.profiles pr ON pr.id = c.usuario_id WHERE c.post_id = p.id), '[]'::jsonb),
    p.tipo, p.anos_casa
  FROM public.mural_posts p
  WHERE public.is_active_user(auth.uid())
    AND date_trunc('month', p.data_post) = date_trunc('month', (now() AT TIME ZONE 'America/Sao_Paulo')::date)
  ORDER BY p.data_post DESC, p.criado_em DESC;
$$;