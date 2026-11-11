ALTER TABLE public.mural_posts ADD COLUMN IF NOT EXISTS publicar_em timestamptz;

CREATE OR REPLACE FUNCTION public.mural_publicado(_data date, _publicar_em timestamptz)
 RETURNS boolean LANGUAGE sql STABLE SET search_path TO 'public'
AS $$ SELECT public.mural_post_vigente(_data,(now() AT TIME ZONE 'America/Sao_Paulo')::date) AND coalesce(_publicar_em,'-infinity'::timestamptz)<=now() $$;

DROP FUNCTION IF EXISTS public.listar_mural_com_reacoes();
DROP FUNCTION IF EXISTS public.listar_mural();

CREATE FUNCTION public.listar_mural()
 RETURNS TABLE(id uuid, titulo text, texto text, imagem_path text, data_post date, visivel_ate date, criado_em timestamp with time zone, comentarios jsonb, tipo text, anos_casa integer, publicar_em timestamptz)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$ SELECT p.id,p.titulo,p.texto,p.imagem_path,p.data_post,p.visivel_ate,p.criado_em,coalesce((SELECT jsonb_agg(jsonb_build_object('id',c.id,'texto',c.texto,'criado_em',c.criado_em,'editado_em',c.editado_em,'usuario_id',c.usuario_id,'nome',coalesce(pr.full_name,pr.email,'Profissional')) ORDER BY c.criado_em) FROM public.mural_comentarios c LEFT JOIN public.profiles pr ON pr.id=c.usuario_id WHERE c.post_id=p.id),'[]'::jsonb),p.tipo,p.anos_casa,p.publicar_em FROM public.mural_posts p WHERE public.is_active_user(auth.uid()) AND (public.mural_publicado(p.data_post,p.publicar_em) OR ((p.data_post>(now() AT TIME ZONE 'America/Sao_Paulo')::date OR p.publicar_em>now()) AND public.tem_permissao('conteudo.editar'))) ORDER BY p.data_post DESC,p.criado_em DESC; $function$;

CREATE FUNCTION public.listar_mural_com_reacoes()
 RETURNS TABLE(id uuid, titulo text, texto text, imagem_path text, data_post date, visivel_ate date, criado_em timestamp with time zone, comentarios jsonb, tipo text, anos_casa integer, publicar_em timestamptz, reacoes jsonb, minha_reacao text)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT p.id, p.titulo, p.texto, p.imagem_path, p.data_post, p.visivel_ate, p.criado_em, p.comentarios, p.tipo, p.anos_casa, p.publicar_em,
    coalesce((SELECT jsonb_agg(jsonb_build_object('emoji', x.emoji, 'total', x.total, 'meu', x.meu) ORDER BY x.total DESC, x.emoji)
      FROM (SELECT r.emoji, count(*)::int AS total, bool_or(r.usuario_id = auth.uid()) AS meu FROM public.mural_reacoes r WHERE r.post_id = p.id GROUP BY r.emoji) x), '[]'::jsonb),
    (SELECT r.emoji FROM public.mural_reacoes r WHERE r.post_id = p.id AND r.usuario_id = auth.uid())
  FROM public.listar_mural() p WHERE public.is_active_user(auth.uid())
  ORDER BY p.data_post DESC, p.criado_em DESC;
$function$;
REVOKE ALL ON FUNCTION public.listar_mural() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.listar_mural_com_reacoes() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.listar_mural(), public.listar_mural_com_reacoes() TO authenticated;

CREATE OR REPLACE FUNCTION public.mural_vigentes()
 RETURNS TABLE(id uuid, titulo text, texto text, imagem_path text, data_post date, tipo text, anos_casa integer)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$ SELECT p.id,p.titulo,p.texto,p.imagem_path,p.data_post,p.tipo,p.anos_casa FROM public.mural_posts p WHERE public.is_active_user(auth.uid()) AND public.mural_publicado(p.data_post,p.publicar_em) ORDER BY p.data_post DESC,p.criado_em DESC LIMIT 8; $function$;

CREATE OR REPLACE FUNCTION public.notificacoes_mural()
 RETURNS TABLE(id uuid, titulo text, mensagem text, perfil_nome text, publicar_em timestamp with time zone, expira_em timestamp with time zone, editado_em timestamp with time zone, lido boolean, tipo text, exige_confirmacao boolean, confirmado_em timestamp with time zone)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$ SELECT p.id,p.titulo,''::text,CASE WHEN p.tipo='aniversario' THEN 'Aniversário' ELSE 'Tempo de casa' END,greatest(p.criado_em,coalesce(p.publicar_em,p.data_post::timestamp AT TIME ZONE 'America/Sao_Paulo')),(public.primeiro_util_mes((p.data_post+interval '1 month')::date)::timestamp AT TIME ZONE 'America/Sao_Paulo'),null::timestamptz,EXISTS(SELECT 1 FROM public.mural_leituras l WHERE l.post_id=p.id AND l.usuario_id=auth.uid()) OR greatest(p.criado_em,coalesce(p.publicar_em,p.data_post::timestamp AT TIME ZONE 'America/Sao_Paulo'))<=coalesce((SELECT primeiro_acesso FROM public.profiles WHERE id=auth.uid()),'-infinity'::timestamptz),'mural'::text,false,null::timestamptz FROM public.mural_posts p WHERE public.is_active_user(auth.uid()) AND p.tipo IN ('aniversario','tempo_casa') AND public.mural_publicado(p.data_post,p.publicar_em) $function$;