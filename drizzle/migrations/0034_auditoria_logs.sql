CREATE TABLE public.auditoria_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  criado_em timestamptz NOT NULL DEFAULT now(),
  autor_id uuid,
  autor_nome text NOT NULL DEFAULT 'Sistema',
  modulo text NOT NULL,
  operacao text NOT NULL,
  acao text NOT NULL,
  alvo text NOT NULL DEFAULT '',
  antes jsonb,
  depois jsonb
);
CREATE INDEX auditoria_logs_criado_idx ON public.auditoria_logs (criado_em DESC);
CREATE INDEX auditoria_logs_autor_idx ON public.auditoria_logs (autor_id, criado_em DESC);
GRANT SELECT ON public.auditoria_logs TO authenticated;
GRANT ALL ON public.auditoria_logs TO service_role;
ALTER TABLE public.auditoria_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Somente administradores leem auditoria" ON public.auditoria_logs
  FOR SELECT TO authenticated
  USING (public.usuario_tem_permissao(auth.uid(), 'admin.usuarios') OR public.usuario_tem_permissao(auth.uid(), 'admin.perfis'));

CREATE OR REPLACE FUNCTION public.auditoria_registrar() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _nome text;
  _o jsonb := CASE WHEN TG_OP <> 'INSERT' THEN to_jsonb(OLD) END;
  _n jsonb := CASE WHEN TG_OP <> 'DELETE' THEN to_jsonb(NEW) END;
  _r jsonb := coalesce(_n, _o);
  _antes jsonb; _depois jsonb;
  _k text;
  _modulo text; _artigo text; _alvo text; _acao text; _verbo text;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    _antes := '{}'; _depois := '{}';
    FOR _k IN SELECT jsonb_object_keys(_n) LOOP
      IF _k IN ('updated_at','atualizado_em','editado_em','revisao','sincronizacao_ate','sharepoint_registrado') THEN CONTINUE; END IF;
      IF (_o -> _k) IS DISTINCT FROM (_n -> _k) THEN
        _antes := _antes || jsonb_build_object(_k, _o -> _k);
        _depois := _depois || jsonb_build_object(_k, _n -> _k);
      END IF;
    END LOOP;
    IF _depois = '{}' THEN RETURN NULL; END IF;
  ELSIF TG_OP = 'INSERT' THEN _depois := _n;
  ELSE _antes := _o;
  END IF;

  IF _uid IS NOT NULL THEN
    SELECT nullif(full_name,'') INTO _nome FROM profiles WHERE id = _uid;
  END IF;

  _verbo := CASE TG_OP WHEN 'INSERT' THEN 'Adicionou' WHEN 'UPDATE' THEN 'Editou' ELSE 'Excluiu' END;

  CASE TG_TABLE_NAME
    WHEN 'perfis' THEN _modulo := 'Perfis'; _artigo := 'o perfil'; _alvo := _r->>'nome';
    WHEN 'perfil_permissoes' THEN
      _modulo := 'Permissões';
      SELECT nome INTO _alvo FROM perfis WHERE id = (_r->>'perfil_id')::uuid;
      _alvo := 'Perfil: ' || coalesce(_alvo, '-');
      _acao := CASE TG_OP WHEN 'INSERT' THEN 'Concedeu a permissão ' ELSE 'Removeu a permissão ' END || (_r->>'permissao');
    WHEN 'usuario_perfis' THEN
      _modulo := 'Perfis';
      SELECT 'Usuário: ' || full_name INTO _alvo FROM profiles WHERE id = (_r->>'usuario_id')::uuid;
      SELECT nome INTO _k FROM perfis WHERE id = (_r->>'perfil_id')::uuid;
      _acao := CASE TG_OP WHEN 'INSERT' THEN 'Adicionou o perfil ' ELSE 'Removeu o perfil ' END || coalesce(_k, '-');
    WHEN 'benefits' THEN _modulo := 'Benefícios'; _artigo := 'o benefício'; _alvo := _r->>'title';
    WHEN 'partners' THEN _modulo := 'Parceiros'; _artigo := 'o parceiro'; _alvo := _r->>'name';
    WHEN 'reward_programs' THEN _modulo := 'Recompensas'; _artigo := 'o programa de recompensas'; _alvo := _r->>'title';
    WHEN 'avisos' THEN
      _modulo := 'Avisos'; _artigo := 'o aviso'; _alvo := _r->>'titulo';
      IF TG_OP = 'UPDATE' AND (_o->>'arquivado_em') IS NULL AND (_n->>'arquivado_em') IS NOT NULL THEN _acao := 'Arquivou o aviso'; END IF;
      IF TG_OP = 'INSERT' THEN _acao := 'Publicou o aviso'; END IF;
    WHEN 'formularios' THEN _modulo := 'Formulários'; _artigo := 'o formulário'; _alvo := _r->>'titulo';
    WHEN 'questionarios_internos' THEN _modulo := 'Formulários'; _artigo := 'o formulário interno'; _alvo := _r->>'titulo';
    WHEN 'documentos' THEN _modulo := 'Formulários'; _artigo := 'o documento'; _alvo := _r->>'titulo';
    WHEN 'site_content' THEN _modulo := 'Textos do portal'; _artigo := 'o texto'; _alvo := _r->>'key';
    ELSE _modulo := TG_TABLE_NAME; _artigo := 'o registro'; _alvo := '';
  END CASE;

  INSERT INTO auditoria_logs (autor_id, autor_nome, modulo, operacao, acao, alvo, antes, depois)
  VALUES (_uid, coalesce(_nome, CASE WHEN _uid IS NULL THEN 'Sistema' ELSE 'Usuário' END), _modulo, TG_OP,
          coalesce(_acao, _verbo || ' ' || _artigo), coalesce(_alvo, ''), _antes, _depois);
  RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.auditoria_registrar() FROM PUBLIC, anon, authenticated;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['perfis','perfil_permissoes','usuario_perfis','benefits','partners','reward_programs','avisos','formularios','questionarios_internos','documentos','site_content'] LOOP
    EXECUTE format('CREATE TRIGGER auditoria_%1$s AFTER INSERT OR UPDATE OR DELETE ON public.%1$I FOR EACH ROW EXECUTE FUNCTION public.auditoria_registrar()', t);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.listar_auditoria(_autor uuid, _modulo text, _de date, _ate date, _limite integer, _deslocamento integer)
