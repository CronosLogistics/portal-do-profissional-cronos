CREATE TABLE public.compilados_elogios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mes_ano text NOT NULL UNIQUE CHECK (mes_ano ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  html text NOT NULL CHECK (length(html) <= 2000000),
  aviso_id uuid REFERENCES public.avisos(id) ON DELETE SET NULL,
  recebido_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.compilados_elogios TO authenticated;
GRANT ALL ON public.compilados_elogios TO service_role;
ALTER TABLE public.compilados_elogios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profissionais ativos leem compilados" ON public.compilados_elogios
  FOR SELECT TO authenticated USING (public.is_active_user(auth.uid()));

-- Chamado só pelo servidor (fluxo Power Automate). Cria/atualiza o corpo do mês e o aviso tipo compilado.
CREATE OR REPLACE FUNCTION public.receber_compilado(_mes_ano text, _html text, _titulo text)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _perfil uuid; _aviso uuid; _resumo text;
BEGIN
  SELECT id INTO _perfil FROM public.perfis WHERE nome = 'Gestão de Pessoas' LIMIT 1;
  IF _perfil IS NULL THEN SELECT id INTO _perfil FROM public.perfis WHERE sistema LIMIT 1; END IF;
  _resumo := '<p>O compilado de elogios recebidos está disponível. Abra para ler todos os elogios do mês.</p>';
  SELECT aviso_id INTO _aviso FROM public.compilados_elogios WHERE mes_ano = _mes_ano;
  IF _aviso IS NOT NULL AND EXISTS (SELECT 1 FROM public.avisos WHERE id = _aviso) THEN
    UPDATE public.avisos SET titulo = _titulo WHERE id = _aviso;
  ELSE
    INSERT INTO public.avisos (titulo, mensagem, perfil_id, autor_id, publicar_em, tipo)
    VALUES (_titulo, _resumo, _perfil, '00000000-0000-0000-0000-000000000000', now(), 'compilado')
    RETURNING id INTO _aviso;
  END IF;
  INSERT INTO public.compilados_elogios (mes_ano, html, aviso_id) VALUES (_mes_ano, _html, _aviso)
  ON CONFLICT (mes_ano) DO UPDATE SET html = EXCLUDED.html, aviso_id = EXCLUDED.aviso_id, atualizado_em = now();
  RETURN _aviso;
END $function$;
REVOKE ALL ON FUNCTION public.receber_compilado(text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.receber_compilado(text, text, text) TO service_role;

-- Slide 4: compilado mais recente, por um mês a partir da publicação.
CREATE OR REPLACE FUNCTION public.compilado_vigente()
 RETURNS TABLE(id uuid, titulo text, mensagem text, perfil_nome text, publicar_em timestamptz, editado_em timestamptz, mes_ano text)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT a.id, a.titulo, a.mensagem, p.nome, a.publicar_em, a.editado_em, c.mes_ano
  FROM public.compilados_elogios c
  JOIN public.avisos a ON a.id = c.aviso_id
  JOIN public.perfis p ON p.id = a.perfil_id
  WHERE public.is_active_user(auth.uid()) AND a.tipo = 'compilado'
    AND public.aviso_vigente(a.publicar_em, a.expira_em, a.arquivado_em)
    AND a.publicar_em > now() - interval '1 month'
  ORDER BY a.publicar_em DESC LIMIT 1
$function$;
REVOKE ALL ON FUNCTION public.compilado_vigente() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.compilado_vigente() TO authenticated;