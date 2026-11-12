ALTER TABLE public.avisos ADD COLUMN permite_interacao boolean NOT NULL DEFAULT false;
ALTER TABLE public.avisos_comentarios ADD COLUMN gif_url text;
ALTER TABLE public.mural_comentarios ADD COLUMN gif_url text;

CREATE FUNCTION public.gif_permitido(_url text) RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path=public AS $$
  SELECT _url ~ '^https://(media[0-9]*|i)\.giphy\.com/[A-Za-z0-9_./-]+$' AND char_length(_url) <= 500;
$$;
GRANT EXECUTE ON FUNCTION public.gif_permitido(text) TO authenticated, service_role;

ALTER TABLE public.avisos_comentarios DROP CONSTRAINT avisos_comentarios_texto_check;
ALTER TABLE public.avisos_comentarios ADD CONSTRAINT avisos_comentarios_conteudo_check CHECK (char_length(btrim(texto)) <= 1000 AND (char_length(btrim(texto)) >= 1 OR gif_url IS NOT NULL) AND (gif_url IS NULL OR public.gif_permitido(gif_url)));
ALTER TABLE public.mural_comentarios DROP CONSTRAINT mural_comentarios_texto_check;
ALTER TABLE public.mural_comentarios ADD CONSTRAINT mural_comentarios_conteudo_check CHECK (char_length(btrim(texto)) <= 1000 AND (char_length(btrim(texto)) >= 1 OR gif_url IS NOT NULL) AND (gif_url IS NULL OR public.gif_permitido(gif_url)));

