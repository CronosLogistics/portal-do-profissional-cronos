ALTER TABLE public.mural_posts ADD COLUMN tipo text NOT NULL DEFAULT 'geral' CHECK (tipo IN ('geral','aniversario','tempo_casa'));
ALTER TABLE public.mural_posts ADD COLUMN anos_casa integer CHECK (anos_casa IS NULL OR anos_casa BETWEEN 1 AND 80);
DROP FUNCTION public.mural_vigentes();
CREATE FUNCTION public.mural_vigentes()
 RETURNS TABLE(id uuid, titulo text, texto text, imagem_path text, data_post date, tipo text, anos_casa integer)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT p.id, p.titulo, p.texto, p.imagem_path, p.data_post, p.tipo, p.anos_casa FROM public.mural_posts p
  WHERE public.is_active_user(auth.uid())
    AND p.data_post <= (now() AT TIME ZONE 'America/Sao_Paulo')::date
    AND coalesce(p.visivel_ate, p.data_post + 2) >= (now() AT TIME ZONE 'America/Sao_Paulo')::date
  ORDER BY p.data_post DESC, p.criado_em DESC LIMIT 8;
$$;
GRANT EXECUTE ON FUNCTION public.mural_vigentes() TO authenticated;