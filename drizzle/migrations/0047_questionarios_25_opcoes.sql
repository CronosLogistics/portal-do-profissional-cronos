DO $$
DECLARE definicao text;
BEGIN
 definicao := pg_get_functiondef('public.validar_perguntas_questionario(jsonb)'::regprocedure);
 IF position('n_opcoes NOT BETWEEN 2 AND 20' in definicao) = 0 THEN RAISE EXCEPTION 'Limite anterior de alternativas não encontrado'; END IF;
 EXECUTE replace(definicao, 'n_opcoes NOT BETWEEN 2 AND 20', 'n_opcoes NOT BETWEEN 2 AND 25');
 definicao := pg_get_functiondef('public.responder_questionario(uuid,jsonb)'::regprocedure);
 IF position('jsonb_array_length(resposta) > 20' in definicao) = 0 THEN RAISE EXCEPTION 'Limite anterior de respostas não encontrado'; END IF;
 EXECUTE replace(definicao, 'jsonb_array_length(resposta) > 20', 'jsonb_array_length(resposta) > 25');
END $$;