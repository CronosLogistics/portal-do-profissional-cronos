CREATE OR REPLACE FUNCTION public.validar_conteudo_insider() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
DECLARE grupo text; item jsonb; caminho text; limite integer;
BEGIN
 IF jsonb_typeof(NEW.conteudo) <> 'object' THEN RAISE EXCEPTION 'Conteúdo inválido'; END IF;
 FOREACH grupo IN ARRAY ARRAY['eventos','aniversariantes','tempoCasa'] LOOP
  limite := CASE WHEN grupo='eventos' THEN 30 ELSE 1000 END;
  IF jsonb_typeof(NEW.conteudo->grupo) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Seção inválida: %',grupo; END IF;
  IF jsonb_array_length(NEW.conteudo->grupo) > limite THEN RAISE EXCEPTION 'Limite de itens excedido'; END IF;
  FOR item IN SELECT value FROM jsonb_array_elements(NEW.conteudo->grupo) LOOP
   caminho := coalesce(item->>(CASE WHEN grupo='eventos' THEN 'imagem' ELSE 'foto' END),'');
   IF caminho<>'' AND (split_part(caminho,'/',1)<>NEW.id::text OR caminho !~ '^[a-f0-9-]{36}/[a-f0-9-]{36}\.(jpg|jpeg|png|webp)$') THEN RAISE EXCEPTION 'Imagem de outra edição ou caminho inválido'; END IF;
  END LOOP;
 END LOOP;
 FOREACH grupo IN ARRAY ARRAY['bannerMes','bannerCabecalho','bannerAniversariantes','bannerTempoCasa','bannerAssinatura','bannerRodape'] LOOP
  IF NEW.conteudo ? grupo AND jsonb_typeof(NEW.conteudo->grupo) IS DISTINCT FROM 'string' THEN RAISE EXCEPTION 'Banner inválido: %',grupo; END IF;
  caminho:=coalesce(NEW.conteudo->>grupo,'');
  IF caminho<>'' AND (split_part(caminho,'/',1)<>NEW.id::text OR caminho !~ '^[a-f0-9-]{36}/[a-f0-9-]{36}\.(jpg|jpeg|png|webp)$') THEN RAISE EXCEPTION 'Banner inválido: %',grupo; END IF;
 END LOOP;
 RETURN NEW;
END $$;
CREATE OR REPLACE FUNCTION public.insider_vigente()
 RETURNS TABLE(id uuid,titulo text,mensagem text,perfil_nome text,publicar_em timestamptz,editado_em timestamptz)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT a.id,a.titulo,a.mensagem,p.nome,a.publicar_em,a.editado_em
 FROM public.avisos a JOIN public.perfis p ON p.id=a.perfil_id
 WHERE public.is_active_user(auth.uid()) AND a.tipo='insider'
 AND public.aviso_vigente(a.publicar_em,a.expira_em,a.arquivado_em)
 AND public.aviso_para_usuario(a.id,auth.uid())
 AND ((a.publicar_em AT TIME ZONE 'America/Sao_Paulo')::date >= (now() AT TIME ZONE 'America/Sao_Paulo')::date-2
 OR a.id='9652005f-b517-4a3c-a382-9c259988fe95'::uuid)
 ORDER BY (a.id='9652005f-b517-4a3c-a382-9c259988fe95'::uuid) DESC,a.publicar_em DESC LIMIT 1
$$;
COMMENT ON FUNCTION public.insider_vigente() IS 'Temporary official-presentation exception for Maria Gerotti edition published 2026-10-29 17:34 America/Sao_Paulo; archive/expiry and audience still apply. Remove the ID exception after presentation.';
REVOKE ALL ON FUNCTION public.insider_vigente() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.insider_vigente() TO authenticated;