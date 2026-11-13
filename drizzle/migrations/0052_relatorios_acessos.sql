CREATE TABLE public.historico_acessos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  acessado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX historico_acessos_data_idx ON public.historico_acessos(acessado_em);
CREATE INDEX historico_acessos_usuario_idx ON public.historico_acessos(usuario_id, acessado_em);
GRANT ALL ON public.historico_acessos TO service_role;
ALTER TABLE public.historico_acessos ENABLE ROW LEVEL SECURITY;

INSERT INTO public.historico_acessos(usuario_id, acessado_em)
SELECT id, primeiro_acesso FROM public.profiles WHERE primeiro_acesso IS NOT NULL
UNION
SELECT id, ultimo_acesso FROM public.profiles WHERE ultimo_acesso IS NOT NULL AND ultimo_acesso IS DISTINCT FROM primeiro_acesso;

INSERT INTO public.permissoes_individuais(usuario_id, permissao)
SELECT usuario_id, 'acessos.relatorios' FROM public.permissoes_individuais WHERE permissao='avisos.interacao'
ON CONFLICT DO NOTHING;

-- Admins (system profile), individual grants and current Gestão de Pessoas / Qualidade departments.
CREATE OR REPLACE FUNCTION public.pode_ver_relatorios_acesso() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT public.usuario_tem_permissao(auth.uid(),'acessos.relatorios')
  OR EXISTS(SELECT 1 FROM public.profissional_departamento pd JOIN public.departamentos_portal d ON d.id=pd.departamento_id JOIN public.profiles p ON p.id=pd.usuario_id AND p.is_active
            WHERE pd.usuario_id=auth.uid() AND (upper(d.nome) LIKE '%GESTÃO DE PESSOAS%' OR upper(d.nome) LIKE '%QUALIDADE%'));
$$;
GRANT EXECUTE ON FUNCTION public.pode_ver_relatorios_acesso() TO authenticated;

CREATE OR REPLACE FUNCTION public.minhas_permissoes() RETURNS text[] LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT coalesce(array_agg(c),'{}'::text[]) || CASE WHEN public.pode_ver_relatorios_acesso() THEN ARRAY['acessos.relatorios'] ELSE '{}'::text[] END
  FROM unnest(ARRAY['admin.usuarios','admin.perfis','avisos.publicar','avisos.gerenciar','avisos.insider','avisos.confirmacao','avisos.interacao','conteudo.editar','documentos.gerenciar','formularios.gerenciar','pendencias.liderados']) c WHERE public.usuario_tem_permissao(auth.uid(),c);
$$;

CREATE OR REPLACE FUNCTION public.relatorio_acessos_usuarios()
RETURNS TABLE(usuario_id uuid, nome text, email text, departamento text, ativo boolean, primeiro_acesso timestamptz, ultimo_acesso timestamptz, total_acessos bigint, acessos_30d bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NOT public.pode_ver_relatorios_acesso() THEN RAISE EXCEPTION 'Sem permissão' USING ERRCODE='42501'; END IF;
  RETURN QUERY
  SELECT p.id, regexp_replace(p.full_name, '\s*-\s*Cronos Logistics\s*$', '', 'i'), p.email, d.nome, p.is_active, p.primeiro_acesso, p.ultimo_acesso,
    (SELECT count(*) FROM public.historico_acessos h WHERE h.usuario_id=p.id),
    (SELECT count(*) FROM public.historico_acessos h WHERE h.usuario_id=p.id AND h.acessado_em >= now()-interval '30 days')
  FROM public.profiles p
  LEFT JOIN public.profissional_departamento pd ON pd.usuario_id=p.id
  LEFT JOIN public.departamentos_portal d ON d.id=pd.departamento_id
  ORDER BY p.full_name;
END $$;
GRANT EXECUTE ON FUNCTION public.relatorio_acessos_usuarios() TO authenticated;

CREATE OR REPLACE FUNCTION public.relatorio_acessos_eventos(_de timestamptz)
RETURNS TABLE(usuario_id uuid, acessado_em timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NOT public.pode_ver_relatorios_acesso() THEN RAISE EXCEPTION 'Sem permissão' USING ERRCODE='42501'; END IF;
  RETURN QUERY SELECT h.usuario_id, h.acessado_em FROM public.historico_acessos h WHERE h.acessado_em >= _de ORDER BY h.acessado_em;
END $$;
GRANT EXECUTE ON FUNCTION public.relatorio_acessos_eventos(timestamptz) TO authenticated;