-- Individual grants for named people (outside department sync); only service_role writes.
CREATE TABLE public.permissoes_individuais (
  usuario_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  permissao text NOT NULL CHECK (permissao NOT LIKE 'admin.%'),
  criado_em timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (usuario_id, permissao)
);
GRANT ALL ON public.permissoes_individuais TO service_role;
ALTER TABLE public.permissoes_individuais ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.usuario_tem_permissao(_user_id uuid,_permissao text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
SELECT EXISTS(SELECT 1 FROM public.usuario_perfis up JOIN public.perfis pf ON pf.id=up.perfil_id AND pf.ativo JOIN public.profiles p ON p.id=up.usuario_id AND p.is_active WHERE up.usuario_id=_user_id AND ((pf.sistema AND pf.departamento_sp_id IS NULL) OR (_permissao NOT LIKE 'admin.%' AND NOT pf.sistema AND (pf.departamento_sp_id IS NOT NULL OR NOT EXISTS(SELECT 1 FROM public.departamentos_sincronizacao WHERE id AND ativada)) AND EXISTS(SELECT 1 FROM public.perfil_permissoes pp WHERE pp.perfil_id=pf.id AND pp.permissao=_permissao))))
OR (_permissao NOT LIKE 'admin.%' AND EXISTS(SELECT 1 FROM public.permissoes_individuais pi JOIN public.profiles p ON p.id=pi.usuario_id AND p.is_active WHERE pi.usuario_id=_user_id AND pi.permissao=_permissao));
$$;

CREATE OR REPLACE FUNCTION public.minhas_permissoes() RETURNS text[] LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT coalesce(array_agg(c),'{}') FROM unnest(ARRAY['admin.usuarios','admin.perfis','avisos.publicar','avisos.gerenciar','avisos.insider','avisos.confirmacao','avisos.interacao','conteudo.editar','documentos.gerenciar','formularios.gerenciar','pendencias.liderados']) c WHERE public.usuario_tem_permissao(auth.uid(),c); $$;

CREATE OR REPLACE FUNCTION public.limpar_html_aviso(_html text)
RETURNS text LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $$
DECLARE
  r text := coalesce(_html, '');
  anterior text;
BEGIN
  LOOP
    anterior := r;
    r := regexp_replace(r, '<(script|style|iframe|object|embed|svg|math)\y[^>]*>.*?</\1\s*>', '', 'gi');
    r := regexp_replace(r, '<!--.*?-->', '', 'g');
    r := regexp_replace(r, '<(?!/?(b|strong|i|em|u|ul|ol|li|p|br|div|a|img)(\s|/|>))[^>]*>?', '', 'gi');
    EXIT WHEN r = anterior;
  END LOOP;
  r := regexp_replace(r, '<(/?)(b|strong|i|em|u|ul|ol|li|p|br|div)(\s[^>]*)?/?>', '<\1\2>', 'gi');
  r := regexp_replace(r, '<a\s[^>]*?href\s*=\s*["'']\s*((https?:|mailto:)[^"''<>\s]*)\s*["''][^>]*>', '<a href="\1">', 'gi');
  r := regexp_replace(r, '<a(?!\s+href="(https?:|mailto:)[^"]*">)(\s[^>]*)?>', '<a>', 'gi');
  r := regexp_replace(r, '</a\s[^>]*>', '</a>', 'gi');
  -- GIFs: only Giphy https images, rebuilt with a fixed attribute set; anything else is removed.
  r := regexp_replace(r, '<img\s[^>]*?src\s*=\s*["'']\s*(https://(media[0-9]*|i)\.giphy\.com/[A-Za-z0-9_./-]+)\s*["''][^>]*>', '<img src="\1" alt="GIF">', 'gi');
  r := regexp_replace(r, '<img(?!\s+src="https://(media[0-9]*|i)\.giphy\.com/[A-Za-z0-9_./-]+" alt="GIF">)[^>]*>', '', 'gi');
  r := regexp_replace(r, '</img\s*>', '', 'gi');
  RETURN r;
END $$;

CREATE OR REPLACE FUNCTION public.avisos_validar_interacao() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
  IF NEW.tipo <> 'comum' THEN NEW.permite_interacao := false; RETURN NEW; END IF;
  IF auth.uid() IS NOT NULL AND NEW.permite_interacao IS DISTINCT FROM (CASE WHEN TG_OP='INSERT' THEN false ELSE OLD.permite_interacao END)
     AND NOT public.tem_permissao('avisos.interacao') THEN
    RAISE EXCEPTION 'Você não pode alterar a interação deste aviso';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.avisos_validar_interacao() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER avisos_validar_interacao BEFORE INSERT OR UPDATE ON public.avisos FOR EACH ROW EXECUTE FUNCTION public.avisos_validar_interacao();

-- Interactive common notices reuse the Insider/compilado comments and reactions, respecting recipients.
CREATE OR REPLACE FUNCTION public.pode_interagir_compilado(_aviso_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
SELECT public.is_active_user(auth.uid()) AND EXISTS(SELECT 1 FROM public.avisos a WHERE a.id=_aviso_id AND (
  (a.tipo IN ('compilado','insider') AND (public.aviso_vigente(a.publicar_em,a.expira_em,a.arquivado_em) OR public.gere_aviso(a.autor_id,a.perfil_id)))
  OR (a.tipo='comum' AND a.permite_interacao AND (public.gere_aviso(a.autor_id,a.perfil_id) OR (a.arquivado_em IS NULL AND a.publicar_em<=now() AND public.aviso_para_usuario(a.id, auth.uid()))))
)); $$;

CREATE OR REPLACE FUNCTION public.interacoes_compilado(_aviso_id uuid) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT CASE WHEN NOT public.pode_interagir_compilado(_aviso_id) THEN NULL ELSE jsonb_build_object(
    'comentarios', coalesce((SELECT jsonb_agg(jsonb_build_object(
      'id', c.id, 'texto', c.texto, 'gif_url', c.gif_url, 'criado_em', c.criado_em, 'editado_em', c.editado_em,
      'usuario_id', c.usuario_id, 'nome', coalesce(nullif(pr.full_name, ''), pr.email, 'Profissional')
    ) ORDER BY c.criado_em, c.id) FROM public.avisos_comentarios c LEFT JOIN public.profiles pr ON pr.id = c.usuario_id WHERE c.aviso_id = _aviso_id), '[]'::jsonb),
    'reacoes', coalesce((SELECT jsonb_agg(jsonb_build_object('emoji', x.emoji, 'total', x.total, 'meu', x.meu) ORDER BY x.total DESC, x.emoji)
      FROM (SELECT r.emoji, count(*)::int AS total, bool_or(r.usuario_id = auth.uid()) AS meu FROM public.avisos_reacoes r WHERE r.aviso_id = _aviso_id GROUP BY r.emoji) x), '[]'::jsonb),
    'minha_reacao', (SELECT r.emoji FROM public.avisos_reacoes r WHERE r.aviso_id = _aviso_id AND r.usuario_id = auth.uid())
  ) END;
$$;

CREATE OR REPLACE FUNCTION public.listar_mural()
 RETURNS TABLE(id uuid, titulo text, texto text, imagem_path text, data_post date, visivel_ate date, criado_em timestamp with time zone, comentarios jsonb, tipo text, anos_casa integer, publicar_em timestamp with time zone)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$ SELECT p.id,p.titulo,p.texto,p.imagem_path,p.data_post,p.visivel_ate,p.criado_em,coalesce((SELECT jsonb_agg(jsonb_build_object('id',c.id,'texto',c.texto,'gif_url',c.gif_url,'criado_em',c.criado_em,'editado_em',c.editado_em,'usuario_id',c.usuario_id,'nome',coalesce(pr.full_name,pr.email,'Profissional')) ORDER BY c.criado_em) FROM public.mural_comentarios c LEFT JOIN public.profiles pr ON pr.id=c.usuario_id WHERE c.post_id=p.id),'[]'::jsonb),p.tipo,p.anos_casa,p.publicar_em FROM public.mural_posts p WHERE public.is_active_user(auth.uid()) AND (public.mural_publicado(p.data_post,p.publicar_em) OR ((p.data_post>(now() AT TIME ZONE 'America/Sao_Paulo')::date OR p.publicar_em>now()) AND public.tem_permissao('conteudo.editar'))) ORDER BY p.data_post DESC,p.criado_em DESC; $function$;