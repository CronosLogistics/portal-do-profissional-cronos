CREATE TABLE public.perfis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  descricao text NOT NULL DEFAULT '',
  sistema boolean NOT NULL DEFAULT false,
  ativo boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX perfis_nome_unico ON public.perfis (lower(nome));

CREATE TABLE public.perfil_permissoes (
  perfil_id uuid NOT NULL REFERENCES public.perfis(id) ON DELETE CASCADE,
  permissao text NOT NULL CHECK (permissao IN ('admin.usuarios','admin.perfis','avisos.publicar','avisos.gerenciar','conteudo.editar')),
  PRIMARY KEY (perfil_id, permissao)
);

CREATE TABLE public.usuario_perfis (
  usuario_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  perfil_id uuid NOT NULL REFERENCES public.perfis(id) ON DELETE RESTRICT,
  atribuido_por uuid DEFAULT auth.uid(),
  atribuido_em timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (usuario_id, perfil_id)
);
CREATE INDEX usuario_perfis_perfil ON public.usuario_perfis (perfil_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.perfis TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.perfil_permissoes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.usuario_perfis TO authenticated;
GRANT ALL ON public.perfis, public.perfil_permissoes, public.usuario_perfis TO service_role;

-- Permissão efetiva: profissional ativo + perfil ativo (perfil de sistema tem todas).
CREATE OR REPLACE FUNCTION public.usuario_tem_permissao(_user_id uuid, _permissao text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.usuario_perfis up
    JOIN public.perfis pf ON pf.id = up.perfil_id AND pf.ativo
    JOIN public.profiles p ON p.id = up.usuario_id AND p.is_active
    WHERE up.usuario_id = _user_id
      AND (pf.sistema OR EXISTS (SELECT 1 FROM public.perfil_permissoes pp WHERE pp.perfil_id = pf.id AND pp.permissao = _permissao))
  );
$$;

CREATE OR REPLACE FUNCTION public.tem_permissao(_permissao text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.usuario_tem_permissao(auth.uid(), _permissao);
$$;

CREATE OR REPLACE FUNCTION public.minhas_permissoes()
RETURNS text[] LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(array_agg(c), '{}') FROM unnest(ARRAY['admin.usuarios','admin.perfis','avisos.publicar','avisos.gerenciar','conteudo.editar']) c
  WHERE public.usuario_tem_permissao(auth.uid(), c);
$$;

ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perfil_permissoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuario_perfis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ativos leem perfis" ON public.perfis FOR SELECT TO authenticated USING (public.is_active_user(auth.uid()));
CREATE POLICY "Gestores criam perfis" ON public.perfis FOR INSERT TO authenticated WITH CHECK (public.tem_permissao('admin.perfis') AND NOT sistema);
CREATE POLICY "Gestores alteram perfis" ON public.perfis FOR UPDATE TO authenticated USING (public.tem_permissao('admin.perfis')) WITH CHECK (public.tem_permissao('admin.perfis'));
CREATE POLICY "Gestores excluem perfis" ON public.perfis FOR DELETE TO authenticated USING (public.tem_permissao('admin.perfis'));

CREATE POLICY "Ativos leem permissoes" ON public.perfil_permissoes FOR SELECT TO authenticated USING (public.is_active_user(auth.uid()));
CREATE POLICY "Gestores marcam permissoes" ON public.perfil_permissoes FOR INSERT TO authenticated WITH CHECK (public.tem_permissao('admin.perfis'));
CREATE POLICY "Gestores desmarcam permissoes" ON public.perfil_permissoes FOR DELETE TO authenticated USING (public.tem_permissao('admin.perfis'));

CREATE POLICY "Le vinculos" ON public.usuario_perfis FOR SELECT TO authenticated
  USING (usuario_id = auth.uid() OR public.tem_permissao('admin.usuarios') OR public.tem_permissao('admin.perfis'));
CREATE POLICY "Adiciona vinculos" ON public.usuario_perfis FOR INSERT TO authenticated
  WITH CHECK ((public.tem_permissao('admin.usuarios') OR public.tem_permissao('admin.perfis')) AND public.is_active_user(usuario_id));
CREATE POLICY "Remove vinculos" ON public.usuario_perfis FOR DELETE TO authenticated
  USING (public.tem_permissao('admin.usuarios') OR public.tem_permissao('admin.perfis'));

-- Travas do perfil de sistema
CREATE OR REPLACE FUNCTION public.proteger_perfil_sistema() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.sistema THEN RAISE EXCEPTION 'O perfil Administrador é do sistema e não pode ser excluído.'; END IF;
    IF EXISTS (SELECT 1 FROM public.usuario_perfis WHERE perfil_id = OLD.id) THEN
      RAISE EXCEPTION 'Perfil com membros não pode ser excluído; desative-o.';
    END IF;
    RETURN OLD;
  END IF;
  IF OLD.sistema AND (NOT NEW.ativo OR NOT NEW.sistema) THEN
    RAISE EXCEPTION 'O perfil Administrador é do sistema e não pode ser desativado.';
  END IF;
  IF NEW.sistema AND NOT OLD.sistema THEN RAISE EXCEPTION 'Operação não permitida.'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER perfis_proteger BEFORE UPDATE OR DELETE ON public.perfis FOR EACH ROW EXECUTE FUNCTION public.proteger_perfil_sistema();

CREATE OR REPLACE FUNCTION public.proteger_permissoes_sistema() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.perfis WHERE id = OLD.perfil_id AND sistema) THEN
    RAISE EXCEPTION 'O perfil Administrador não pode perder permissões.';
  END IF;
  RETURN OLD;
END $$;
CREATE TRIGGER perfil_permissoes_proteger BEFORE DELETE ON public.perfil_permissoes FOR EACH ROW EXECUTE FUNCTION public.proteger_permissoes_sistema();

CREATE OR REPLACE FUNCTION public.proteger_ultimo_admin() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.perfis WHERE id = OLD.perfil_id AND sistema)
     AND NOT EXISTS (
       SELECT 1 FROM public.usuario_perfis up JOIN public.profiles p ON p.id = up.usuario_id AND p.is_active
       WHERE up.perfil_id = OLD.perfil_id AND up.usuario_id <> OLD.usuario_id)
     AND EXISTS (SELECT 1 FROM public.perfis WHERE id = OLD.perfil_id) THEN
    RAISE EXCEPTION 'O perfil Administrador precisa de pelo menos um membro ativo.';
  END IF;
  RETURN OLD;
