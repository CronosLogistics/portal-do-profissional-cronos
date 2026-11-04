CREATE TABLE public.questionarios_internos (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), titulo text NOT NULL CHECK(length(titulo) BETWEEN 1 AND 200), descricao text NOT NULL DEFAULT '' CHECK(length(descricao)<=2000), anonimo boolean NOT NULL, perguntas jsonb NOT NULL CHECK(jsonb_typeof(perguntas)='array' AND jsonb_array_length(perguntas) BETWEEN 1 AND 30), criador_id uuid NOT NULL, criado_em timestamptz NOT NULL DEFAULT now(), sharepoint_registrado boolean NOT NULL DEFAULT false
);
GRANT SELECT ON public.questionarios_internos TO authenticated;
GRANT ALL ON public.questionarios_internos TO service_role;
ALTER TABLE public.questionarios_internos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ativos consultam questionarios" ON public.questionarios_internos FOR SELECT TO authenticated USING(public.is_active_user(auth.uid()));
CREATE TABLE public.questionarios_participacoes (questionario_id uuid NOT NULL REFERENCES public.questionarios_internos(id), usuario_id uuid NOT NULL, PRIMARY KEY(questionario_id,usuario_id));
GRANT ALL ON public.questionarios_participacoes TO service_role;
ALTER TABLE public.questionarios_participacoes ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.questionarios_respostas (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), questionario_id uuid NOT NULL REFERENCES public.questionarios_internos(id), respostas jsonb NOT NULL, respondente_id uuid, sharepoint_registrado boolean NOT NULL DEFAULT false);
GRANT ALL ON public.questionarios_respostas TO service_role;
ALTER TABLE public.questionarios_respostas ENABLE ROW LEVEL SECURITY;
CREATE FUNCTION public.criar_questionario(_titulo text,_descricao text,_anonimo boolean,_perguntas jsonb) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE novo uuid; pergunta jsonb;
BEGIN
 IF NOT public.is_active_user(auth.uid()) OR NOT public.tem_permissao('formularios.gerenciar') THEN RAISE EXCEPTION 'Sem permissão para gerenciar formulários'; END IF;
 IF _titulo IS NULL OR length(trim(_titulo)) NOT BETWEEN 1 AND 200 OR _descricao IS NULL OR length(_descricao)>2000 OR _anonimo IS NULL OR _perguntas IS NULL OR jsonb_typeof(_perguntas)<>'array' OR jsonb_array_length(_perguntas) NOT BETWEEN 1 AND 30 THEN RAISE EXCEPTION 'Questionário inválido'; END IF;
 FOR pergunta IN SELECT value FROM jsonb_array_elements(_perguntas) LOOP
  IF jsonb_typeof(pergunta)<>'string' OR length(trim(pergunta#>>'{}')) NOT BETWEEN 1 AND 1000 THEN RAISE EXCEPTION 'Pergunta inválida'; END IF;
 END LOOP;
 INSERT INTO public.questionarios_internos(titulo,descricao,anonimo,perguntas,criador_id) VALUES(trim(_titulo),trim(_descricao),_anonimo,_perguntas,auth.uid()) RETURNING id INTO novo;
 RETURN novo;
END $$;
CREATE FUNCTION public.responder_questionario(_id uuid,_respostas jsonb) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE formulario public.questionarios_internos; resposta jsonb; novo uuid;
BEGIN
 IF NOT public.is_active_user(auth.uid()) THEN RAISE EXCEPTION 'Profissional inativo'; END IF;
 SELECT * INTO formulario FROM public.questionarios_internos WHERE id=_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Questionário não encontrado'; END IF;
 IF _respostas IS NULL OR jsonb_typeof(_respostas)<>'array' OR jsonb_array_length(_respostas)<>jsonb_array_length(formulario.perguntas) THEN RAISE EXCEPTION 'Responda todas as perguntas'; END IF;
 FOR resposta IN SELECT value FROM jsonb_array_elements(_respostas) LOOP
  IF jsonb_typeof(resposta)<>'string' OR length(trim(resposta#>>'{}')) NOT BETWEEN 1 AND 5000 THEN RAISE EXCEPTION 'Resposta inválida'; END IF;
 END LOOP;
 INSERT INTO public.questionarios_participacoes(questionario_id,usuario_id) VALUES(_id,auth.uid());
 INSERT INTO public.questionarios_respostas(questionario_id,respostas,respondente_id) VALUES(_id,_respostas,CASE WHEN formulario.anonimo THEN NULL ELSE auth.uid() END) RETURNING id INTO novo;
 RETURN novo;
END $$;
CREATE FUNCTION public.listar_questionarios() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NOT public.is_active_user(auth.uid()) THEN RAISE EXCEPTION 'Profissional inativo'; END IF;
 RETURN COALESCE((SELECT jsonb_agg(jsonb_build_object('id',q.id,'titulo',q.titulo,'descricao',q.descricao,'anonimo',q.anonimo,'perguntas',q.perguntas,'respondido',EXISTS(SELECT 1 FROM public.questionarios_participacoes p WHERE p.questionario_id=q.id AND p.usuario_id=auth.uid())) ORDER BY q.criado_em DESC) FROM public.questionarios_internos q),'[]'::jsonb);
END $$;
CREATE FUNCTION public.gestao_questionario(_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
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
 SELECT COALESCE(jsonb_agg(jsonb_build_object('respostas',r.respostas,'nome',CASE WHEN formulario.anonimo THEN NULL ELSE u.full_name END,'email',CASE WHEN formulario.anonimo THEN NULL ELSE u.email END) ORDER BY r.id),'[]'::jsonb) INTO respostas FROM public.questionarios_respostas r LEFT JOIN public.profiles u ON u.id=r.respondente_id WHERE r.questionario_id=_id;
 RETURN jsonb_build_object('total',total,'respondidos',respondidos,'pendentes',total-respondidos,'pessoasPendentes',pendentes,'respostas',respostas,'sharepointPendente',NOT formulario.sharepoint_registrado OR EXISTS(SELECT 1 FROM public.questionarios_respostas r WHERE r.questionario_id=_id AND NOT r.sharepoint_registrado));
END $$;
REVOKE ALL ON FUNCTION public.criar_questionario(text,text,boolean,jsonb),public.responder_questionario(uuid,jsonb),public.listar_questionarios(),public.gestao_questionario(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.criar_questionario(text,text,boolean,jsonb),public.responder_questionario(uuid,jsonb),public.listar_questionarios(),public.gestao_questionario(uuid) TO authenticated;
COMMENT ON TABLE public.questionarios_participacoes IS 'Participation only; never linked to an anonymous response. No manager read policy.';
COMMENT ON TABLE public.questionarios_respostas IS 'Anonymous responses never store respondent IDs; manager reads are projected through gestao_questionario.';