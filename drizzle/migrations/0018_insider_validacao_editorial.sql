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
 caminho:=coalesce(NEW.conteudo->>'bannerMes','');
 IF caminho<>'' AND (split_part(caminho,'/',1)<>NEW.id::text OR caminho !~ '^[a-f0-9-]{36}/[a-f0-9-]{36}\.(jpg|jpeg|png|webp)$') THEN RAISE EXCEPTION 'Banner inválido'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER insider_validar_conteudo BEFORE INSERT OR UPDATE OF conteudo ON public.insider_edicoes FOR EACH ROW EXECUTE FUNCTION public.validar_conteudo_insider();