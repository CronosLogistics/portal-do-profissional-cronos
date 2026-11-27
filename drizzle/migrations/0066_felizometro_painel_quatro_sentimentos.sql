ALTER TABLE public.felizometro_respostas ADD COLUMN sentimento_pulso smallint CHECK (sentimento_pulso BETWEEN 1 AND 4);
COMMENT ON COLUMN public.felizometro_respostas.sentimento_pulso IS 'Four-level pulse: 1 stressed, 2 discouraged, 3 calm, 4 very well. NULL preserves original five-level answers; legacy neutral remains separately identifiable in aggregate.';
CREATE OR REPLACE FUNCTION public.responder_felizometro_v2(_sentimento integer, _relato text DEFAULT '') RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE d date := (now() AT TIME ZONE 'America/Sao_Paulo')::date; dep text; nome text;
BEGIN
 IF NOT public.is_active_user(auth.uid()) THEN RAISE EXCEPTION 'Acesso não autorizado'; END IF;
 IF extract(isodow FROM d) NOT IN (1,5) THEN RAISE EXCEPTION 'O pulso está disponível somente às segundas e sextas.'; END IF;
 IF _sentimento IS NULL OR _sentimento NOT BETWEEN 1 AND 4 THEN RAISE EXCEPTION 'Selecione um dos quatro sentimentos.'; END IF;
 IF char_length(coalesce(_relato,''))>1000 THEN RAISE EXCEPTION 'O relato deve ter até 1000 caracteres.'; END IF;
 INSERT INTO public.felizometro_participacoes(usuario_id,dia) VALUES(auth.uid(),d) ON CONFLICT DO NOTHING;
 IF NOT FOUND THEN RAISE EXCEPTION 'Você já respondeu ao pulso de hoje.'; END IF;
 SELECT pd.departamento_id, dp.nome INTO dep,nome FROM public.profissional_departamento pd JOIN public.departamentos_portal dp ON dp.id=pd.departamento_id WHERE pd.usuario_id=auth.uid();
 INSERT INTO public.felizometro_respostas(dia,departamento_id,setor,sentimento,sentimento_pulso,relato)
 VALUES(d,dep,coalesce(nome,'Setor não identificado'),CASE _sentimento WHEN 4 THEN 5 WHEN 3 THEN 4 ELSE _sentimento END,_sentimento,trim(coalesce(_relato,'')));
END;
$$;
REVOKE ALL ON FUNCTION public.responder_felizometro_v2(integer,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.responder_felizometro_v2(integer,text) TO authenticated, service_role;
CREATE OR REPLACE FUNCTION public.painel_felizometro(_inicio date,_fim date) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE resultado jsonb;
BEGIN
 IF NOT public.pode_ver_felizometro() THEN RAISE EXCEPTION 'Você não tem permissão para consultar o Felizômetro.'; END IF;
 IF _inicio IS NULL OR _fim IS NULL OR _inicio>_fim OR _fim-_inicio>366 THEN RAISE EXCEPTION 'Selecione um período válido de até 366 dias.'; END IF;
 WITH coortes AS (
 SELECT dia,setor FROM public.felizometro_respostas
 WHERE dia BETWEEN _inicio AND _fim AND dia<(now() AT TIME ZONE 'America/Sao_Paulo')::date
 GROUP BY dia,setor HAVING count(*)>=5
 ), respostas AS (
 SELECT r.id,r.dia,r.relato,coalesce(r.sentimento_pulso,CASE r.sentimento WHEN 5 THEN 4 WHEN 4 THEN 3 WHEN 3 THEN null ELSE r.sentimento END) AS nota
 FROM public.felizometro_respostas r JOIN coortes c ON c.dia=r.dia AND c.setor=r.setor
 ), dias AS (
 SELECT dia,count(*) AS total,count(*) FILTER(WHERE nota=4) AS muito_bem,count(*) FILTER(WHERE nota=3) AS tranquilo,
 count(*) FILTER(WHERE nota=2) AS desanimado,count(*) FILTER(WHERE nota=1) AS estressado,count(*) FILTER(WHERE nota IS NULL) AS neutro_legado
 FROM respostas GROUP BY dia
 )
 SELECT jsonb_build_object('dias',coalesce((SELECT jsonb_agg(to_jsonb(g) ORDER BY g.dia) FROM dias g),'[]'::jsonb),
 'relatos',coalesce((SELECT jsonb_agg(relato ORDER BY id) FROM respostas WHERE relato<>''),'[]'::jsonb),
 'ativos',(SELECT count(*) FROM public.profiles WHERE is_active),
 'hoje',(now() AT TIME ZONE 'America/Sao_Paulo')::date) INTO resultado;
 RETURN resultado;
END;
$$;
REVOKE ALL ON FUNCTION public.painel_felizometro(date,date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.painel_felizometro(date,date) TO authenticated, service_role;