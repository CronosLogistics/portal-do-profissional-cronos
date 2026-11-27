CREATE OR REPLACE FUNCTION public.painel_felizometro(_inicio date,_fim date) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE resultado jsonb; hoje date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
BEGIN
 IF NOT public.pode_ver_felizometro() THEN RAISE EXCEPTION 'Você não tem permissão para consultar o Felizômetro.'; END IF;
 IF _inicio IS NULL OR _fim IS NULL OR _inicio>_fim OR _fim-_inicio>366 THEN RAISE EXCEPTION 'Selecione um período válido de até 366 dias.'; END IF;
 WITH respostas AS (
 SELECT r.id,r.dia,r.relato,coalesce(r.sentimento_pulso,CASE r.sentimento WHEN 5 THEN 4 WHEN 4 THEN 3 WHEN 3 THEN null ELSE r.sentimento END) AS nota
 FROM public.felizometro_respostas r WHERE r.dia BETWEEN _inicio AND _fim AND r.dia<hoje
 ), dias AS (
 SELECT dia,count(*) AS total,count(*) FILTER(WHERE nota=4) AS muito_bem,count(*) FILTER(WHERE nota=3) AS tranquilo,
 count(*) FILTER(WHERE nota=2) AS desanimado,count(*) FILTER(WHERE nota=1) AS estressado,count(*) FILTER(WHERE nota IS NULL) AS neutro_legado
 FROM respostas GROUP BY dia
 )
 SELECT jsonb_build_object('dias',coalesce((SELECT jsonb_agg(to_jsonb(g) ORDER BY g.dia) FROM dias g),'[]'::jsonb),
 'relatos',coalesce((SELECT jsonb_agg(relato ORDER BY id) FROM respostas WHERE relato<>''),'[]'::jsonb),
 'ativos',(SELECT count(*) FROM public.profiles WHERE is_active), 'hoje',hoje,
 'ultima_atualizacao',hoje::timestamp AT TIME ZONE 'America/Sao_Paulo',
 'proxima_atualizacao',(hoje+1)::timestamp AT TIME ZONE 'America/Sao_Paulo') INTO resultado;
 RETURN resultado;
END;
$$;
REVOKE ALL ON FUNCTION public.painel_felizometro(date,date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.painel_felizometro(date,date) TO authenticated, service_role;
CREATE OR REPLACE FUNCTION public.relatorio_felizometro(_inicio date,_fim date) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE resultado jsonb;
BEGIN
 IF NOT public.pode_ver_felizometro() THEN RAISE EXCEPTION 'Você não tem permissão para consultar o Felizômetro.'; END IF;
 IF _inicio IS NULL OR _fim IS NULL OR _inicio>_fim OR _fim-_inicio>366 THEN RAISE EXCEPTION 'Selecione um período válido de até 366 dias.'; END IF;
 WITH respostas AS (
 SELECT * FROM public.felizometro_respostas WHERE dia BETWEEN _inicio AND _fim AND dia<(now() AT TIME ZONE 'America/Sao_Paulo')::date
 ), grupos AS (
 SELECT dia, 'Empresa'::text AS setor, count(*) AS total, round(avg(sentimento),2) AS media,
 count(*) FILTER(WHERE sentimento=1) AS muito_dificil, count(*) FILTER(WHERE sentimento=2) AS desanimado,
 count(*) FILTER(WHERE sentimento=3) AS neutro, count(*) FILTER(WHERE sentimento=4) AS tranquilo,
 count(*) FILTER(WHERE sentimento=5) AS muito_bem FROM respostas GROUP BY dia
 )
 SELECT jsonb_build_object('grupos',coalesce((SELECT jsonb_agg(to_jsonb(g) ORDER BY g.dia) FROM grupos g),'[]'::jsonb),
 'relatos',coalesce((SELECT jsonb_agg(relato ORDER BY id) FROM respostas WHERE relato<>''),'[]'::jsonb)) INTO resultado;
 RETURN resultado;
END;
$$;
REVOKE ALL ON FUNCTION public.relatorio_felizometro(date,date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.relatorio_felizometro(date,date) TO authenticated, service_role;