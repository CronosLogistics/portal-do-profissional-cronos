CREATE TABLE public.felizometro_participacoes (
 usuario_id uuid NOT NULL,
 dia date NOT NULL,
 PRIMARY KEY (usuario_id,dia)
);
GRANT ALL ON public.felizometro_participacoes TO service_role;
ALTER TABLE public.felizometro_participacoes ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.felizometro_respostas (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 dia date NOT NULL,
 departamento_id text,
 setor text NOT NULL,
 sentimento smallint NOT NULL CHECK (sentimento BETWEEN 1 AND 5),
 relato text NOT NULL DEFAULT '' CHECK (char_length(relato)<=1000)
);
GRANT ALL ON public.felizometro_respostas TO service_role;
ALTER TABLE public.felizometro_respostas ENABLE ROW LEVEL SECURITY;
CREATE INDEX felizometro_respostas_ciclo ON public.felizometro_respostas(dia, setor);

CREATE FUNCTION public.pode_ver_felizometro() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT public.is_active_user(auth.uid()) AND (
 public.usuario_tem_permissao(auth.uid(),'admin.usuarios')
 OR coalesce((public.meu_escopo_departamento()->>'gestaoPessoas')::boolean,false));
$$;
REVOKE ALL ON FUNCTION public.pode_ver_felizometro() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pode_ver_felizometro() TO authenticated, service_role;

CREATE FUNCTION public.felizometro_pendente() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE d date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
BEGIN
 IF NOT public.is_active_user(auth.uid()) THEN RAISE EXCEPTION 'Acesso não autorizado'; END IF;
 RETURN jsonb_build_object('dia',d,'pulso',CASE extract(isodow FROM d) WHEN 1 THEN 'segunda' WHEN 5 THEN 'sexta' ELSE null END,
 'pendente',extract(isodow FROM d) IN (1,5) AND NOT EXISTS(SELECT 1 FROM public.felizometro_participacoes WHERE usuario_id=auth.uid() AND dia=d));
END;
$$;
REVOKE ALL ON FUNCTION public.felizometro_pendente() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.felizometro_pendente() TO authenticated, service_role;

CREATE FUNCTION public.responder_felizometro(_sentimento integer, _relato text DEFAULT '') RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE d date := (now() AT TIME ZONE 'America/Sao_Paulo')::date; dep text; nome text;
BEGIN
 IF NOT public.is_active_user(auth.uid()) THEN RAISE EXCEPTION 'Acesso não autorizado'; END IF;
 IF extract(isodow FROM d) NOT IN (1,5) THEN RAISE EXCEPTION 'O pulso está disponível somente às segundas e sextas.'; END IF;
 IF _sentimento IS NULL OR _sentimento NOT BETWEEN 1 AND 5 THEN RAISE EXCEPTION 'Selecione como está se sentindo.'; END IF;
 IF char_length(coalesce(_relato,''))>1000 THEN RAISE EXCEPTION 'O relato deve ter até 1000 caracteres.'; END IF;
 INSERT INTO public.felizometro_participacoes(usuario_id,dia) VALUES(auth.uid(),d) ON CONFLICT DO NOTHING;
 IF NOT FOUND THEN RAISE EXCEPTION 'Você já respondeu ao pulso de hoje.'; END IF;
 SELECT pd.departamento_id, dp.nome INTO dep,nome FROM public.profissional_departamento pd JOIN public.departamentos_portal dp ON dp.id=pd.departamento_id WHERE pd.usuario_id=auth.uid();
 INSERT INTO public.felizometro_respostas(dia,departamento_id,setor,sentimento,relato)
 VALUES(d,dep,coalesce(nome,'Setor não identificado'),_sentimento,trim(coalesce(_relato,'')));
END;
$$;
REVOKE ALL ON FUNCTION public.responder_felizometro(integer,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.responder_felizometro(integer,text) TO authenticated, service_role;

CREATE FUNCTION public.relatorio_felizometro(_inicio date,_fim date) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE resultado jsonb;
BEGIN
 IF NOT public.pode_ver_felizometro() THEN RAISE EXCEPTION 'Você não tem permissão para consultar o Felizômetro.'; END IF;
 IF _inicio IS NULL OR _fim IS NULL OR _inicio>_fim OR _fim-_inicio>366 THEN RAISE EXCEPTION 'Selecione um período válido de até 366 dias.'; END IF;
 WITH grupos AS (
 SELECT dia, setor, count(*) AS total, round(avg(sentimento),2) AS media,
 count(*) FILTER(WHERE sentimento=1) AS muito_dificil,
 count(*) FILTER(WHERE sentimento=2) AS desanimado,
 count(*) FILTER(WHERE sentimento=3) AS neutro,
 count(*) FILTER(WHERE sentimento=4) AS tranquilo,
 count(*) FILTER(WHERE sentimento=5) AS muito_bem
 FROM public.felizometro_respostas
 WHERE dia BETWEEN _inicio AND _fim AND dia<(now() AT TIME ZONE 'America/Sao_Paulo')::date
 GROUP BY dia,setor HAVING count(*)>=5
 ), relatos AS (
 SELECT r.relato FROM public.felizometro_respostas r JOIN grupos g ON g.dia=r.dia AND g.setor=r.setor WHERE r.relato<>'' ORDER BY r.id
 )
 SELECT jsonb_build_object('grupos',coalesce((SELECT jsonb_agg(to_jsonb(g) ORDER BY g.dia,g.setor) FROM grupos g),'[]'::jsonb),
 'relatos',coalesce((SELECT jsonb_agg(relato) FROM relatos),'[]'::jsonb)) INTO resultado;
 RETURN resultado;
END;
$$;
REVOKE ALL ON FUNCTION public.relatorio_felizometro(date,date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.relatorio_felizometro(date,date) TO authenticated, service_role;
COMMENT ON TABLE public.felizometro_respostas IS 'Anonymous pulse answers: no respondent ID, per-answer timestamp or participation key; do not attach user audit triggers.';