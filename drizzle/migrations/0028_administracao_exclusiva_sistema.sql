CREATE OR REPLACE FUNCTION public.usuario_tem_permissao(_user_id uuid,_permissao text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
SELECT EXISTS(SELECT 1 FROM public.usuario_perfis up JOIN public.perfis pf ON pf.id=up.perfil_id AND pf.ativo JOIN public.profiles p ON p.id=up.usuario_id AND p.is_active WHERE up.usuario_id=_user_id AND ((pf.sistema AND pf.departamento_sp_id IS NULL) OR (_permissao NOT LIKE 'admin.%' AND NOT pf.sistema AND (pf.departamento_sp_id IS NOT NULL OR NOT EXISTS(SELECT 1 FROM public.departamentos_sincronizacao WHERE id AND ativada)) AND EXISTS(SELECT 1 FROM public.perfil_permissoes pp WHERE pp.perfil_id=pf.id AND pp.permissao=_permissao))));
$$;
CREATE FUNCTION public.restringir_permissao_administrativa() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
IF NEW.permissao LIKE 'admin.%' AND NOT EXISTS(SELECT 1 FROM public.perfis p WHERE p.id=NEW.perfil_id AND p.sistema AND p.departamento_sp_id IS NULL) THEN
 IF TG_OP='INSERT' THEN RETURN NULL; END IF;
 RAISE EXCEPTION 'Administração exclusiva do perfil Administrador de sistema';
END IF;
RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.restringir_permissao_administrativa() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER restringir_administracao BEFORE INSERT OR UPDATE ON public.perfil_permissoes FOR EACH ROW EXECUTE FUNCTION public.restringir_permissao_administrativa();
COMMENT ON FUNCTION public.usuario_tem_permissao(uuid,text) IS 'Administrative permissions require active system Administrator membership, never department or manual profile permissions.';