RETURNS TABLE(id uuid, criado_em timestamptz, autor_id uuid, autor_nome text, modulo text, operacao text, acao text, alvo text, antes jsonb, depois jsonb, total bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT (usuario_tem_permissao(auth.uid(),'admin.usuarios') OR usuario_tem_permissao(auth.uid(),'admin.perfis')) THEN
    RAISE EXCEPTION 'Acesso negado' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT l.id, l.criado_em, l.autor_id, l.autor_nome, l.modulo, l.operacao, l.acao, l.alvo, l.antes, l.depois, count(*) OVER()
  FROM auditoria_logs l
  WHERE (_autor IS NULL OR l.autor_id = _autor)
    AND (_modulo IS NULL OR l.modulo = _modulo)
    AND (_de IS NULL OR l.criado_em >= (_de::timestamp AT TIME ZONE 'America/Sao_Paulo'))
    AND (_ate IS NULL OR l.criado_em < ((_ate + 1)::timestamp AT TIME ZONE 'America/Sao_Paulo'))
  ORDER BY l.criado_em DESC
  LIMIT least(greatest(coalesce(_limite,50),1),200) OFFSET greatest(coalesce(_deslocamento,0),0);
END $$;
REVOKE ALL ON FUNCTION public.listar_auditoria(uuid,text,date,date,integer,integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.listar_auditoria(uuid,text,date,date,integer,integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.autores_auditoria()
RETURNS TABLE(id uuid, nome text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT (usuario_tem_permissao(auth.uid(),'admin.usuarios') OR usuario_tem_permissao(auth.uid(),'admin.perfis')) THEN
    RAISE EXCEPTION 'Acesso negado' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY SELECT DISTINCT ON (l.autor_id) l.autor_id, l.autor_nome FROM auditoria_logs l WHERE l.autor_id IS NOT NULL ORDER BY l.autor_id, l.criado_em DESC;
END $$;
REVOKE ALL ON FUNCTION public.autores_auditoria() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.autores_auditoria() TO authenticated;