END $$;
CREATE TRIGGER usuario_perfis_ultimo_admin BEFORE DELETE ON public.usuario_perfis FOR EACH ROW EXECUTE FUNCTION public.proteger_ultimo_admin();

-- Perfis iniciais e migração de quem já tinha papel
INSERT INTO public.perfis (nome, descricao, sistema) VALUES
  ('Administrador', 'Acesso total ao portal.', true),
  ('Gestão de Pessoas', 'Publica avisos e edita os conteúdos do portal.', false),
  ('Qualidade', 'Publica avisos.', false),
  ('Administrativo', 'Publica avisos.', false);
INSERT INTO public.perfil_permissoes (perfil_id, permissao)
  SELECT id, c FROM public.perfis, unnest(ARRAY['admin.usuarios','admin.perfis','avisos.publicar','avisos.gerenciar','conteudo.editar']) c WHERE nome = 'Administrador';
INSERT INTO public.perfil_permissoes (perfil_id, permissao)
  SELECT id, c FROM public.perfis, unnest(ARRAY['avisos.publicar','conteudo.editar']) c WHERE nome = 'Gestão de Pessoas';
INSERT INTO public.perfil_permissoes (perfil_id, permissao)
  SELECT id, 'avisos.publicar' FROM public.perfis WHERE nome IN ('Qualidade','Administrativo');
INSERT INTO public.usuario_perfis (usuario_id, perfil_id, atribuido_por)
  SELECT DISTINCT ur.user_id, pf.id, NULL::uuid FROM public.user_roles ur JOIN public.profiles p ON p.id = ur.user_id
  JOIN public.perfis pf ON pf.nome = CASE ur.role WHEN 'admin' THEN 'Administrador' WHEN 'rh' THEN 'Gestão de Pessoas' END
  WHERE ur.role IN ('admin','rh');

-- Regras existentes passam a ler as permissões dos perfis
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE _role
    WHEN 'admin' THEN public.usuario_tem_permissao(_user_id, 'admin.usuarios')
    WHEN 'rh' THEN public.usuario_tem_permissao(_user_id, 'conteudo.editar')
    ELSE public.is_active_user(_user_id) END;
