CREATE TABLE public.mencoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  origem text NOT NULL CHECK (origem IN ('aviso','mural_post','mural_comentario')),
  aviso_id uuid REFERENCES public.avisos(id) ON DELETE CASCADE,
  post_id uuid REFERENCES public.mural_posts(id) ON DELETE CASCADE,
  comentario_id uuid REFERENCES public.mural_comentarios(id) ON DELETE CASCADE,
  autor_id uuid NOT NULL,
  usuario_id uuid NOT NULL,
  via_departamento boolean NOT NULL DEFAULT false,
  criado_em timestamptz NOT NULL DEFAULT now(),
  lido_em timestamptz
);
CREATE UNIQUE INDEX mencoes_unica ON public.mencoes (origem, coalesce(comentario_id, post_id, aviso_id), usuario_id);
CREATE INDEX mencoes_usuario ON public.mencoes (usuario_id, lido_em);
GRANT ALL ON public.mencoes TO service_role;
ALTER TABLE public.mencoes ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.registrar_mencoes(_origem text, _aviso uuid, _post uuid, _coment uuid, _autor uuid, _texto text)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path TO 'public' AS $$
  WITH u AS (
    SELECT DISTINCT (m[1])::uuid AS id FROM regexp_matches(coalesce(_texto,''), '@\[[^\]\[]{1,80}\]\(u:([0-9a-fA-F-]{36})\)', 'g') m
  ), d AS (
    SELECT DISTINCT m[1] AS id FROM regexp_matches(coalesce(_texto,''), '@\[[^\]\[]{1,80}\]\(d:([A-Za-z0-9_-]{1,40})\)', 'g') m
  ), alvo AS (
    SELECT p.id, false AS via FROM public.profiles p JOIN u ON u.id = p.id WHERE p.is_active
    UNION ALL
    SELECT p.id, true FROM public.profissional_departamento pd JOIN d ON d.id = pd.departamento_id JOIN public.profiles p ON p.id = pd.usuario_id WHERE p.is_active
  ), unico AS (SELECT id, bool_and(via) AS via FROM alvo WHERE id <> _autor GROUP BY id)
  INSERT INTO public.mencoes (origem, aviso_id, post_id, comentario_id, autor_id, usuario_id, via_departamento)
  SELECT _origem, _aviso, _post, _coment, _autor, id, via FROM unico
  ON CONFLICT DO NOTHING;
$$;

CREATE OR REPLACE FUNCTION public.mencoes_avisos_trg() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN PERFORM public.registrar_mencoes('aviso', NEW.id, NULL, NULL, NEW.autor_id, NEW.mensagem); RETURN NEW; END $$;
CREATE OR REPLACE FUNCTION public.mencoes_mural_post_trg() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN PERFORM public.registrar_mencoes('mural_post', NULL, NEW.id, NULL, NEW.autor_id, NEW.texto); RETURN NEW; END $$;
CREATE OR REPLACE FUNCTION public.mencoes_mural_coment_trg() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN PERFORM public.registrar_mencoes('mural_comentario', NULL, NEW.post_id, NEW.id, NEW.usuario_id, NEW.texto); RETURN NEW; END $$;

CREATE TRIGGER mencoes_avisos AFTER INSERT OR UPDATE OF mensagem ON public.avisos FOR EACH ROW EXECUTE FUNCTION public.mencoes_avisos_trg();
CREATE TRIGGER mencoes_mural_post AFTER INSERT OR UPDATE OF texto ON public.mural_posts FOR EACH ROW EXECUTE FUNCTION public.mencoes_mural_post_trg();
CREATE TRIGGER mencoes_mural_coment AFTER INSERT OR UPDATE OF texto ON public.mural_comentarios FOR EACH ROW EXECUTE FUNCTION public.mencoes_mural_coment_trg();

