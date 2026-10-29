-- Compilado: respect the same visibility as avisos and require an active professional.
CREATE FUNCTION public.pode_interagir_compilado(_aviso_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_active_user(auth.uid()) AND EXISTS (
    SELECT 1 FROM public.avisos a WHERE a.id = _aviso_id AND a.tipo = 'compilado'
    AND (public.aviso_vigente(a.publicar_em, a.expira_em, a.arquivado_em) OR public.gere_aviso(a.autor_id, a.perfil_id))
  );
$$;
REVOKE ALL ON FUNCTION public.pode_interagir_compilado(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pode_interagir_compilado(uuid) TO authenticated, service_role;

CREATE TABLE public.avisos_comentarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aviso_id uuid NOT NULL REFERENCES public.avisos(id) ON DELETE CASCADE,
  usuario_id uuid NOT NULL DEFAULT auth.uid(),
  texto text NOT NULL CHECK (char_length(btrim(texto)) BETWEEN 1 AND 1000),
  criado_em timestamptz NOT NULL DEFAULT now(),
  editado_em timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.avisos_comentarios TO authenticated;
GRANT ALL ON public.avisos_comentarios TO service_role;
ALTER TABLE public.avisos_comentarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "compilado comentarios ler" ON public.avisos_comentarios FOR SELECT TO authenticated USING (public.pode_interagir_compilado(aviso_id));
CREATE POLICY "compilado comentarios criar" ON public.avisos_comentarios FOR INSERT TO authenticated WITH CHECK (usuario_id = auth.uid() AND public.pode_interagir_compilado(aviso_id));
CREATE POLICY "compilado comentarios editar" ON public.avisos_comentarios FOR UPDATE TO authenticated USING (usuario_id = auth.uid() AND public.pode_interagir_compilado(aviso_id)) WITH CHECK (usuario_id = auth.uid() AND public.pode_interagir_compilado(aviso_id));
CREATE POLICY "compilado comentarios apagar" ON public.avisos_comentarios FOR DELETE TO authenticated USING (public.pode_interagir_compilado(aviso_id) AND (usuario_id = auth.uid() OR public.tem_permissao('conteudo.editar')));
CREATE INDEX avisos_comentarios_aviso_criado_idx ON public.avisos_comentarios(aviso_id, criado_em);

CREATE FUNCTION public.avisos_coment_antes() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.texto := btrim(NEW.texto);
  IF TG_OP = 'UPDATE' THEN
    NEW.id := OLD.id;
    NEW.aviso_id := OLD.aviso_id;
    NEW.usuario_id := OLD.usuario_id;
    NEW.criado_em := OLD.criado_em;
    NEW.editado_em := CASE WHEN NEW.texto IS DISTINCT FROM OLD.texto THEN now() ELSE OLD.editado_em END;
  ELSE
    NEW.editado_em := NULL;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER avisos_coment_antes BEFORE INSERT OR UPDATE ON public.avisos_comentarios FOR EACH ROW EXECUTE FUNCTION public.avisos_coment_antes();
REVOKE ALL ON FUNCTION public.avisos_coment_antes() FROM PUBLIC, anon, authenticated;

CREATE TABLE public.avisos_reacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aviso_id uuid NOT NULL REFERENCES public.avisos(id) ON DELETE CASCADE,
  usuario_id uuid NOT NULL DEFAULT auth.uid(),
  emoji text NOT NULL CHECK (emoji IN ('👍', '❤️', '👏', '🎉', '😮')),
  criado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (aviso_id, usuario_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.avisos_reacoes TO authenticated;
GRANT ALL ON public.avisos_reacoes TO service_role;
ALTER TABLE public.avisos_reacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "compilado reacoes ler" ON public.avisos_reacoes FOR SELECT TO authenticated USING (public.pode_interagir_compilado(aviso_id));
CREATE POLICY "compilado reacoes criar" ON public.avisos_reacoes FOR INSERT TO authenticated WITH CHECK (usuario_id = auth.uid() AND public.pode_interagir_compilado(aviso_id));
CREATE POLICY "compilado reacoes editar" ON public.avisos_reacoes FOR UPDATE TO authenticated USING (usuario_id = auth.uid() AND public.pode_interagir_compilado(aviso_id)) WITH CHECK (usuario_id = auth.uid() AND public.pode_interagir_compilado(aviso_id));
CREATE POLICY "compilado reacoes apagar" ON public.avisos_reacoes FOR DELETE TO authenticated USING (usuario_id = auth.uid() AND public.pode_interagir_compilado(aviso_id));

CREATE FUNCTION public.interacoes_compilado(_aviso_id uuid) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE WHEN NOT public.pode_interagir_compilado(_aviso_id) THEN NULL ELSE jsonb_build_object(
    'comentarios', coalesce((SELECT jsonb_agg(jsonb_build_object(
      'id', c.id, 'texto', c.texto, 'criado_em', c.criado_em, 'editado_em', c.editado_em,
      'usuario_id', c.usuario_id, 'nome', coalesce(nullif(pr.full_name, ''), pr.email, 'Profissional')
    ) ORDER BY c.criado_em, c.id) FROM public.avisos_comentarios c LEFT JOIN public.profiles pr ON pr.id = c.usuario_id WHERE c.aviso_id = _aviso_id), '[]'::jsonb),
    'reacoes', coalesce((SELECT jsonb_agg(jsonb_build_object('emoji', x.emoji, 'total', x.total, 'meu', x.meu) ORDER BY x.total DESC, x.emoji)
      FROM (SELECT r.emoji, count(*)::int AS total, bool_or(r.usuario_id = auth.uid()) AS meu FROM public.avisos_reacoes r WHERE r.aviso_id = _aviso_id GROUP BY r.emoji) x), '[]'::jsonb),
    'minha_reacao', (SELECT r.emoji FROM public.avisos_reacoes r WHERE r.aviso_id = _aviso_id AND r.usuario_id = auth.uid())
  ) END;
$$;
REVOKE ALL ON FUNCTION public.interacoes_compilado(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.interacoes_compilado(uuid) TO authenticated, service_role;

CREATE TABLE public.mural_reacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.mural_posts(id) ON DELETE CASCADE,
  usuario_id uuid NOT NULL DEFAULT auth.uid(),
  emoji text NOT NULL CHECK (emoji IN ('👍', '❤️', '👏', '🎉', '😮')),
  criado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, usuario_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mural_reacoes TO authenticated;
GRANT ALL ON public.mural_reacoes TO service_role;
ALTER TABLE public.mural_reacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mural reacoes ler" ON public.mural_reacoes FOR SELECT TO authenticated USING (public.is_active_user(auth.uid()));
CREATE POLICY "mural reacoes criar" ON public.mural_reacoes FOR INSERT TO authenticated WITH CHECK (usuario_id = auth.uid() AND public.is_active_user(auth.uid()));
CREATE POLICY "mural reacoes editar" ON public.mural_reacoes FOR UPDATE TO authenticated USING (usuario_id = auth.uid() AND public.is_active_user(auth.uid())) WITH CHECK (usuario_id = auth.uid() AND public.is_active_user(auth.uid()));
CREATE POLICY "mural reacoes apagar" ON public.mural_reacoes FOR DELETE TO authenticated USING (usuario_id = auth.uid() AND public.is_active_user(auth.uid()));

-- Upserts may change only the emoji, never the parent, author or original timestamp.
CREATE FUNCTION public.reacoes_antes_atualizar() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.id := OLD.id;
  NEW.usuario_id := OLD.usuario_id;
  NEW.criado_em := OLD.criado_em;
  IF TG_TABLE_NAME = 'avisos_reacoes' THEN NEW.aviso_id := OLD.aviso_id;
  ELSE NEW.post_id := OLD.post_id;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER avisos_reacoes_antes BEFORE UPDATE ON public.avisos_reacoes FOR EACH ROW EXECUTE FUNCTION public.reacoes_antes_atualizar();
CREATE TRIGGER mural_reacoes_antes BEFORE UPDATE ON public.mural_reacoes FOR EACH ROW EXECUTE FUNCTION public.reacoes_antes_atualizar();
REVOKE ALL ON FUNCTION public.reacoes_antes_atualizar() FROM PUBLIC, anon, authenticated;

-- Additive RPC: keep listar_mural() intact for the currently published application.
CREATE FUNCTION public.listar_mural_com_reacoes()
RETURNS TABLE(id uuid, titulo text, texto text, imagem_path text, data_post date, visivel_ate date, criado_em timestamptz, comentarios jsonb, tipo text, anos_casa integer, reacoes jsonb, minha_reacao text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.titulo, p.texto, p.imagem_path, p.data_post, p.visivel_ate, p.criado_em, p.comentarios, p.tipo, p.anos_casa,
    coalesce((SELECT jsonb_agg(jsonb_build_object('emoji', x.emoji, 'total', x.total, 'meu', x.meu) ORDER BY x.total DESC, x.emoji)
      FROM (SELECT r.emoji, count(*)::int AS total, bool_or(r.usuario_id = auth.uid()) AS meu FROM public.mural_reacoes r WHERE r.post_id = p.id GROUP BY r.emoji) x), '[]'::jsonb),
    (SELECT r.emoji FROM public.mural_reacoes r WHERE r.post_id = p.id AND r.usuario_id = auth.uid())
  FROM public.listar_mural() p WHERE public.is_active_user(auth.uid())
  ORDER BY p.data_post DESC, p.criado_em DESC;
$$;
REVOKE ALL ON FUNCTION public.listar_mural_com_reacoes() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.listar_mural_com_reacoes() TO authenticated, service_role;
COMMENT ON FUNCTION public.listar_mural() IS 'Compatibility RPC retained for older deployed clients; reaction-aware clients use listar_mural_com_reacoes().';