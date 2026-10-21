CREATE TYPE public.app_role AS ENUM ('admin', 'rh', 'funcionario');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL UNIQUE,
  full_name text NOT NULL DEFAULT '',
  employee_id text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX profiles_employee_id_key ON public.profiles (lower(employee_id)) WHERE employee_id IS NOT NULL AND employee_id <> '';
GRANT SELECT ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur JOIN public.profiles p ON p.id = ur.user_id
    WHERE ur.user_id = _user_id AND ur.role = _role AND p.is_active
  );
$$;

CREATE OR REPLACE FUNCTION public.is_active_user(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id AND is_active);
$$;

CREATE OR REPLACE FUNCTION public.is_editor(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur JOIN public.profiles p ON p.id = ur.user_id
    WHERE ur.user_id = _user_id AND ur.role IN ('admin','rh') AND p.is_active
  );
$$;

REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_active_user(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_editor(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_active_user(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_editor(uuid) TO authenticated, service_role;

CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER profiles_set_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, employee_id)
  VALUES (
    NEW.id, lower(NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NULLIF(NEW.raw_user_meta_data->>'employee_id', '')
  ) ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'funcionario')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TYPE public.partner_category AS ENUM ('saude-bem-estar','esportes','gastronomia','estetica','educacao','compras-servicos','lazer');

CREATE TABLE public.partner_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  icon text NOT NULL DEFAULT 'Tag',
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  category public.partner_category NOT NULL DEFAULT 'lazer',
  category_slug text REFERENCES public.partner_categories(slug) ON UPDATE CASCADE ON DELETE SET NULL,
  summary text NOT NULL DEFAULT '',
  benefit_description text NOT NULL DEFAULT '',
  discount text NOT NULL DEFAULT '',
  how_to_use text NOT NULL DEFAULT '',
  rules text NOT NULL DEFAULT '',
  address text, website text, instagram text, whatsapp text, logo_url text,
  all_offices boolean NOT NULL DEFAULT true,
  is_featured boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.partner_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  file_path text NOT NULL,
  name text NOT NULL DEFAULT '',
  mime_type text NOT NULL DEFAULT '',
  size_bytes bigint NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.offices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.partner_offices (
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  office_id uuid NOT NULL REFERENCES public.offices(id) ON DELETE CASCADE,
  PRIMARY KEY (partner_id, office_id)
);

CREATE TABLE public.benefits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  summary text NOT NULL DEFAULT '',
  intro text NOT NULL DEFAULT '', intro_title text NOT NULL DEFAULT 'Sobre o benefício',
  values_info text NOT NULL DEFAULT '', values_title text NOT NULL DEFAULT 'Valores',
  how_to_use text NOT NULL DEFAULT '', how_to_use_title text NOT NULL DEFAULT 'Como utilizar',
  rules text NOT NULL DEFAULT '', rules_title text NOT NULL DEFAULT 'Regras',
  contacts text NOT NULL DEFAULT '', contacts_title text NOT NULL DEFAULT 'Contatos',
  website text, materials_url text,
  icon text NOT NULL DEFAULT 'Gift',
  needs_content boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.benefit_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  benefit_id uuid NOT NULL REFERENCES public.benefits(id) ON DELETE CASCADE,
  year text NOT NULL DEFAULT '',
  caption text NOT NULL DEFAULT '',
  image_url text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.reward_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  summary text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '', description_title text NOT NULL DEFAULT 'Sobre o programa',
  how_to_join text NOT NULL DEFAULT '', how_to_join_title text NOT NULL DEFAULT 'Como participar',
  rules text NOT NULL DEFAULT '', rules_title text NOT NULL DEFAULT 'Regras',
  contacts text NOT NULL DEFAULT '', contacts_title text NOT NULL DEFAULT 'Contatos',
  icon text NOT NULL DEFAULT 'Trophy',
  needs_content boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.site_content (
  key text PRIMARY KEY,
  value text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_categories, public.partners, public.partner_attachments, public.offices, public.partner_offices, public.benefits, public.benefit_images, public.reward_programs, public.site_content TO authenticated;
GRANT ALL ON public.partner_categories, public.partners, public.partner_attachments, public.offices, public.partner_offices, public.benefits, public.benefit_images, public.reward_programs, public.site_content TO service_role;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['partner_categories','partners','partner_attachments','offices','partner_offices','benefits','benefit_images','reward_programs','site_content']
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY "Active users read" ON public.%I FOR SELECT TO authenticated USING (public.is_active_user(auth.uid()))', t);
    EXECUTE format('CREATE POLICY "Editors insert" ON public.%I FOR INSERT TO authenticated WITH CHECK (public.is_editor(auth.uid()))', t);
    EXECUTE format('CREATE POLICY "Editors update" ON public.%I FOR UPDATE TO authenticated USING (public.is_editor(auth.uid())) WITH CHECK (public.is_editor(auth.uid()))', t);
    EXECUTE format('CREATE POLICY "Editors delete" ON public.%I FOR DELETE TO authenticated USING (public.is_editor(auth.uid()))', t);
    IF t <> 'partner_offices' THEN
      EXECUTE format('CREATE TRIGGER %I BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()', t || '_set_updated_at', t);
    END IF;
  END LOOP;
END $$;

CREATE POLICY "Active users read partner files" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'partner-logos' AND public.is_active_user(auth.uid()));
CREATE POLICY "Editors upload partner files" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'partner-logos' AND public.is_editor(auth.uid()));
CREATE POLICY "Editors update partner files" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'partner-logos' AND public.is_editor(auth.uid()));
CREATE POLICY "Editors delete partner files" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'partner-logos' AND public.is_editor(auth.uid()));