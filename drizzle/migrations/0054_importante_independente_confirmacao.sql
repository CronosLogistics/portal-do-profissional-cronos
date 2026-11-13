ALTER TABLE public.avisos DROP CONSTRAINT IF EXISTS avisos_importante_confirmacao_check;
ALTER TABLE public.avisos ADD CONSTRAINT avisos_importante_tipo_check CHECK (NOT importante OR tipo = 'comum');
CREATE OR REPLACE FUNCTION public.avisos_validar_importante() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.publicar_em <= now() AND NEW.importante IS DISTINCT FROM OLD.importante THEN RAISE EXCEPTION 'A classificação de aviso importante não pode mudar após a publicação'; END IF;
  IF NEW.importante AND (TG_OP = 'INSERT' OR NEW.importante IS DISTINCT FROM OLD.importante) AND NOT public.tem_permissao('avisos.confirmacao') THEN RAISE EXCEPTION 'Sem permissão para avisos importantes'; END IF;
  IF NEW.importante AND NEW.tipo <> 'comum' THEN RAISE EXCEPTION 'Aviso importante disponível apenas para avisos comuns'; END IF;
  RETURN NEW;
END $$;
CREATE OR REPLACE FUNCTION public.contar_avisos_importantes() RETURNS bigint
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
SELECT count(*) FROM public.avisos a WHERE a.importante AND public.aviso_disponivel(a.id)
AND CASE WHEN a.exige_confirmacao
  THEN NOT EXISTS (SELECT 1 FROM public.avisos_confirmacoes c WHERE c.aviso_id = a.id AND c.usuario_id = auth.uid())
  ELSE NOT EXISTS (SELECT 1 FROM public.avisos_leituras l WHERE l.aviso_id = a.id AND l.usuario_id = auth.uid()) END
$$;