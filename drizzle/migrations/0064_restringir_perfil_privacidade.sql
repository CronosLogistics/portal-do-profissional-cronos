REVOKE ALL PRIVILEGES ON TABLE public.perfil_privacidade FROM anon;
REVOKE ALL PRIVILEGES ON TABLE public.perfil_privacidade FROM authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.perfil_privacidade TO authenticated;
GRANT ALL PRIVILEGES ON TABLE public.perfil_privacidade TO service_role;