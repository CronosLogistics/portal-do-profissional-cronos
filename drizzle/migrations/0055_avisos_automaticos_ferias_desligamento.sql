CREATE OR REPLACE FUNCTION public.receber_aviso_automatico(_titulo text, _html text)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _perfil uuid; _aviso uuid;
BEGIN
  SELECT id INTO _perfil FROM public.perfis WHERE nome = 'Gestão de Pessoas' LIMIT 1;
  IF _perfil IS NULL THEN SELECT id INTO _perfil FROM public.perfis WHERE sistema LIMIT 1; END IF;
  INSERT INTO public.avisos (titulo, mensagem, perfil_id, autor_id, publicar_em, tipo, exige_confirmacao, importante)
  VALUES (_titulo, _html, _perfil, '00000000-0000-0000-0000-000000000000', now(), 'comum', false, false)
  RETURNING id INTO _aviso;
  RETURN _aviso;
END $function$;
REVOKE ALL ON FUNCTION public.receber_aviso_automatico(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.receber_aviso_automatico(text, text) TO service_role;