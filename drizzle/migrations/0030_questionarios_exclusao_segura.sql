ALTER TABLE public.questionarios_internos ADD COLUMN excluindo boolean NOT NULL DEFAULT false;
ALTER TABLE public.questionarios_internos ADD COLUMN sincronizacao_ate timestamptz;
CREATE FUNCTION public.iniciar_exclusao_questionario(_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NOT public.is_active_user(auth.uid()) OR NOT public.tem_permissao('formularios.gerenciar') THEN RAISE EXCEPTION 'Sem permissão'; END IF;
 PERFORM 1 FROM public.questionarios_internos WHERE id=_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Questionário não encontrado'; END IF;
 IF EXISTS(SELECT 1 FROM public.questionarios_internos WHERE id=_id AND sincronizacao_ate>now()) THEN RAISE EXCEPTION 'Sincronização em andamento. Tente novamente em alguns instantes'; END IF;
 UPDATE public.questionarios_internos SET excluindo=true WHERE id=_id;
END $$;
CREATE FUNCTION public.reservar_registro_questionario(_id uuid) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 UPDATE public.questionarios_internos SET sincronizacao_ate=now()+interval '5 minutes' WHERE id=_id AND NOT excluindo AND (sincronizacao_ate IS NULL OR sincronizacao_ate<=now());
 RETURN FOUND;
END $$;
CREATE FUNCTION public.liberar_registro_questionario(_id uuid) RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$ UPDATE public.questionarios_internos SET sincronizacao_ate=NULL WHERE id=_id $$;
CREATE FUNCTION public.finalizar_exclusao_questionario(_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 PERFORM 1 FROM public.questionarios_internos WHERE id=_id AND excluindo FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Exclusão não iniciada'; END IF;
 DELETE FROM public.questionarios_respostas WHERE questionario_id=_id;
 DELETE FROM public.questionarios_participacoes WHERE questionario_id=_id;
 DELETE FROM public.questionarios_internos WHERE id=_id AND excluindo;
END $$;
CREATE FUNCTION public.questionario_bloquear_exclusao() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE bloqueado boolean;
BEGIN
 IF TG_TABLE_NAME='questionarios_participacoes' THEN
 SELECT excluindo INTO bloqueado FROM public.questionarios_internos WHERE id=NEW.questionario_id FOR UPDATE;
 ELSE bloqueado=OLD.excluindo; END IF;
 IF bloqueado THEN RAISE EXCEPTION 'Formulário em exclusão'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER questionario_bloquear_resposta BEFORE INSERT ON public.questionarios_participacoes FOR EACH ROW EXECUTE FUNCTION public.questionario_bloquear_exclusao();
CREATE TRIGGER questionario_bloquear_edicao BEFORE UPDATE OF titulo,descricao,perguntas ON public.questionarios_internos FOR EACH ROW EXECUTE FUNCTION public.questionario_bloquear_exclusao();
CREATE OR REPLACE FUNCTION public.listar_questionarios() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NOT public.is_active_user(auth.uid()) THEN RAISE EXCEPTION 'Profissional inativo'; END IF;
 RETURN COALESCE((SELECT jsonb_agg(jsonb_build_object('id',q.id,'titulo',q.titulo,'descricao',q.descricao,'anonimo',q.anonimo,'perguntas',q.perguntas,'excluindo',q.excluindo,'respondido',EXISTS(SELECT 1 FROM public.questionarios_participacoes p WHERE p.questionario_id=q.id AND p.usuario_id=auth.uid())) ORDER BY q.criado_em DESC) FROM public.questionarios_internos q WHERE NOT q.excluindo OR public.tem_permissao('formularios.gerenciar')),'[]'::jsonb);
END $$;
REVOKE ALL ON FUNCTION public.iniciar_exclusao_questionario(uuid),public.reservar_registro_questionario(uuid),public.liberar_registro_questionario(uuid),public.finalizar_exclusao_questionario(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.iniciar_exclusao_questionario(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reservar_registro_questionario(uuid),public.liberar_registro_questionario(uuid),public.finalizar_exclusao_questionario(uuid) TO service_role;