$$;
CREATE OR REPLACE FUNCTION public.is_editor(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.usuario_tem_permissao(_user_id, 'conteudo.editar');
$$;

DROP POLICY "Users view own profile" ON public.profiles;
CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.tem_permissao('admin.usuarios') OR public.tem_permissao('admin.perfis'));
DROP POLICY "Admins view sync status" ON public.status_sincronizacao;
CREATE POLICY "Admins view sync status" ON public.status_sincronizacao FOR SELECT TO authenticated USING (public.tem_permissao('admin.usuarios'));

-- Listagem com perfis (etiquetas)
CREATE OR REPLACE FUNCTION public.admin_listar_profissionais_perfis(_busca text, _filtro text, _limite integer, _deslocamento integer)
RETURNS TABLE(id uuid, email text, full_name text, employee_id text, is_active boolean, entra_oid text, primeiro_acesso timestamptz, ultimo_acesso timestamptz, sincronizado_em timestamptz, perfis jsonb, total bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, extensions AS $$
BEGIN
  IF NOT public.tem_permissao('admin.usuarios') THEN RAISE EXCEPTION 'Acesso restrito a administradores.'; END IF;
  RETURN QUERY
  WITH base AS (
    SELECT p.*, coalesce((SELECT jsonb_agg(jsonb_build_object('id', pf.id, 'nome', pf.nome, 'sistema', pf.sistema) ORDER BY pf.sistema DESC, pf.nome)
      FROM public.usuario_perfis up JOIN public.perfis pf ON pf.id = up.perfil_id AND pf.ativo WHERE up.usuario_id = p.id), '[]'::jsonb) AS pfs
    FROM public.profiles p
    WHERE (coalesce(_busca, '') = ''
        OR unaccent(lower(p.full_name)) LIKE '%' || unaccent(lower(_busca)) || '%'
        OR unaccent(lower(p.email)) LIKE '%' || unaccent(lower(_busca)) || '%')
  ), f AS (
    SELECT * FROM base b WHERE CASE coalesce(_filtro, 'todos')
      WHEN 'ativos' THEN b.is_active WHEN 'inativos' THEN NOT b.is_active
      WHEN 'com-perfil' THEN jsonb_array_length(b.pfs) > 0 ELSE true END
  )
  SELECT f.id, f.email, f.full_name, f.employee_id, f.is_active, f.entra_oid, f.primeiro_acesso, f.ultimo_acesso, f.sincronizado_em, f.pfs, count(*) OVER ()
  FROM f ORDER BY unaccent(lower(f.full_name)), f.email
  LIMIT greatest(1, least(coalesce(_limite, 50), 100)) OFFSET greatest(0, coalesce(_deslocamento, 0));
END $$;

-- Busca de profissionais ativos para adicionar a um perfil
CREATE OR REPLACE FUNCTION public.buscar_profissionais_ativos(_busca text)
RETURNS TABLE(id uuid, email text, full_name text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, extensions AS $$
BEGIN
  IF NOT (public.tem_permissao('admin.perfis') OR public.tem_permissao('admin.usuarios')) THEN RAISE EXCEPTION 'Acesso restrito.'; END IF;
  RETURN QUERY SELECT p.id, p.email, p.full_name FROM public.profiles p
  WHERE p.is_active AND (unaccent(lower(p.full_name)) LIKE '%' || unaccent(lower(coalesce(_busca,''))) || '%'
     OR lower(p.email) LIKE '%' || lower(coalesce(_busca,'')) || '%')
  ORDER BY p.full_name LIMIT 10;
END $$;

-- Membros de cada perfil com nome (para a aba Perfis)
CREATE OR REPLACE FUNCTION public.membros_perfil(_perfil_id uuid)
RETURNS TABLE(id uuid, email text, full_name text, is_active boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT (public.tem_permissao('admin.perfis') OR public.tem_permissao('admin.usuarios')) THEN RAISE EXCEPTION 'Acesso restrito.'; END IF;
  RETURN QUERY SELECT p.id, p.email, p.full_name, p.is_active FROM public.usuario_perfis up JOIN public.profiles p ON p.id = up.usuario_id
  WHERE up.perfil_id = _perfil_id ORDER BY p.full_name;
END $$;

COMMENT ON TABLE public.user_roles IS 'DEPRECATED: replaced by perfis / usuario_perfis / perfil_permissoes';