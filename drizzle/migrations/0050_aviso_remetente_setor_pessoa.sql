CREATE OR REPLACE FUNCTION public.rotulo_remetente_aviso(_perfil_id uuid, _autor_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT CASE
    WHEN pessoa = '' THEN coalesce(nullif(setor, ''), perfil)
    WHEN setor = '' THEN pessoa
    ELSE setor || ' — ' || pessoa
  END
  FROM (
    SELECT
      coalesce(
        nullif(btrim(d.nome), ''),
        nullif(btrim(regexp_replace(p.nome, '\s+[—–-]\s+.+$', '')), ''),
        nullif(btrim(p.nome), '')
      ) AS setor,
      coalesce(nullif(btrim(pr.full_name), ''), nullif(btrim(pr.email), ''), '') AS pessoa,
      coalesce(nullif(btrim(p.nome), ''), '') AS perfil
    FROM public.perfis p
    LEFT JOIN public.departamentos_portal d ON d.id = p.departamento_sp_id
    LEFT JOIN public.profiles pr ON pr.id = _autor_id
    WHERE p.id = _perfil_id
  ) s
$$;

REVOKE ALL ON FUNCTION public.rotulo_remetente_aviso(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rotulo_remetente_aviso(uuid, uuid) TO authenticated;
COMMENT ON FUNCTION public.rotulo_remetente_aviso(uuid, uuid) IS
  'Display label for notice sender: department/sector name plus author full name.';

CREATE OR REPLACE FUNCTION public.listar_notificacoes(
  _so_nao_lidos boolean DEFAULT false, _limite integer DEFAULT 20, _deslocamento integer DEFAULT 0,
  _so_obrigatorios boolean DEFAULT false, _aviso_id uuid DEFAULT null, _priorizar boolean DEFAULT false
)
RETURNS TABLE(id uuid, titulo text, mensagem text, perfil_nome text, publicar_em timestamptz, expira_em timestamptz,
  editado_em timestamptz, lido boolean, tipo text, exige_confirmacao boolean, confirmado_em timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH avisos AS (
    SELECT a.id, a.titulo, a.mensagem, public.rotulo_remetente_aviso(a.perfil_id, a.autor_id),
      a.publicar_em, a.expira_em, a.editado_em,
      CASE
        WHEN a.exige_confirmacao THEN c.confirmado_em IS NOT NULL
        ELSE a.publicar_em <= coalesce((SELECT primeiro_acesso FROM public.profiles WHERE id = auth.uid()), '-infinity'::timestamptz)
          OR EXISTS (SELECT 1 FROM public.avisos_leituras l WHERE l.aviso_id = a.id AND l.usuario_id = auth.uid())
      END AS lido,
      a.tipo, a.exige_confirmacao, c.confirmado_em
    FROM public.avisos a
    LEFT JOIN public.avisos_confirmacoes c ON c.aviso_id = a.id AND c.usuario_id = auth.uid()
    WHERE public.aviso_disponivel(a.id)
  ),
  v AS (
    SELECT * FROM avisos
    UNION ALL SELECT * FROM public.notificacoes_mural()
    UNION ALL SELECT * FROM public.notificacoes_mencoes()
  )
  SELECT * FROM v
  WHERE (NOT _so_nao_lidos OR NOT v.lido)
    AND (NOT _so_obrigatorios OR v.exige_confirmacao)
    AND (_aviso_id IS NULL OR v.id = _aviso_id)
  ORDER BY CASE WHEN _priorizar THEN v.exige_confirmacao AND NOT v.lido ELSE false END DESC, v.publicar_em DESC, v.id
  LIMIT least(greatest(_limite, 1), 100) OFFSET greatest(_deslocamento, 0)
$$;

CREATE OR REPLACE FUNCTION public.listar_avisos_confirmacao(
  _so_nao_lidos boolean DEFAULT false, _limite integer DEFAULT 20, _deslocamento integer DEFAULT 0,
  _so_obrigatorios boolean DEFAULT false, _aviso_id uuid DEFAULT null, _priorizar boolean DEFAULT false
)
RETURNS TABLE(id uuid, titulo text, mensagem text, perfil_nome text, publicar_em timestamptz, expira_em timestamptz,
  editado_em timestamptz, lido boolean, tipo text, exige_confirmacao boolean, confirmado_em timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH v AS (
    SELECT a.id, a.titulo, a.mensagem, public.rotulo_remetente_aviso(a.perfil_id, a.autor_id),
      a.publicar_em, a.expira_em, a.editado_em,
      CASE
        WHEN a.exige_confirmacao THEN c.confirmado_em IS NOT NULL
        ELSE a.publicar_em <= coalesce((SELECT primeiro_acesso FROM public.profiles WHERE id = auth.uid()), '-infinity'::timestamptz)
          OR EXISTS (SELECT 1 FROM public.avisos_leituras l WHERE l.aviso_id = a.id AND l.usuario_id = auth.uid())
      END AS lido,
      a.tipo, a.exige_confirmacao, c.confirmado_em
    FROM public.avisos a
    LEFT JOIN public.avisos_confirmacoes c ON c.aviso_id = a.id AND c.usuario_id = auth.uid()
    WHERE public.aviso_disponivel(a.id)
      AND (NOT _so_obrigatorios OR a.exige_confirmacao)
      AND (_aviso_id IS NULL OR a.id = _aviso_id)
  )
  SELECT * FROM v WHERE NOT _so_nao_lidos OR NOT v.lido
  ORDER BY CASE WHEN _priorizar THEN v.exige_confirmacao AND NOT v.lido ELSE false END DESC, v.publicar_em DESC, v.id
  LIMIT least(greatest(_limite, 1), 100) OFFSET greatest(_deslocamento, 0)
$$;

CREATE OR REPLACE FUNCTION public.insider_vigente()
RETURNS TABLE(id uuid, titulo text, mensagem text, perfil_nome text, publicar_em timestamptz, editado_em timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT a.id, a.titulo, a.mensagem, public.rotulo_remetente_aviso(a.perfil_id, a.autor_id), a.publicar_em, a.editado_em
  FROM public.avisos a
  WHERE public.is_active_user(auth.uid()) AND a.tipo = 'insider'
    AND public.aviso_vigente(a.publicar_em, a.expira_em, a.arquivado_em)
    AND public.aviso_para_usuario(a.id, auth.uid())
    AND (
      (a.publicar_em AT TIME ZONE 'America/Sao_Paulo')::date >= (now() AT TIME ZONE 'America/Sao_Paulo')::date - 2
      OR a.id = '9652005f-b517-4a3c-a382-9c259988fe95'::uuid
    )
  ORDER BY (a.id = '9652005f-b517-4a3c-a382-9c259988fe95'::uuid) DESC, a.publicar_em DESC
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.compilado_vigente()
RETURNS TABLE(id uuid, titulo text, mensagem text, perfil_nome text, publicar_em timestamptz, editado_em timestamptz, mes_ano text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT a.id, a.titulo, a.mensagem, public.rotulo_remetente_aviso(a.perfil_id, a.autor_id), a.publicar_em, a.editado_em, c.mes_ano
  FROM public.compilados_elogios c
  JOIN public.avisos a ON a.id = c.aviso_id
  WHERE public.is_active_user(auth.uid()) AND a.tipo = 'compilado'
    AND public.aviso_vigente(a.publicar_em, a.expira_em, a.arquivado_em)
    AND a.publicar_em > now() - interval '1 month'
  ORDER BY a.publicar_em DESC
  LIMIT 1
$$;