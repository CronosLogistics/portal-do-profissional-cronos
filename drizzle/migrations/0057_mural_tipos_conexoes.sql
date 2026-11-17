ALTER TABLE public.mural_posts DROP CONSTRAINT IF EXISTS mural_posts_tipo_check;
ALTER TABLE public.mural_posts ADD CONSTRAINT mural_posts_tipo_check
  CHECK (tipo IN ('geral','aniversario','tempo_casa','job_rotation','admissao','data_comemorativa'));

CREATE OR REPLACE FUNCTION public.notificacoes_mural()
 RETURNS TABLE(id uuid, titulo text, mensagem text, perfil_nome text, publicar_em timestamp with time zone, expira_em timestamp with time zone, editado_em timestamp with time zone, lido boolean, tipo text, exige_confirmacao boolean, confirmado_em timestamp with time zone)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT p.id, p.titulo, ''::text,
    CASE p.tipo
      WHEN 'aniversario' THEN 'Aniversário'
      WHEN 'tempo_casa' THEN 'Tempo de casa'
      WHEN 'job_rotation' THEN 'Job rotation'
      WHEN 'admissao' THEN 'Admissão'
      WHEN 'data_comemorativa' THEN 'Datas Comemorativas'
      ELSE 'Comemoração'
    END,
    greatest(p.criado_em, coalesce(p.publicar_em, p.data_post::timestamp AT TIME ZONE 'America/Sao_Paulo')),
    null::timestamptz, null::timestamptz,
    EXISTS(SELECT 1 FROM public.mural_leituras l WHERE l.post_id = p.id AND l.usuario_id = auth.uid())
      OR greatest(p.criado_em, coalesce(p.publicar_em, p.data_post::timestamp AT TIME ZONE 'America/Sao_Paulo'))
        <= coalesce((SELECT primeiro_acesso FROM public.profiles WHERE id = auth.uid()), '-infinity'::timestamptz),
    'mural'::text, false, null::timestamptz
  FROM public.mural_posts p
  WHERE public.is_active_user(auth.uid())
    AND p.tipo IN ('aniversario','tempo_casa','job_rotation','admissao','data_comemorativa')
    AND p.data_post <= (now() AT TIME ZONE 'America/Sao_Paulo')::date
    AND coalesce(p.publicar_em, '-infinity'::timestamptz) <= now();
$function$;