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
  IF tipo <> 'bloco' AND coalesce((pergunta->>'obrigatoria')::boolean, true) = false AND (resposta IS NULL OR resposta = 'null'::jsonb OR (jsonb_typeof(resposta) = 'string' AND trim(resposta#>>'{}') = '') OR (jsonb_typeof(resposta) = 'array' AND jsonb_array_length(resposta) = 0)) THEN CONTINUE; END IF;
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

UPDATE public.questionarios_internos q SET perguntas = (
  SELECT jsonb_agg(CASE WHEN item->>'tipo' = 'bloco' THEN item ELSE item || jsonb_build_object('obrigatoria', (item->>'enunciado') ~ '\*\s*$') END ORDER BY ord)
  FROM jsonb_array_elements(q.perguntas) WITH ORDINALITY t(item, ord))
WHERE q.id = '6c230a45-4b15-43ae-8f2a-cfe854482d02';