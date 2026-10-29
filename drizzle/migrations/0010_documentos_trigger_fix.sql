DROP TRIGGER documentos_atualizado ON public.documentos;
CREATE OR REPLACE FUNCTION public.documentos_tocar() RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$ BEGIN NEW.atualizado_em = now(); RETURN NEW; END; $$;
CREATE TRIGGER documentos_atualizado BEFORE UPDATE ON public.documentos FOR EACH ROW EXECUTE FUNCTION public.documentos_tocar();