ALTER TABLE public.perfis ADD COLUMN departamento_sp_id text, ADD COLUMN nivel_departamento text;
CREATE UNIQUE INDEX perfis_departamento_nivel_unico ON public.perfis(departamento_sp_id,nivel_departamento) WHERE departamento_sp_id IS NOT NULL;
ALTER TABLE public.perfil_permissoes DROP CONSTRAINT perfil_permissoes_permissao_check;
ALTER TABLE public.perfil_permissoes ADD CONSTRAINT perfil_permissoes_permissao_check CHECK (permissao = ANY(ARRAY['admin.usuarios','admin.perfis','avisos.publicar','avisos.gerenciar','avisos.insider','conteudo.editar','documentos.gerenciar','formularios.gerenciar','pendencias.liderados']));
CREATE TABLE public.departamentos_portal (id text PRIMARY KEY,nome text NOT NULL,atualizado_em timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.departamentos_portal TO authenticated;
GRANT ALL ON public.departamentos_portal TO service_role;
ALTER TABLE public.departamentos_portal ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ativos consultam departamentos" ON public.departamentos_portal FOR SELECT TO authenticated USING(public.is_active_user(auth.uid()));
CREATE TABLE public.profissional_departamento (usuario_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,departamento_id text REFERENCES public.departamentos_portal(id),atualizado_em timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.profissional_departamento TO authenticated;
GRANT ALL ON public.profissional_departamento TO service_role;
ALTER TABLE public.profissional_departamento ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Consulta setor proprio ou administracao" ON public.profissional_departamento FOR SELECT TO authenticated USING (usuario_id=auth.uid() OR public.tem_permissao('admin.usuarios'));
CREATE TABLE public.departamento_liderados (departamento_id text NOT NULL REFERENCES public.departamentos_portal(id),lider_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,liderado_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,PRIMARY KEY(departamento_id,lider_id,liderado_id),CHECK(lider_id<>liderado_id));
GRANT ALL ON public.departamento_liderados TO service_role;
ALTER TABLE public.departamento_liderados ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.departamentos_sincronizacao (id boolean PRIMARY KEY DEFAULT true CHECK(id),ativada boolean NOT NULL DEFAULT false,atualizado_em timestamptz,em_execucao_desde timestamptz,erro text);
GRANT ALL ON public.departamentos_sincronizacao TO service_role;
ALTER TABLE public.departamentos_sincronizacao ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION public.usuario_tem_permissao(_user_id uuid,_permissao text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
SELECT EXISTS(SELECT 1 FROM public.usuario_perfis up JOIN public.perfis pf ON pf.id=up.perfil_id AND pf.ativo JOIN public.profiles p ON p.id=up.usuario_id AND p.is_active WHERE up.usuario_id=_user_id AND (pf.sistema OR ((pf.departamento_sp_id IS NOT NULL OR NOT EXISTS(SELECT 1 FROM public.departamentos_sincronizacao WHERE id AND ativada)) AND EXISTS(SELECT 1 FROM public.perfil_permissoes pp WHERE pp.perfil_id=pf.id AND pp.permissao=_permissao))));
$$;
CREATE OR REPLACE FUNCTION public.minhas_permissoes() RETURNS text[] LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT coalesce(array_agg(c),'{}') FROM unnest(ARRAY['admin.usuarios','admin.perfis','avisos.publicar','avisos.gerenciar','avisos.insider','conteudo.editar','documentos.gerenciar','formularios.gerenciar','pendencias.liderados']) c WHERE public.usuario_tem_permissao(auth.uid(),c); $$;
CREATE OR REPLACE FUNCTION public.reservar_departamentos() RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
INSERT INTO public.departamentos_sincronizacao(id) VALUES(true) ON CONFLICT(id) DO NOTHING;
UPDATE public.departamentos_sincronizacao SET em_execucao_desde=now(),erro=null WHERE id AND (em_execucao_desde IS NULL OR em_execucao_desde < now()-interval '10 minutes');
RETURN FOUND;
END; $$;
REVOKE ALL ON FUNCTION public.reservar_departamentos() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reservar_departamentos() TO service_role;
CREATE OR REPLACE FUNCTION public.aplicar_departamentos(_snapshot jsonb) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE d jsonb; n jsonb; pessoa jsonb; vinculo jsonb; rel jsonb; perfil_id uuid; usuario uuid; lider uuid; liderado uuid; codigo text; total integer:=0;
BEGIN
IF jsonb_typeof(_snapshot->'departamentos')<>'array' OR jsonb_array_length(_snapshot->'departamentos')=0 THEN RAISE EXCEPTION 'Consulta de departamentos vazia ou incompleta'; END IF;
IF jsonb_typeof(_snapshot->'pessoas')<>'array' OR jsonb_typeof(_snapshot->'hierarquia')<>'array' THEN RAISE EXCEPTION 'Consulta incompleta'; END IF;
PERFORM pg_advisory_xact_lock(730042);
FOR d IN SELECT value FROM jsonb_array_elements(_snapshot->'departamentos') LOOP
INSERT INTO public.departamentos_portal(id,nome) VALUES(d->>'id',d->>'nome') ON CONFLICT(id) DO UPDATE SET nome=excluded.nome,atualizado_em=now();
FOR n IN SELECT value FROM jsonb_array_elements(d->'perfis') LOOP
IF n->>'nivel' NOT IN ('lider','coordenador','supervisor','liderado') THEN RAISE EXCEPTION 'Nivel invalido'; END IF;
SELECT id INTO perfil_id FROM public.perfis WHERE departamento_sp_id=d->>'id' AND nivel_departamento=n->>'nivel';
IF perfil_id IS NULL THEN
INSERT INTO public.perfis(nome,descricao,sistema,ativo,departamento_sp_id,nivel_departamento) VALUES((d->>'nome')||' — '||CASE n->>'nivel' WHEN 'lider' THEN 'Líder Direto' WHEN 'coordenador' THEN 'Coordenador/Gerente' WHEN 'supervisor' THEN 'Supervisor' ELSE 'Liderados' END,'Permissões sincronizadas da lista Departamentos do SharePoint',false,true,d->>'id',n->>'nivel') RETURNING id INTO perfil_id;
ELSE
UPDATE public.perfis SET nome=(d->>'nome')||' — '||CASE n->>'nivel' WHEN 'lider' THEN 'Líder Direto' WHEN 'coordenador' THEN 'Coordenador/Gerente' WHEN 'supervisor' THEN 'Supervisor' ELSE 'Liderados' END,ativo=true WHERE id=perfil_id AND NOT sistema;
END IF;
DELETE FROM public.perfil_permissoes WHERE perfil_permissoes.perfil_id=aplicar_departamentos.perfil_id;
FOR codigo IN SELECT jsonb_array_elements_text(n->'permissoes') LOOP
INSERT INTO public.perfil_permissoes(perfil_id,permissao) VALUES(perfil_id,codigo) ON CONFLICT DO NOTHING;
END LOOP;
END LOOP;
END LOOP;
UPDATE public.perfis SET ativo=false WHERE departamento_sp_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(_snapshot->'departamentos') x WHERE x->>'id'=departamento_sp_id);
DELETE FROM public.usuario_perfis up USING public.perfis pf WHERE up.perfil_id=pf.id AND pf.departamento_sp_id IS NOT NULL AND NOT pf.sistema;
DELETE FROM public.profissional_departamento WHERE usuario_id IS NOT NULL;
DELETE FROM public.departamento_liderados WHERE lider_id IS NOT NULL;
FOR pessoa IN SELECT value FROM jsonb_array_elements(_snapshot->'pessoas') LOOP
SELECT CASE WHEN count(*)=1 THEN (array_agg(id))[1] ELSE null END INTO usuario FROM public.profiles WHERE lower(trim(email))=pessoa->>'email' AND is_active;
IF usuario IS NULL THEN CONTINUE; END IF;
INSERT INTO public.profissional_departamento(usuario_id,departamento_id) VALUES(usuario,nullif(pessoa->>'departamento',''));
FOR vinculo IN SELECT value FROM jsonb_array_elements(pessoa->'vinculos') LOOP
INSERT INTO public.usuario_perfis(usuario_id,perfil_id) SELECT usuario,id FROM public.perfis WHERE departamento_sp_id=vinculo->>'departamento' AND nivel_departamento=vinculo->>'nivel' AND ativo AND NOT sistema ON CONFLICT DO NOTHING;
END LOOP;
total:=total+1;
END LOOP;
FOR rel IN SELECT value FROM jsonb_array_elements(_snapshot->'hierarquia') LOOP
SELECT CASE WHEN count(*)=1 THEN (array_agg(id))[1] ELSE null END INTO lider FROM public.profiles WHERE lower(trim(email))=rel->>'lider' AND is_active;
SELECT CASE WHEN count(*)=1 THEN (array_agg(id))[1] ELSE null END INTO liderado FROM public.profiles WHERE lower(trim(email))=rel->>'liderado' AND is_active;
IF lider IS NOT NULL AND liderado IS NOT NULL AND lider<>liderado THEN INSERT INTO public.departamento_liderados VALUES(rel->>'departamento',lider,liderado) ON CONFLICT DO NOTHING; END IF;
END LOOP;
UPDATE public.departamentos_sincronizacao SET ativada=true,atualizado_em=now(),em_execucao_desde=null,erro=null WHERE id;
RETURN total;
END; $$;
REVOKE ALL ON FUNCTION public.aplicar_departamentos(jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.aplicar_departamentos(jsonb) TO service_role;
CREATE OR REPLACE FUNCTION public.meu_escopo_departamento() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
SELECT jsonb_build_object('departamento',(SELECT d.nome FROM public.profissional_departamento pd JOIN public.departamentos_portal d ON d.id=pd.departamento_id WHERE pd.usuario_id=auth.uid()),'gestaoPessoas',CASE WHEN EXISTS(SELECT 1 FROM public.departamentos_sincronizacao WHERE id AND ativada) THEN EXISTS(SELECT 1 FROM public.usuario_perfis up JOIN public.perfis pf ON pf.id=up.perfil_id AND pf.ativo JOIN public.departamentos_portal d ON d.id=pf.departamento_sp_id WHERE up.usuario_id=auth.uid() AND upper(trim(d.nome)) IN ('GESTÃO DE PESSOAS','ADMINISTRATIVO E GESTÃO DE PESSOAS')) ELSE EXISTS(SELECT 1 FROM public.usuario_perfis up JOIN public.perfis pf ON pf.id=up.perfil_id AND pf.ativo WHERE up.usuario_id=auth.uid() AND pf.nome='Gestão de Pessoas') END,'emails',coalesce((SELECT jsonb_agg(email) FROM (SELECT p.email FROM public.profiles p WHERE p.id=auth.uid() AND p.is_active UNION SELECT p.email FROM public.departamento_liderados h JOIN public.profiles p ON p.id=h.liderado_id AND p.is_active JOIN public.perfis pf ON pf.departamento_sp_id=h.departamento_id AND pf.ativo JOIN public.usuario_perfis up ON up.perfil_id=pf.id AND up.usuario_id=auth.uid() WHERE h.lider_id=auth.uid() AND public.is_active_user(auth.uid()) AND EXISTS(SELECT 1 FROM public.perfil_permissoes pp WHERE pp.perfil_id=pf.id AND pp.permissao='pendencias.liderados')) e),'[]'::jsonb)) WHERE public.is_active_user(auth.uid());
$$;
REVOKE ALL ON FUNCTION public.meu_escopo_departamento() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.meu_escopo_departamento() TO authenticated,service_role;
CREATE OR REPLACE FUNCTION public.proteger_perfil_departamento() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
DECLARE pf uuid;
BEGIN
IF coalesce(current_setting('request.jwt.claim.role',true),'')='service_role' OR coalesce(current_setting('request.jwt.claims',true),'{}')::jsonb->>'role'='service_role' THEN IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF; END IF;
IF TG_TABLE_NAME='perfis' THEN
IF TG_OP IN ('UPDATE','DELETE') AND OLD.departamento_sp_id IS NOT NULL THEN RAISE EXCEPTION 'Este perfil é definido pelo SharePoint.'; END IF;
IF TG_OP IN ('UPDATE','INSERT') AND NEW.departamento_sp_id IS NOT NULL THEN RAISE EXCEPTION 'Este perfil é definido pelo SharePoint.'; END IF;
ELSE
IF TG_OP='DELETE' THEN pf:=OLD.perfil_id; ELSE pf:=NEW.perfil_id; END IF;
IF EXISTS(SELECT 1 FROM public.perfis WHERE id=pf AND departamento_sp_id IS NOT NULL) THEN RAISE EXCEPTION 'Este perfil é definido pelo SharePoint.'; END IF;
END IF;
IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END; $$;
CREATE TRIGGER perfis_departamento_protegidos BEFORE INSERT OR UPDATE OR DELETE ON public.perfis FOR EACH ROW EXECUTE FUNCTION public.proteger_perfil_departamento();
CREATE TRIGGER permissoes_departamento_protegidas BEFORE INSERT OR UPDATE OR DELETE ON public.perfil_permissoes FOR EACH ROW EXECUTE FUNCTION public.proteger_perfil_departamento();
CREATE TRIGGER membros_departamento_protegidos BEFORE INSERT OR UPDATE OR DELETE ON public.usuario_perfis FOR EACH ROW EXECUTE FUNCTION public.proteger_perfil_departamento();
COMMENT ON COLUMN public.perfis.departamento_sp_id IS 'SharePoint-managed profile; legacy manual memberships remain for historical notices but no longer grant permissions after department sync activation.';