CREATE OR REPLACE FUNCTION public.notificacoes_mencoes()
RETURNS TABLE(id uuid, titulo text, mensagem text, perfil_nome text, publicar_em timestamptz, expira_em timestamptz, editado_em timestamptz, lido boolean, tipo text, exige_confirmacao boolean, confirmado_em timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT m.id,
    coalesce(nullif(pr.full_name,''),'Alguém') || CASE WHEN m.via_departamento THEN ' mencionou seu departamento' ELSE ' mencionou você' END
      || CASE m.origem WHEN 'mural_comentario' THEN ' em um comentário: ' ELSE ' em: ' END || coalesce(a.titulo, mp.titulo, ''),
    CASE WHEN m.aviso_id IS NOT NULL THEN 'aviso:' || m.aviso_id ELSE 'mural:' || m.post_id END,
    'Menção'::text,
    greatest(m.criado_em, coalesce(a.publicar_em, mp.publicar_em, mp.data_post::timestamp AT TIME ZONE 'America/Sao_Paulo', m.criado_em)),
    null::timestamptz, null::timestamptz, m.lido_em IS NOT NULL, 'mencao'::text, false, null::timestamptz
  FROM public.mencoes m
  LEFT JOIN public.profiles pr ON pr.id = m.autor_id
  LEFT JOIN public.avisos a ON a.id = m.aviso_id
  LEFT JOIN public.mural_posts mp ON mp.id = m.post_id
  WHERE m.usuario_id = auth.uid() AND public.is_active_user(auth.uid())
    AND ((m.aviso_id IS NOT NULL AND public.aviso_disponivel(m.aviso_id))
      OR (m.post_id IS NOT NULL AND public.mural_publicado(mp.data_post, mp.publicar_em)))
$$;

CREATE OR REPLACE FUNCTION public.listar_notificacoes(_so_nao_lidos boolean DEFAULT false, _limite integer DEFAULT 20, _deslocamento integer DEFAULT 0, _so_obrigatorios boolean DEFAULT false, _aviso_id uuid DEFAULT NULL::uuid, _priorizar boolean DEFAULT false)
 RETURNS TABLE(id uuid, titulo text, mensagem text, perfil_nome text, publicar_em timestamp with time zone, expira_em timestamp with time zone, editado_em timestamp with time zone, lido boolean, tipo text, exige_confirmacao boolean, confirmado_em timestamp with time zone)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$ WITH avisos AS (SELECT a.id,a.titulo,a.mensagem,p.nome,a.publicar_em,a.expira_em,a.editado_em,CASE WHEN a.exige_confirmacao THEN c.confirmado_em IS NOT NULL ELSE a.publicar_em<=coalesce((SELECT primeiro_acesso FROM public.profiles WHERE id=auth.uid()),'-infinity'::timestamptz) OR EXISTS(SELECT 1 FROM public.avisos_leituras l WHERE l.aviso_id=a.id AND l.usuario_id=auth.uid()) END AS lido,a.tipo,a.exige_confirmacao,c.confirmado_em FROM public.avisos a JOIN public.perfis p ON p.id=a.perfil_id LEFT JOIN public.avisos_confirmacoes c ON c.aviso_id=a.id AND c.usuario_id=auth.uid() WHERE public.aviso_disponivel(a.id)), v AS (SELECT * FROM avisos UNION ALL SELECT * FROM public.notificacoes_mural() UNION ALL SELECT * FROM public.notificacoes_mencoes()) SELECT * FROM v WHERE (NOT _so_nao_lidos OR NOT v.lido) AND (NOT _so_obrigatorios OR v.exige_confirmacao) AND (_aviso_id IS NULL OR v.id=_aviso_id) ORDER BY CASE WHEN _priorizar THEN v.exige_confirmacao AND NOT v.lido ELSE false END DESC,v.publicar_em DESC,v.id LIMIT least(greatest(_limite,1),100) OFFSET greatest(_deslocamento,0) $function$;

CREATE OR REPLACE FUNCTION public.contar_notificacoes()
 RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$ SELECT public.contar_nao_lidos()+(SELECT count(*)::integer FROM public.notificacoes_mural() WHERE NOT lido)+(SELECT count(*)::integer FROM public.notificacoes_mencoes() WHERE NOT lido) $function$;

CREATE OR REPLACE FUNCTION public.marcar_todas_notificacoes_lidas()
 RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$ DECLARE n integer; m integer; k integer; BEGIN IF NOT public.is_active_user(auth.uid()) THEN RETURN 0; END IF; n:=public.marcar_todos_avisos_lidos(); INSERT INTO public.mural_leituras(post_id,usuario_id) SELECT id,auth.uid() FROM public.notificacoes_mural() ON CONFLICT DO NOTHING; GET DIAGNOSTICS m=ROW_COUNT; UPDATE public.mencoes SET lido_em=now() WHERE usuario_id=auth.uid() AND lido_em IS NULL; GET DIAGNOSTICS k=ROW_COUNT; RETURN n+m+k; END $function$;

CREATE OR REPLACE FUNCTION public.marcar_mencao_lida(_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path TO 'public' AS $$
  UPDATE public.mencoes SET lido_em = now() WHERE id = _id AND usuario_id = auth.uid() AND lido_em IS NULL;
$$;

CREATE OR REPLACE FUNCTION public.buscar_mencionaveis(_busca text)
RETURNS TABLE(tipo text, id text, nome text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT * FROM (
    (SELECT 'departamento'::text, d.id, d.nome FROM public.departamentos_portal d
      WHERE public.is_active_user(auth.uid()) AND d.nome ILIKE '%' || coalesce(_busca,'') || '%' ORDER BY d.nome LIMIT 5)
    UNION ALL
    (SELECT 'pessoa'::text, p.id::text, p.full_name FROM public.profiles p
      WHERE public.is_active_user(auth.uid()) AND p.is_active AND coalesce(p.full_name,'') <> ''
        AND (p.full_name ILIKE '%' || coalesce(_busca,'') || '%' OR p.email ILIKE '%' || coalesce(_busca,'') || '%')
      ORDER BY p.full_name LIMIT 8)
  ) x;
$$;

REVOKE ALL ON FUNCTION public.registrar_mencoes(text,uuid,uuid,uuid,uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.marcar_mencao_lida(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.buscar_mencionaveis(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.notificacoes_mencoes() TO authenticated;