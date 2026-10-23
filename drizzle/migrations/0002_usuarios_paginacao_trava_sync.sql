CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA extensions;

ALTER TABLE public.status_sincronizacao
  ADD COLUMN IF NOT EXISTS origem text,
  ADD COLUMN IF NOT EXISTS disparado_por uuid,
  ADD COLUMN IF NOT EXISTS em_execucao_desde timestamptz;

INSERT INTO public.status_sincronizacao (id) VALUES (true) ON CONFLICT (id) DO NOTHING;

-- Reserva a execução: só uma sincronização por vez (trava expira em 10 minutos).
CREATE OR REPLACE FUNCTION public.reservar_sincronizacao()
RETURNS boolean LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path = public AS $$
  WITH r AS (
    UPDATE public.status_sincronizacao SET em_execucao_desde = now()
    WHERE id = true AND (em_execucao_desde IS NULL OR em_execucao_desde < now() - interval '10 minutes')
    RETURNING 1
  ) SELECT EXISTS (SELECT 1 FROM r);
$$;
REVOKE ALL ON FUNCTION public.reservar_sincronizacao() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reservar_sincronizacao() TO service_role;

-- Listagem paginada de profissionais, só para administradores.
CREATE OR REPLACE FUNCTION public.admin_listar_profissionais(_busca text, _filtro text, _limite int, _deslocamento int)
RETURNS TABLE (
  id uuid, email text, full_name text, employee_id text, is_active boolean, entra_oid text,
  primeiro_acesso timestamptz, ultimo_acesso timestamptz, sincronizado_em timestamptz,
  perfil public.app_role, total bigint
) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, extensions AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Acesso restrito a administradores.';
  END IF;
  RETURN QUERY
  WITH base AS (
    SELECT p.*, (
      SELECT r.role FROM public.user_roles r WHERE r.user_id = p.id
      ORDER BY CASE r.role WHEN 'admin' THEN 3 WHEN 'rh' THEN 2 ELSE 1 END DESC LIMIT 1
    ) AS papel
    FROM public.profiles p
    WHERE (coalesce(_busca, '') = ''
        OR unaccent(lower(p.full_name)) LIKE '%' || unaccent(lower(_busca)) || '%'
        OR unaccent(lower(p.email)) LIKE '%' || unaccent(lower(_busca)) || '%')
  ), f AS (
    SELECT * FROM base b WHERE
      CASE coalesce(_filtro, 'todos')
        WHEN 'ativos' THEN b.is_active
        WHEN 'inativos' THEN NOT b.is_active
        WHEN 'com-perfil' THEN b.papel IN ('admin', 'rh')
        ELSE true END
  )
  SELECT f.id, f.email, f.full_name, f.employee_id, f.is_active, f.entra_oid,
         f.primeiro_acesso, f.ultimo_acesso, f.sincronizado_em,
         coalesce(f.papel, 'funcionario'::public.app_role), count(*) OVER ()
  FROM f ORDER BY unaccent(lower(f.full_name)), f.email
  LIMIT greatest(1, least(coalesce(_limite, 50), 100)) OFFSET greatest(0, coalesce(_deslocamento, 0));
END $$;
REVOKE ALL ON FUNCTION public.admin_listar_profissionais(text, text, int, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_listar_profissionais(text, text, int, int) TO authenticated;

-- Contagens gerais para os cartões do topo.
CREATE OR REPLACE FUNCTION public.admin_contagem_profissionais()
RETURNS TABLE (total bigint, ativos bigint, inativos bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Acesso restrito a administradores.';
  END IF;
  RETURN QUERY SELECT count(*), count(*) FILTER (WHERE is_active), count(*) FILTER (WHERE NOT is_active) FROM public.profiles;
END $$;
REVOKE ALL ON FUNCTION public.admin_contagem_profissionais() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_contagem_profissionais() TO authenticated;