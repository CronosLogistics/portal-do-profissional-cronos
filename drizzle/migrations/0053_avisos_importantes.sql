ALTER TABLE public.avisos ADD COLUMN importante boolean NOT NULL DEFAULT false;
ALTER TABLE public.avisos ADD CONSTRAINT avisos_importante_confirmacao_check CHECK (NOT importante OR (exige_confirmacao AND tipo = 'comum'));
CREATE OR REPLACE FUNCTION public.avisos_validar_importante() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.publicar_em <= now() AND NEW.importante IS DISTINCT FROM OLD.importante THEN RAISE EXCEPTION 'A classificação de aviso importante não pode mudar após a publicação'; END IF;
  IF NEW.importante AND (TG_OP = 'INSERT' OR NEW.importante IS DISTINCT FROM OLD.importante) AND NOT public.tem_permissao('avisos.confirmacao') THEN RAISE EXCEPTION 'Sem permissão para avisos importantes'; END IF;
  IF NEW.importante THEN
    IF NEW.tipo <> 'comum' THEN RAISE EXCEPTION 'Aviso importante disponível apenas para avisos comuns'; END IF;
    NEW.exige_confirmacao := true;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER avisos_antes_importante BEFORE INSERT OR UPDATE ON public.avisos FOR EACH ROW EXECUTE FUNCTION public.avisos_validar_importante();
CREATE OR REPLACE FUNCTION public.listar_notificacoes_importantes(_so_nao_lidos boolean DEFAULT false, _limite integer DEFAULT 20, _deslocamento integer DEFAULT 0, _so_obrigatorios boolean DEFAULT false, _aviso_id uuid DEFAULT NULL, _priorizar boolean DEFAULT false, _so_importantes boolean DEFAULT false)
RETURNS TABLE(id uuid, titulo text, mensagem text, perfil_nome text, publicar_em timestamptz, expira_em timestamptz, editado_em timestamptz, lido boolean, tipo text, exige_confirmacao boolean, confirmado_em timestamptz, importante boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
WITH avisos AS (
  SELECT a.id, a.titulo, a.mensagem, public.rotulo_remetente_aviso(a.perfil_id,a.autor_id) AS perfil_nome,
    a.publicar_em, a.expira_em, a.editado_em,
    CASE WHEN a.exige_confirmacao THEN c.confirmado_em IS NOT NULL
    ELSE a.publicar_em <= coalesce((SELECT primeiro_acesso FROM public.profiles WHERE id = auth.uid()), '-infinity'::timestamptz)
      OR EXISTS (SELECT 1 FROM public.avisos_leituras l WHERE l.aviso_id = a.id AND l.usuario_id = auth.uid()) END AS lido,
    a.tipo, a.exige_confirmacao, c.confirmado_em, a.importante
  FROM public.avisos a
  LEFT JOIN public.avisos_confirmacoes c ON c.aviso_id = a.id AND c.usuario_id = auth.uid()
  WHERE public.aviso_disponivel(a.id)
), v AS (
 SELECT * FROM avisos
 UNION ALL SELECT m.*, false FROM public.notificacoes_mural() m
 UNION ALL SELECT m.*, false FROM public.notificacoes_mencoes() m
)
SELECT * FROM v
WHERE (NOT _so_nao_lidos OR NOT v.lido) AND (NOT _so_obrigatorios OR v.exige_confirmacao)
  AND (NOT _so_importantes OR v.importante) AND (_aviso_id IS NULL OR v.id = _aviso_id)
ORDER BY (v.importante AND NOT v.lido) DESC,
  CASE WHEN _priorizar THEN v.exige_confirmacao AND NOT v.lido ELSE false END DESC, v.publicar_em DESC, v.id
LIMIT least(greatest(_limite,1),100) OFFSET greatest(_deslocamento,0)
$$;
REVOKE ALL ON FUNCTION public.listar_notificacoes_importantes(boolean,integer,integer,boolean,uuid,boolean,boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.listar_notificacoes_importantes(boolean,integer,integer,boolean,uuid,boolean,boolean) TO authenticated, service_role;
CREATE OR REPLACE FUNCTION public.contar_avisos_importantes() RETURNS bigint
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
SELECT count(*) FROM public.avisos a WHERE a.importante AND public.aviso_disponivel(a.id)
AND NOT EXISTS (SELECT 1 FROM public.avisos_confirmacoes c WHERE c.aviso_id = a.id AND c.usuario_id = auth.uid())
$$;
REVOKE ALL ON FUNCTION public.contar_avisos_importantes() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.contar_avisos_importantes() TO authenticated, service_role;
CREATE OR REPLACE FUNCTION public.avisos_enviados_importantes() RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
SELECT coalesce(jsonb_agg(to_jsonb(e)||jsonb_build_object('departamentos_ids',a.departamentos_ids,'importante',a.importante) ORDER BY e.publicar_em DESC),'[]'::jsonb)
FROM public.avisos_enviados_confirmacao() e JOIN public.avisos a ON a.id=e.id
$$;
REVOKE ALL ON FUNCTION public.avisos_enviados_importantes() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.avisos_enviados_importantes() TO authenticated, service_role;