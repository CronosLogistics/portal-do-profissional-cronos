CREATE TABLE public.insider_edicoes (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), mes_ano text NOT NULL UNIQUE CHECK (mes_ano ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
 titulo text NOT NULL CHECK (char_length(btrim(titulo)) BETWEEN 1 AND 120), conteudo jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(conteudo) = 'object' AND octet_length(conteudo::text) <= 1000000),
 aviso_id uuid UNIQUE REFERENCES public.avisos(id), revisao integer NOT NULL DEFAULT 1,
 criado_em timestamptz NOT NULL DEFAULT now(), atualizado_em timestamptz NOT NULL DEFAULT now(), origem text NOT NULL DEFAULT 'manual' CHECK (origem IN ('manual','automatica'))
);
GRANT SELECT ON public.insider_edicoes TO authenticated;
GRANT ALL ON public.insider_edicoes TO service_role;
ALTER TABLE public.insider_edicoes ENABLE ROW LEVEL SECURITY;
CREATE FUNCTION public.pode_ler_insider(_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT public.is_active_user(auth.uid()) AND EXISTS (SELECT 1 FROM public.insider_edicoes e WHERE e.id = _id AND (public.tem_permissao('avisos.insider') OR EXISTS (SELECT 1 FROM public.avisos a WHERE a.id=e.aviso_id AND (public.aviso_vigente(a.publicar_em,a.expira_em,a.arquivado_em) OR public.gere_aviso(a.autor_id,a.perfil_id)))));
$$;
REVOKE ALL ON FUNCTION public.pode_ler_insider(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pode_ler_insider(uuid) TO authenticated, service_role;
CREATE POLICY "Leitura editorial ou publicada Insider" ON public.insider_edicoes FOR SELECT TO authenticated USING (public.pode_ler_insider(id));
CREATE FUNCTION public.salvar_edicao_insider(_id uuid,_revisao integer,_titulo text,_conteudo jsonb) RETURNS public.insider_edicoes LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE e public.insider_edicoes;
BEGIN
 IF NOT public.tem_permissao('avisos.insider') OR NOT public.is_active_user(auth.uid()) THEN RAISE EXCEPTION 'Você não tem permissão para editar o Insider'; END IF;
 SELECT * INTO e FROM public.insider_edicoes WHERE id=_id FOR UPDATE;
 IF e.id IS NULL THEN RAISE EXCEPTION 'Edição não encontrada'; END IF;
 IF e.revisao <> _revisao THEN RAISE EXCEPTION 'A edição foi alterada por outra pessoa. Reabra antes de salvar.'; END IF;
 IF e.aviso_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.avisos a WHERE a.id=e.aviso_id AND (a.autor_id=auth.uid() OR public.tem_permissao('avisos.gerenciar'))) THEN RAISE EXCEPTION 'Somente o autor ou gestor pode corrigir a edição publicada'; END IF;
 UPDATE public.insider_edicoes SET titulo=btrim(_titulo),conteudo=_conteudo,revisao=revisao+1,atualizado_em=now() WHERE id=_id RETURNING * INTO e;
 IF e.aviso_id IS NOT NULL THEN UPDATE public.avisos SET titulo=e.titulo,editado_em=now() WHERE id=e.aviso_id; UPDATE public.avisos SET editado_em=now() WHERE id=e.aviso_id; END IF;
 RETURN e;
END $$;
REVOKE ALL ON FUNCTION public.salvar_edicao_insider(uuid,integer,text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.salvar_edicao_insider(uuid,integer,text,jsonb) TO authenticated;
CREATE FUNCTION public.publicar_edicao_insider(_id uuid,_revisao integer,_perfil uuid) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE e public.insider_edicoes; a uuid;
BEGIN
 IF NOT public.is_active_user(auth.uid()) OR NOT public.tem_permissao('avisos.insider') OR NOT public.pode_enviar_como(_perfil) THEN RAISE EXCEPTION 'Você não tem permissão para publicar como este perfil'; END IF;
 SELECT * INTO e FROM public.insider_edicoes WHERE id=_id FOR UPDATE;
 IF e.id IS NULL THEN RAISE EXCEPTION 'Edição não encontrada'; END IF;
 IF e.revisao <> _revisao THEN RAISE EXCEPTION 'A edição foi alterada. Reabra antes de publicar.'; END IF;
 IF e.aviso_id IS NOT NULL THEN RETURN e.aviso_id; END IF;
 INSERT INTO public.avisos(titulo,mensagem,perfil_id,autor_id,publicar_em,tipo) VALUES(e.titulo,'<p>A edição mensal do Cronos Insider está disponível. Abra para ler o jornal completo.</p>',_perfil,auth.uid(),now(),'insider') RETURNING id INTO a;
 UPDATE public.insider_edicoes SET aviso_id=a,revisao=revisao+1,atualizado_em=now() WHERE id=e.id;
 RETURN a;
END $$;
REVOKE ALL ON FUNCTION public.publicar_edicao_insider(uuid,integer,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.publicar_edicao_insider(uuid,integer,uuid) TO authenticated;
CREATE TABLE public.insider_preparacoes(mes_ano text PRIMARY KEY, token uuid, em_execucao_desde timestamptz, concluido_em timestamptz, erro text);
GRANT ALL ON public.insider_preparacoes TO service_role;
ALTER TABLE public.insider_preparacoes ENABLE ROW LEVEL SECURITY;
CREATE FUNCTION public.reservar_insider(_mes text,_token uuid) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF EXISTS(SELECT 1 FROM public.insider_edicoes WHERE mes_ano=_mes) THEN RETURN false; END IF;
 INSERT INTO public.insider_preparacoes(mes_ano,token,em_execucao_desde) VALUES(_mes,_token,now()) ON CONFLICT(mes_ano) DO UPDATE SET token=_token,em_execucao_desde=now(),erro=NULL WHERE insider_preparacoes.em_execucao_desde IS NULL OR insider_preparacoes.em_execucao_desde<now()-interval '10 minutes';
 RETURN FOUND;
END $$;
REVOKE ALL ON FUNCTION public.reservar_insider(text,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reservar_insider(text,uuid) TO service_role;
CREATE POLICY "Insider fotos leitura" ON storage.objects FOR SELECT TO authenticated USING(bucket_id='insider' AND EXISTS(SELECT 1 FROM public.insider_edicoes e WHERE e.id::text=split_part(name,'/',1) AND public.pode_ler_insider(e.id)));
CREATE POLICY "Insider fotos envio editorial" ON storage.objects FOR INSERT TO authenticated WITH CHECK(bucket_id='insider' AND public.tem_permissao('avisos.insider') AND EXISTS(SELECT 1 FROM public.insider_edicoes e WHERE e.id::text=split_part(name,'/',1)) AND lower(storage.extension(name)) IN ('jpg','jpeg','png','webp'));
CREATE POLICY "Insider fotos apagar editorial" ON storage.objects FOR DELETE TO authenticated USING(bucket_id='insider' AND public.tem_permissao('avisos.insider'));
