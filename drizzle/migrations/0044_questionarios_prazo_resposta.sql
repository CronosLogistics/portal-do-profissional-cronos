ALTER TABLE public.questionarios_internos ADD COLUMN expira_em date;
ALTER TABLE public.questionarios_rascunhos ADD COLUMN expira_em date;
COMMENT ON COLUMN public.questionarios_internos.expira_em IS 'Optional inclusive response deadline in America/Sao_Paulo; NULL means no deadline. Existing answers are preserved.';
CREATE FUNCTION public.questionario_prazo_vigente(_prazo date) RETURNS boolean LANGUAGE sql VOLATILE SET search_path=public AS $$ SELECT _prazo IS NULL OR (clock_timestamp() AT TIME ZONE 'America/Sao_Paulo')::date <= _prazo $$;
CREATE FUNCTION public.questionario_validar_prazo() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE prazo date;
BEGIN
 IF TG_TABLE_NAME='questionarios_participacoes' THEN
  SELECT expira_em INTO prazo FROM public.questionarios_internos WHERE id=NEW.questionario_id FOR UPDATE;
  IF NOT public.questionario_prazo_vigente(prazo) THEN RAISE EXCEPTION 'Prazo de resposta encerrado'; END IF;
 ELSE
  IF TG_OP='INSERT' OR NEW.expira_em IS DISTINCT FROM OLD.expira_em THEN
   IF NOT public.questionario_prazo_vigente(NEW.expira_em) THEN RAISE EXCEPTION 'Escolha uma data de expiração a partir de hoje'; END IF;
  END IF;
  IF TG_OP='UPDATE' AND OLD.excluindo THEN RAISE EXCEPTION 'Formulário em exclusão'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER questionario_prazo_resposta BEFORE INSERT ON public.questionarios_participacoes FOR EACH ROW EXECUTE FUNCTION public.questionario_validar_prazo();
CREATE TRIGGER questionario_prazo_edicao BEFORE INSERT OR UPDATE OF expira_em ON public.questionarios_internos FOR EACH ROW EXECUTE FUNCTION public.questionario_validar_prazo();
CREATE FUNCTION public.criar_questionario_com_prazo(_titulo text,_descricao text,_anonimo boolean,_perguntas jsonb,_expira_em date) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE novo uuid;
BEGIN
 novo := public.criar_questionario(_titulo,_descricao,_anonimo,_perguntas);
 UPDATE public.questionarios_internos SET expira_em=_expira_em WHERE id=novo;
 RETURN novo;
END $$;
CREATE FUNCTION public.editar_questionario_com_prazo(_id uuid,_titulo text,_descricao text,_perguntas jsonb,_expira_em date) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 PERFORM public.editar_questionario(_id,_titulo,_descricao,_perguntas);
 UPDATE public.questionarios_internos SET expira_em=_expira_em WHERE id=_id;
END $$;
REVOKE ALL ON FUNCTION public.criar_questionario_com_prazo(text,text,boolean,jsonb,date),public.editar_questionario_com_prazo(uuid,text,text,jsonb,date),public.questionario_validar_prazo() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.criar_questionario_com_prazo(text,text,boolean,jsonb,date),public.editar_questionario_com_prazo(uuid,text,text,jsonb,date) TO authenticated;
CREATE OR REPLACE FUNCTION public.listar_questionarios() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NOT public.is_active_user(auth.uid()) THEN RAISE EXCEPTION 'Profissional inativo'; END IF;
 RETURN COALESCE((SELECT jsonb_agg(jsonb_build_object('id',q.id,'titulo',q.titulo,'descricao',q.descricao,'anonimo',q.anonimo,'perguntas',q.perguntas,'excluindo',q.excluindo,'expira_em',q.expira_em,'expirado',NOT public.questionario_prazo_vigente(q.expira_em),'respondido',EXISTS(SELECT 1 FROM public.questionarios_participacoes p WHERE p.questionario_id=q.id AND p.usuario_id=auth.uid())) ORDER BY q.criado_em DESC) FROM public.questionarios_internos q WHERE (NOT q.excluindo OR public.tem_permissao('formularios.gerenciar')) AND (public.questionario_prazo_vigente(q.expira_em) OR public.tem_permissao('formularios.gerenciar') OR EXISTS(SELECT 1 FROM public.questionarios_participacoes p WHERE p.questionario_id=q.id AND p.usuario_id=auth.uid()))),'[]'::jsonb);
END $$;
CREATE OR REPLACE FUNCTION public.contar_questionarios_pendentes() RETURNS integer LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path=public AS $$ SELECT CASE WHEN NOT public.is_active_user(auth.uid()) THEN 0 ELSE (SELECT count(*)::integer FROM public.questionarios_internos q WHERE NOT q.excluindo AND public.questionario_prazo_vigente(q.expira_em) AND NOT EXISTS(SELECT 1 FROM public.questionarios_participacoes p WHERE p.questionario_id=q.id AND p.usuario_id=auth.uid())) END $$;