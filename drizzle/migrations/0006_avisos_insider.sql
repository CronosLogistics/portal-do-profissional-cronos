ALTER TABLE public.perfil_permissoes DROP CONSTRAINT perfil_permissoes_permissao_check;
ALTER TABLE public.perfil_permissoes ADD CONSTRAINT perfil_permissoes_permissao_check CHECK (permissao IN ('admin.usuarios','admin.perfis','avisos.publicar','avisos.gerenciar','avisos.insider','conteudo.editar'));
INSERT INTO public.perfil_permissoes (perfil_id, permissao) SELECT id, 'avisos.insider' FROM public.perfis WHERE nome = 'Gestão de Pessoas' ON CONFLICT DO NOTHING;
INSERT INTO public.perfil_permissoes (perfil_id, permissao) SELECT id, 'avisos.insider' FROM public.perfis WHERE sistema ON CONFLICT DO NOTHING;

ALTER TABLE public.avisos ADD COLUMN tipo text NOT NULL DEFAULT 'comum' CHECK (tipo IN ('comum','insider','compilado'));
COMMENT ON COLUMN public.avisos.tipo IS 'comum = aviso normal; insider = edição do Cronos Insider (slide 3 por 3 dias); compilado = compilado mensal de elogios (D2)';

CREATE OR REPLACE FUNCTION public.avisos_antes_gravar()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $function$
BEGIN
  NEW.mensagem := public.limpar_html_aviso(NEW.mensagem);
  NEW.titulo := btrim(NEW.titulo);
  IF TG_OP = 'INSERT' THEN
    IF auth.uid() IS NOT NULL THEN
      NEW.autor_id := auth.uid();
      IF NEW.tipo = 'insider' AND NOT public.tem_permissao('avisos.insider') THEN
        RAISE EXCEPTION 'Você não pode publicar o Cronos Insider';
      END IF;
      IF NEW.tipo = 'compilado' THEN RAISE EXCEPTION 'O compilado de elogios é publicado só pelo fluxo automático'; END IF;
    END IF;
    NEW.editado_em := NULL; NEW.arquivado_em := NULL; NEW.criado_em := now();
    IF NEW.publicar_em < now() THEN NEW.publicar_em := now(); END IF;
  ELSE
    NEW.autor_id := OLD.autor_id; NEW.criado_em := OLD.criado_em; NEW.tipo := OLD.tipo;
    IF OLD.publicar_em <= now() THEN
      NEW.publicar_em := OLD.publicar_em; NEW.perfil_id := OLD.perfil_id;
      IF NEW.titulo IS DISTINCT FROM OLD.titulo OR NEW.mensagem IS DISTINCT FROM OLD.mensagem THEN
        NEW.editado_em := now();
      ELSE NEW.editado_em := OLD.editado_em; END IF;
    ELSE
      NEW.editado_em := NULL;
      IF NEW.publicar_em < now() THEN NEW.publicar_em := now(); END IF;
      IF NEW.perfil_id IS DISTINCT FROM OLD.perfil_id AND NOT public.pode_enviar_como(NEW.perfil_id) THEN
        RAISE EXCEPTION 'Você não pode enviar avisos como este perfil';
      END IF;
    END IF;
  END IF;
  IF NEW.expira_em IS NOT NULL AND NEW.expira_em <= NEW.publicar_em THEN
    RAISE EXCEPTION 'A data de expiração precisa ser depois da publicação';
  END IF;
  RETURN NEW;
END $function$;

DROP FUNCTION public.listar_avisos(boolean, integer, integer);
CREATE FUNCTION public.listar_avisos(_so_nao_lidos boolean DEFAULT false, _limite integer DEFAULT 20, _deslocamento integer DEFAULT 0)
 RETURNS TABLE(id uuid, titulo text, mensagem text, perfil_nome text, publicar_em timestamptz, expira_em timestamptz, editado_em timestamptz, lido boolean, tipo text)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  WITH me AS (SELECT coalesce(primeiro_acesso, '-infinity'::timestamptz) AS pa FROM public.profiles WHERE id = auth.uid()),
  v AS (
    SELECT a.id, a.titulo, a.mensagem, p.nome AS perfil_nome, a.publicar_em, a.expira_em, a.editado_em,
      (a.publicar_em <= (SELECT pa FROM me) OR EXISTS (SELECT 1 FROM public.avisos_leituras l WHERE l.aviso_id = a.id AND l.usuario_id = auth.uid())) AS lido,
      a.tipo
    FROM public.avisos a JOIN public.perfis p ON p.id = a.perfil_id
    WHERE public.is_active_user(auth.uid()) AND public.aviso_vigente(a.publicar_em, a.expira_em, a.arquivado_em)
  )
  SELECT * FROM v WHERE NOT _so_nao_lidos OR NOT v.lido
  ORDER BY v.publicar_em DESC
  LIMIT least(greatest(_limite, 1), 100) OFFSET greatest(_deslocamento, 0)
$function$;
REVOKE ALL ON FUNCTION public.listar_avisos(boolean, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.listar_avisos(boolean, integer, integer) TO authenticated;

DROP FUNCTION public.avisos_enviados();
CREATE FUNCTION public.avisos_enviados()
 RETURNS TABLE(id uuid, titulo text, mensagem text, perfil_id uuid, perfil_nome text, autor_id uuid, autor_nome text, publicar_em timestamptz, expira_em timestamptz, editado_em timestamptz, arquivado_em timestamptz, lidos bigint, ativos bigint, tipo text)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT a.id, a.titulo, a.mensagem, a.perfil_id, p.nome, a.autor_id, coalesce(nullif(pr.full_name, ''), pr.email, ''),
    a.publicar_em, a.expira_em, a.editado_em, a.arquivado_em,
    (SELECT count(*) FROM public.avisos_leituras l JOIN public.profiles u ON u.id = l.usuario_id AND u.is_active WHERE l.aviso_id = a.id),
    (SELECT count(*) FROM public.profiles WHERE is_active), a.tipo
  FROM public.avisos a
  JOIN public.perfis p ON p.id = a.perfil_id
  LEFT JOIN public.profiles pr ON pr.id = a.autor_id
  WHERE public.gere_aviso(a.autor_id, a.perfil_id)
  ORDER BY a.publicar_em DESC
  LIMIT 200
$function$;
REVOKE ALL ON FUNCTION public.avisos_enviados() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.avisos_enviados() TO authenticated;

-- Slide 3: edição mais recente do Insider, do dia da publicação até o fim do 3º dia (Brasília).
CREATE FUNCTION public.insider_vigente()
 RETURNS TABLE(id uuid, titulo text, mensagem text, perfil_nome text, publicar_em timestamptz, editado_em timestamptz)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT a.id, a.titulo, a.mensagem, p.nome, a.publicar_em, a.editado_em
  FROM public.avisos a JOIN public.perfis p ON p.id = a.perfil_id
  WHERE public.is_active_user(auth.uid()) AND a.tipo = 'insider'
    AND public.aviso_vigente(a.publicar_em, a.expira_em, a.arquivado_em)
    AND (a.publicar_em AT TIME ZONE 'America/Sao_Paulo')::date >= (now() AT TIME ZONE 'America/Sao_Paulo')::date - 2
  ORDER BY a.publicar_em DESC LIMIT 1
$function$;
REVOKE ALL ON FUNCTION public.insider_vigente() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.insider_vigente() TO authenticated;