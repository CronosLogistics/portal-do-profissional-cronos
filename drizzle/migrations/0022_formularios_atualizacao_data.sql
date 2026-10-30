CREATE FUNCTION public.formularios_tocar() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN NEW.atualizado_em=now(); RETURN NEW; END; $$;
DROP TRIGGER formularios_atualizado ON public.formularios;
CREATE TRIGGER formularios_atualizado BEFORE UPDATE ON public.formularios FOR EACH ROW EXECUTE FUNCTION public.formularios_tocar();