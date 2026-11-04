ALTER TABLE public.questionarios_respostas ADD COLUMN perguntas jsonb;
UPDATE public.questionarios_respostas r SET perguntas=q.perguntas FROM public.questionarios_internos q WHERE q.id=r.questionario_id AND r.perguntas IS NULL;
ALTER TABLE public.questionarios_internos ADD COLUMN revisao integer NOT NULL DEFAULT 1;
CREATE OR REPLACE FUNCTION public.editar_questionario(_id uuid,_titulo text,_descricao text,_perguntas jsonb) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE pergunta jsonb;
BEGIN
 IF NOT public.is_active_user(auth.uid()) OR NOT public.tem_permissao('formularios.gerenciar') THEN RAISE EXCEPTION 'Sem permissão para gerenciar formulários'; END IF;
 IF _titulo IS NULL OR length(trim(_titulo)) NOT BETWEEN 1 AND 200 OR _descricao IS NULL OR length(_descricao)>2000 OR _perguntas IS NULL OR jsonb_typeof(_perguntas)<>'array' OR jsonb_array_length(_perguntas) NOT BETWEEN 1 AND 30 THEN RAISE EXCEPTION 'Questionário inválido'; END IF;
 FOR pergunta IN SELECT value FROM jsonb_array_elements(_perguntas) LOOP
 IF jsonb_typeof(pergunta)<>'string' OR length(trim(pergunta#>>'{}')) NOT BETWEEN 1 AND 1000 THEN RAISE EXCEPTION 'Pergunta inválida'; END IF;
 END LOOP;
 UPDATE public.questionarios_internos SET titulo=trim(_titulo),descricao=trim(_descricao),perguntas=_perguntas,revisao=revisao+1,sharepoint_registrado=false WHERE id=_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Questionário não encontrado'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.editar_questionario(uuid,text,text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.editar_questionario(uuid,text,text,jsonb) TO authenticated;
CREATE OR REPLACE FUNCTION public.responder_questionario(_id uuid,_respostas jsonb) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE formulario public.questionarios_internos; resposta jsonb; novo uuid;
BEGIN
 IF NOT public.is_active_user(auth.uid()) THEN RAISE EXCEPTION 'Profissional inativo'; END IF;
 SELECT * INTO formulario FROM public.questionarios_internos WHERE id=_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Questionário não encontrado'; END IF;
 IF _respostas IS NULL OR jsonb_typeof(_respostas)<>'array' OR jsonb_array_length(_respostas)<>jsonb_array_length(formulario.perguntas) THEN RAISE EXCEPTION 'Responda todas as perguntas'; END IF;
 FOR resposta IN SELECT value FROM jsonb_array_elements(_respostas) LOOP
 IF jsonb_typeof(resposta)<>'string' OR length(trim(resposta#>>'{}')) NOT BETWEEN 1 AND 5000 THEN RAISE EXCEPTION 'Resposta inválida'; END IF;
 END LOOP;
 INSERT INTO public.questionarios_participacoes(questionario_id,usuario_id) VALUES(_id,auth.uid());
 INSERT INTO public.questionarios_respostas(questionario_id,perguntas,respostas,respondente_id) VALUES(_id,formulario.perguntas,_respostas,CASE WHEN formulario.anonimo THEN NULL ELSE auth.uid() END) RETURNING id INTO novo;
 RETURN novo;
END $$;
CREATE OR REPLACE FUNCTION public.gestao_questionario(_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE formulario public.questionarios_internos; total bigint; respondidos bigint; pendentes jsonb; respostas jsonb;
BEGIN
 IF NOT public.is_active_user(auth.uid()) OR NOT public.tem_permissao('formularios.gerenciar') THEN RAISE EXCEPTION 'Sem permissão para gerenciar formulários'; END IF;
 SELECT * INTO formulario FROM public.questionarios_internos WHERE id=_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Questionário não encontrado'; END IF;
 SELECT count(*) INTO total FROM public.profiles WHERE is_active;
 SELECT count(*) INTO respondidos FROM public.profiles u JOIN public.questionarios_participacoes p ON p.usuario_id=u.id WHERE u.is_active AND p.questionario_id=_id;
 IF NOT formulario.anonimo THEN
 SELECT COALESCE(jsonb_agg(jsonb_build_object('nome',u.full_name,'email',u.email) ORDER BY u.full_name),'[]'::jsonb) INTO pendentes FROM public.profiles u WHERE u.is_active AND NOT EXISTS(SELECT 1 FROM public.questionarios_participacoes p WHERE p.usuario_id=u.id AND p.questionario_id=_id);
 END IF;
 SELECT COALESCE(jsonb_agg(jsonb_build_object('perguntas',COALESCE(r.perguntas,formulario.perguntas),'respostas',r.respostas,'nome',CASE WHEN formulario.anonimo THEN NULL ELSE u.full_name END,'email',CASE WHEN formulario.anonimo THEN NULL ELSE u.email END) ORDER BY r.id),'[]'::jsonb) INTO respostas FROM public.questionarios_respostas r LEFT JOIN public.profiles u ON u.id=r.respondente_id WHERE r.questionario_id=_id;
 RETURN jsonb_build_object('total',total,'respondidos',respondidos,'pendentes',total-respondidos,'pessoasPendentes',pendentes,'respostas',respostas,'sharepointPendente',NOT formulario.sharepoint_registrado OR EXISTS(SELECT 1 FROM public.questionarios_respostas r WHERE r.questionario_id=_id AND NOT r.sharepoint_registrado));
END $$;
COMMENT ON COLUMN public.questionarios_respostas.perguntas IS 'Immutable question snapshot for existing answers when a questionnaire is edited; no anonymous identity or timestamps.';