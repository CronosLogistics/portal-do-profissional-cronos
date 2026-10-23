CREATE TABLE public.avisos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL CHECK (char_length(btrim(titulo)) BETWEEN 1 AND 120),
  mensagem text NOT NULL DEFAULT '',
  perfil_id uuid NOT NULL REFERENCES public.perfis(id),
  autor_id uuid NOT NULL DEFAULT auth.uid(),
  publicar_em timestamptz NOT NULL DEFAULT now(),
  expira_em timestamptz,
  editado_em timestamptz,
  arquivado_em timestamptz,
  criado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX avisos_publicar_em_idx ON public.avisos (publicar_em DESC);

CREATE TABLE public.avisos_leituras (
  aviso_id uuid NOT NULL REFERENCES public.avisos(id) ON DELETE CASCADE,
  usuario_id uuid NOT NULL DEFAULT auth.uid(),
  lido_em timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (aviso_id, usuario_id)
);
CREATE UNIQUE INDEX avisos_leituras_usuario_aviso_idx ON public.avisos_leituras (usuario_id, aviso_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.avisos TO authenticated;
GRANT ALL ON public.avisos TO service_role;
GRANT SELECT, INSERT ON public.avisos_leituras TO authenticated;
GRANT ALL ON public.avisos_leituras TO service_role;

-- Limpa o HTML: só negrito, itálico, listas, parágrafos, quebras e links http(s)/mailto.
CREATE OR REPLACE FUNCTION public.limpar_html_aviso(_html text)
RETURNS text LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $$
DECLARE
  r text := coalesce(_html, '');
  anterior text;
BEGIN
  r := regexp_replace(r, '<(script|style|iframe|object|embed|svg|math)\b[^>]*>.*?</\1\s*>', '', 'gis');
  LOOP
    anterior := r;
    r := regexp_replace(r, '<!--.*?-->', '', 'gs');
    r := regexp_replace(r, '<(?!/?(b|strong|i|em|u|ul|ol|li|p|br|div|a)(\s|/|>))[^>]*>?', '', 'gi');
    EXIT WHEN r = anterior;
  END LOOP;
  r := regexp_replace(r, '<(/?)(b|strong|i|em|u|ul|ol|li|p|br|div)\b[^>]*>', '<\1\2>', 'gi');
  r := regexp_replace(r, '<a\s[^>]*?href\s*=\s*["'']\s*((https?:|mailto:)[^"''<>\s]*)\s*["''][^>]*>', '<a href="\1">', 'gi');
  r := regexp_replace(r, '<a(?!\s+href="(https?:|mailto:)[^"]*">)(\s[^>]*)?>', '<a>', 'gi');
  r := regexp_replace(r, '</a\s[^>]*>', '</a>', 'gi');
  RETURN r;
END $$;

CREATE OR REPLACE FUNCTION public.pode_enviar_como(_perfil_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.tem_permissao('avisos.publicar') AND EXISTS (
    SELECT 1 FROM public.usuario_perfis up
    JOIN public.perfis p ON p.id = up.perfil_id
    WHERE up.usuario_id = auth.uid() AND up.perfil_id = _perfil_id AND p.ativo
      AND (p.sistema OR EXISTS (SELECT 1 FROM public.perfil_permissoes pp WHERE pp.perfil_id = p.id AND pp.permissao = 'avisos.publicar'))
  )
$$;

CREATE OR REPLACE FUNCTION public.avisos_antes_gravar()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.mensagem := public.limpar_html_aviso(NEW.mensagem);
  NEW.titulo := btrim(NEW.titulo);
  IF TG_OP = 'INSERT' THEN
    IF auth.uid() IS NOT NULL THEN NEW.autor_id := auth.uid(); END IF;
    NEW.editado_em := NULL; NEW.arquivado_em := NULL; NEW.criado_em := now();
    IF NEW.publicar_em < now() THEN NEW.publicar_em := now(); END IF;
  ELSE
    NEW.autor_id := OLD.autor_id; NEW.criado_em := OLD.criado_em;
    IF OLD.publicar_em <= now() THEN
      -- Publicado: só corrige texto/expiração ou arquiva; remetente e data ficam.
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
END $$;
CREATE TRIGGER avisos_antes_gravar BEFORE INSERT OR UPDATE ON public.avisos
FOR EACH ROW EXECUTE FUNCTION public.avisos_antes_gravar();

CREATE OR REPLACE FUNCTION public.aviso_vigente(_publicar timestamptz, _expira timestamptz, _arquivado timestamptz)
RETURNS boolean LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT _publicar <= now() AND _arquivado IS NULL AND (_expira IS NULL OR _expira > now())
$$;

CREATE OR REPLACE FUNCTION public.gere_aviso(_autor uuid, _perfil uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_active_user(auth.uid()) AND (
    _autor = auth.uid() OR public.tem_permissao('avisos.gerenciar')
    OR (public.tem_permissao('avisos.publicar') AND EXISTS (SELECT 1 FROM public.usuario_perfis WHERE usuario_id = auth.uid() AND perfil_id = _perfil)))
$$;

ALTER TABLE public.avisos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ativos leem avisos vigentes" ON public.avisos FOR SELECT TO authenticated
  USING ((public.is_active_user(auth.uid()) AND public.aviso_vigente(publicar_em, expira_em, arquivado_em)) OR public.gere_aviso(autor_id, perfil_id));
CREATE POLICY "Publicadores criam avisos" ON public.avisos FOR INSERT TO authenticated
  WITH CHECK (public.is_active_user(auth.uid()) AND public.pode_enviar_como(perfil_id));
CREATE POLICY "Autor ou gestor altera avisos" ON public.avisos FOR UPDATE TO authenticated
  USING (public.is_active_user(auth.uid()) AND (autor_id = auth.uid() OR public.tem_permissao('avisos.gerenciar')))
  WITH CHECK (public.is_active_user(auth.uid()) AND (autor_id = auth.uid() OR public.tem_permissao('avisos.gerenciar')));
CREATE POLICY "Autor ou gestor cancela agendados" ON public.avisos FOR DELETE TO authenticated
  USING (publicar_em > now() AND public.is_active_user(auth.uid()) AND (autor_id = auth.uid() OR public.tem_permissao('avisos.gerenciar')));

ALTER TABLE public.avisos_leituras ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Cada um le as proprias leituras" ON public.avisos_leituras FOR SELECT TO authenticated
  USING (usuario_id = auth.uid());
CREATE POLICY "Cada um grava as proprias leituras" ON public.avisos_leituras FOR INSERT TO authenticated
  WITH CHECK (usuario_id = auth.uid() AND public.is_active_user(auth.uid()));

-- Lista do profissional (central e sino). Publicados antes do 1º acesso contam como lidos.
CREATE OR REPLACE FUNCTION public.listar_avisos(_so_nao_lidos boolean DEFAULT false, _limite integer DEFAULT 20, _deslocamento integer DEFAULT 0)
RETURNS TABLE(id uuid, titulo text, mensagem text, perfil_nome text, publicar_em timestamptz, expira_em timestamptz, editado_em timestamptz, lido boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH me AS (SELECT coalesce(primeiro_acesso, '-infinity'::timestamptz) AS pa FROM public.profiles WHERE id = auth.uid()),
  v AS (
    SELECT a.id, a.titulo, a.mensagem, p.nome AS perfil_nome, a.publicar_em, a.expira_em, a.editado_em,
      (a.publicar_em <= (SELECT pa FROM me) OR EXISTS (SELECT 1 FROM public.avisos_leituras l WHERE l.aviso_id = a.id AND l.usuario_id = auth.uid())) AS lido
    FROM public.avisos a JOIN public.perfis p ON p.id = a.perfil_id
    WHERE public.is_active_user(auth.uid()) AND public.aviso_vigente(a.publicar_em, a.expira_em, a.arquivado_em)
  )
  SELECT * FROM v WHERE NOT _so_nao_lidos OR NOT v.lido
  ORDER BY v.publicar_em DESC
  LIMIT least(greatest(_limite, 1), 100) OFFSET greatest(_deslocamento, 0)
$$;

CREATE OR REPLACE FUNCTION public.contar_nao_lidos()
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT count(*)::int FROM public.avisos a
  WHERE public.is_active_user(auth.uid()) AND public.aviso_vigente(a.publicar_em, a.expira_em, a.arquivado_em)
    AND a.publicar_em > coalesce((SELECT primeiro_acesso FROM public.profiles WHERE id = auth.uid()), '-infinity'::timestamptz)
    AND NOT EXISTS (SELECT 1 FROM public.avisos_leituras l WHERE l.aviso_id = a.id AND l.usuario_id = auth.uid())
$$;

CREATE OR REPLACE FUNCTION public.marcar_todos_avisos_lidos()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n integer;
BEGIN
  IF NOT public.is_active_user(auth.uid()) THEN RETURN 0; END IF;
  INSERT INTO public.avisos_leituras (aviso_id, usuario_id)
  SELECT a.id, auth.uid() FROM public.avisos a
  WHERE public.aviso_vigente(a.publicar_em, a.expira_em, a.arquivado_em)
  ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $$;

-- Aba Enviados: avisos dos perfis da pessoa (ou todos, para avisos.gerenciar), com leituras.
CREATE OR REPLACE FUNCTION public.avisos_enviados()
RETURNS TABLE(id uuid, titulo text, mensagem text, perfil_id uuid, perfil_nome text, autor_id uuid, autor_nome text,
  publicar_em timestamptz, expira_em timestamptz, editado_em timestamptz, arquivado_em timestamptz, lidos bigint, ativos bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT a.id, a.titulo, a.mensagem, a.perfil_id, p.nome, a.autor_id, coalesce(nullif(pr.full_name, ''), pr.email, ''),
    a.publicar_em, a.expira_em, a.editado_em, a.arquivado_em,
    (SELECT count(*) FROM public.avisos_leituras l JOIN public.profiles u ON u.id = l.usuario_id AND u.is_active WHERE l.aviso_id = a.id),
    (SELECT count(*) FROM public.profiles WHERE is_active)
  FROM public.avisos a
  JOIN public.perfis p ON p.id = a.perfil_id
  LEFT JOIN public.profiles pr ON pr.id = a.autor_id
  WHERE public.gere_aviso(a.autor_id, a.perfil_id)
  ORDER BY a.publicar_em DESC
  LIMIT 200
$$;

CREATE OR REPLACE FUNCTION public.meus_perfis_remetentes()
RETURNS TABLE(id uuid, nome text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.nome FROM public.perfis p
  WHERE public.pode_enviar_como(p.id) ORDER BY p.nome
$$;

GRANT EXECUTE ON FUNCTION public.listar_avisos(boolean, integer, integer), public.contar_nao_lidos(), public.marcar_todos_avisos_lidos(),
  public.avisos_enviados(), public.meus_perfis_remetentes(), public.pode_enviar_como(uuid), public.gere_aviso(uuid, uuid),
  public.aviso_vigente(timestamptz, timestamptz, timestamptz), public.limpar_html_aviso(text) TO authenticated;

ALTER PUBLICATION supabase_realtime ADD TABLE public.avisos;