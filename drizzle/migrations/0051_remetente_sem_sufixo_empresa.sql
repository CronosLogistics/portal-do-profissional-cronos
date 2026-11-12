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
      coalesce(
        nullif(btrim(regexp_replace(coalesce(pr.full_name, ''), '\s*[—–-]\s*Cronos Logistics\s*$', '', 'i')), ''),
        nullif(btrim(pr.email), ''), '') AS pessoa,
      coalesce(nullif(btrim(p.nome), ''), '') AS perfil
    FROM public.perfis p
    LEFT JOIN public.departamentos_portal d ON d.id = p.departamento_sp_id
    LEFT JOIN public.profiles pr ON pr.id = _autor_id
    WHERE p.id = _perfil_id
  ) s
$$;
REVOKE ALL ON FUNCTION public.rotulo_remetente_aviso(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rotulo_remetente_aviso(uuid, uuid) TO authenticated;