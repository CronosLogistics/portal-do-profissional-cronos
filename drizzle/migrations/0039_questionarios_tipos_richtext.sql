ALTER TABLE public.questionarios_internos DROP CONSTRAINT IF EXISTS questionarios_internos_descricao_check;
ALTER TABLE public.questionarios_internos ADD CONSTRAINT questionarios_internos_descricao_check CHECK (length(descricao) <= 10000);

UPDATE public.questionarios_internos q SET perguntas = COALESCE((
  SELECT jsonb_agg(
    CASE WHEN jsonb_typeof(item) = 'string' THEN jsonb_build_object('id', 'legado-' || ord::text, 'tipo', 'texto', 'enunciado', trim(item#>>'{}'))
         ELSE item END ORDER BY ord
  )
  FROM jsonb_array_elements(q.perguntas) WITH ORDINALITY AS t(item, ord)
), '[]'::jsonb)
WHERE EXISTS (SELECT 1 FROM jsonb_array_elements(q.perguntas) item WHERE jsonb_typeof(item) = 'string');

UPDATE public.questionarios_respostas r SET perguntas = COALESCE((
  SELECT jsonb_agg(
    CASE WHEN jsonb_typeof(item) = 'string' THEN jsonb_build_object('id', 'legado-' || ord::text, 'tipo', 'texto', 'enunciado', trim(item#>>'{}'))
         ELSE item END ORDER BY ord
  )
  FROM jsonb_array_elements(r.perguntas) WITH ORDINALITY AS t(item, ord)
), r.perguntas)
WHERE r.perguntas IS NOT NULL AND EXISTS (SELECT 1 FROM jsonb_array_elements(r.perguntas) item WHERE jsonb_typeof(item) = 'string');

CREATE OR REPLACE FUNCTION public.validar_perguntas_questionario(_perguntas jsonb) RETURNS void LANGUAGE plpgsql SET search_path=public AS $$
DECLARE pergunta jsonb; opcao jsonb; respondiveis int := 0; tipo text; n_opcoes int;
BEGIN
 IF _perguntas IS NULL OR jsonb_typeof(_perguntas) <> 'array' OR jsonb_array_length(_perguntas) NOT BETWEEN 1 AND 30 THEN RAISE EXCEPTION 'Questionário inválido'; END IF;
 FOR pergunta IN SELECT value FROM jsonb_array_elements(_perguntas) LOOP
  IF jsonb_typeof(pergunta) <> 'object' THEN RAISE EXCEPTION 'Pergunta inválida'; END IF;
  tipo := pergunta->>'tipo';
  IF coalesce(length(trim(pergunta->>'id')), 0) NOT BETWEEN 1 AND 80 THEN RAISE EXCEPTION 'Pergunta inválida'; END IF;
  IF tipo = 'bloco' THEN
   IF length(coalesce(pergunta->>'enunciado', '')) NOT BETWEEN 1 AND 5000 THEN RAISE EXCEPTION 'Pergunta inválida'; END IF;
  ELSIF tipo IN ('texto', 'radio', 'checkbox') THEN
   respondiveis := respondiveis + 1;
   IF length(trim(coalesce(pergunta->>'enunciado', ''))) NOT BETWEEN 1 AND 1000 THEN RAISE EXCEPTION 'Pergunta inválida'; END IF;
   IF tipo IN ('radio', 'checkbox') THEN
    IF jsonb_typeof(pergunta->'opcoes') <> 'array' THEN RAISE EXCEPTION 'Pergunta inválida'; END IF;
    n_opcoes := jsonb_array_length(pergunta->'opcoes');
    IF n_opcoes NOT BETWEEN 2 AND 20 THEN RAISE EXCEPTION 'Pergunta inválida'; END IF;
    FOR opcao IN SELECT value FROM jsonb_array_elements(pergunta->'opcoes') LOOP
     IF jsonb_typeof(opcao) <> 'string' OR length(trim(opcao#>>'{}')) NOT BETWEEN 1 AND 200 THEN RAISE EXCEPTION 'Pergunta inválida'; END IF;
    END LOOP;
   END IF;
  ELSE RAISE EXCEPTION 'Pergunta inválida';
  END IF;
 END LOOP;
 IF respondiveis < 1 THEN RAISE EXCEPTION 'Questionário inválido'; END IF;
END $$;

CREATE OR REPLACE FUNCTION public.criar_questionario(_titulo text, _descricao text, _anonimo boolean, _perguntas jsonb) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE novo uuid;
BEGIN
 IF NOT public.is_active_user(auth.uid()) OR NOT public.tem_permissao('formularios.gerenciar') THEN RAISE EXCEPTION 'Sem permissão para gerenciar formulários'; END IF;
 IF _titulo IS NULL OR length(trim(_titulo)) NOT BETWEEN 1 AND 200 OR _descricao IS NULL OR length(_descricao) > 10000 OR _anonimo IS NULL THEN RAISE EXCEPTION 'Questionário inválido'; END IF;
 PERFORM public.validar_perguntas_questionario(_perguntas);
 INSERT INTO public.questionarios_internos(titulo, descricao, anonimo, perguntas, criador_id)
 VALUES (trim(_titulo), _descricao, _anonimo, _perguntas, auth.uid()) RETURNING id INTO novo;
 RETURN novo;
END $$;

CREATE OR REPLACE FUNCTION public.editar_questionario(_id uuid, _titulo text, _descricao text, _perguntas jsonb) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NOT public.is_active_user(auth.uid()) OR NOT public.tem_permissao('formularios.gerenciar') THEN RAISE EXCEPTION 'Sem permissão para gerenciar formulários'; END IF;
 IF _titulo IS NULL OR length(trim(_titulo)) NOT BETWEEN 1 AND 200 OR _descricao IS NULL OR length(_descricao) > 10000 THEN RAISE EXCEPTION 'Questionário inválido'; END IF;
 PERFORM public.validar_perguntas_questionario(_perguntas);
 UPDATE public.questionarios_internos SET titulo = trim(_titulo), descricao = _descricao, perguntas = _perguntas, revisao = revisao + 1, sharepoint_registrado = false WHERE id = _id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Questionário não encontrado'; END IF;
END $$;

CREATE OR REPLACE FUNCTION public.responder_questionario(_id uuid, _respostas jsonb) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE formulario public.questionarios_internos; pergunta jsonb; resposta jsonb; novo uuid; i int; tipo text; opcoes jsonb; escolhida text;
BEGIN
 IF NOT public.is_active_user(auth.uid()) THEN RAISE EXCEPTION 'Profissional inativo'; END IF;
 SELECT * INTO formulario FROM public.questionarios_internos WHERE id = _id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Questionário não encontrado'; END IF;
 IF formulario.excluindo THEN RAISE EXCEPTION 'Formulário em exclusão'; END IF;
 IF _respostas IS NULL OR jsonb_typeof(_respostas) <> 'array' OR jsonb_array_length(_respostas) <> jsonb_array_length(formulario.perguntas) THEN RAISE EXCEPTION 'Responda todas as perguntas'; END IF;
 FOR i IN 0 .. jsonb_array_length(formulario.perguntas) - 1 LOOP
  pergunta := formulario.perguntas->i;
  resposta := _respostas->i;
  tipo := pergunta->>'tipo';
  IF tipo = 'bloco' THEN
   IF resposta IS DISTINCT FROM 'null'::jsonb AND resposta IS NOT NULL THEN RAISE EXCEPTION 'Resposta inválida'; END IF;
  ELSIF tipo = 'texto' THEN
   IF jsonb_typeof(resposta) <> 'string' OR length(trim(resposta#>>'{}')) NOT BETWEEN 1 AND 5000 THEN RAISE EXCEPTION 'Resposta inválida'; END IF;
  ELSIF tipo = 'radio' THEN
   IF jsonb_typeof(resposta) <> 'string' THEN RAISE EXCEPTION 'Resposta inválida'; END IF;
   escolhida := trim(resposta#>>'{}');
   IF NOT EXISTS (SELECT 1 FROM jsonb_array_elements_text(pergunta->'opcoes') o WHERE o = escolhida) THEN RAISE EXCEPTION 'Resposta inválida'; END IF;
  ELSIF tipo = 'checkbox' THEN
   IF jsonb_typeof(resposta) <> 'array' OR jsonb_array_length(resposta) < 1 OR jsonb_array_length(resposta) > 20 THEN RAISE EXCEPTION 'Resposta inválida'; END IF;
   opcoes := pergunta->'opcoes';
   IF EXISTS (
     SELECT 1 FROM jsonb_array_elements_text(resposta) escolhida(val)
     WHERE NOT EXISTS (SELECT 1 FROM jsonb_array_elements_text(opcoes) o(val) WHERE o.val = escolhida.val)
   ) OR jsonb_array_length(resposta) <> (SELECT count(DISTINCT val) FROM jsonb_array_elements_text(resposta) t(val)) THEN
    RAISE EXCEPTION 'Resposta inválida';
   END IF;
  ELSE RAISE EXCEPTION 'Resposta inválida';
  END IF;
 END LOOP;
 INSERT INTO public.questionarios_participacoes(questionario_id, usuario_id) VALUES (_id, auth.uid());
 INSERT INTO public.questionarios_respostas(questionario_id, perguntas, respostas, respondente_id)
 VALUES (_id, formulario.perguntas, _respostas, CASE WHEN formulario.anonimo THEN NULL ELSE auth.uid() END) RETURNING id INTO novo;
 RETURN novo;
END $$;

REVOKE ALL ON FUNCTION public.validar_perguntas_questionario(jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.criar_questionario(text, text, boolean, jsonb), public.editar_questionario(uuid, text, text, jsonb), public.responder_questionario(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.criar_questionario(text, text, boolean, jsonb), public.editar_questionario(uuid, text, text, jsonb), public.responder_questionario(uuid, jsonb) TO authenticated;
COMMENT ON FUNCTION public.validar_perguntas_questionario(jsonb) IS 'Typed questionnaire questions: texto, radio, checkbox and descriptive bloco; at least one answerable item.';

CREATE OR REPLACE FUNCTION public.contar_questionarios_pendentes() RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT CASE WHEN NOT public.is_active_user(auth.uid()) THEN 0 ELSE (
  SELECT count(*)::integer FROM public.questionarios_internos q
  WHERE NOT q.excluindo AND NOT EXISTS (SELECT 1 FROM public.questionarios_participacoes p WHERE p.questionario_id = q.id AND p.usuario_id = auth.uid())
 ) END
$$;
REVOKE ALL ON FUNCTION public.contar_questionarios_pendentes() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.contar_questionarios_pendentes() TO authenticated;