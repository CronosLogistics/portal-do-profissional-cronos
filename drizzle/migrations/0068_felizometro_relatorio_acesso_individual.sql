CREATE OR REPLACE FUNCTION public.pode_ver_felizometro() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT coalesce(public.is_active_user(auth.uid()),false)
 AND auth.uid() IN (
 '4247f4ae-aa43-49ca-aa41-18d400bfef4f'::uuid,
 '16755e50-279f-42a5-b248-73e25e6d1020'::uuid,
 '37894b67-ce27-4d09-a31c-5ac4190a8ae6'::uuid
 );
$$;
REVOKE ALL ON FUNCTION public.pode_ver_felizometro() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pode_ver_felizometro() TO authenticated, service_role;
COMMENT ON FUNCTION public.pode_ver_felizometro() IS 'Report access is pinned to the three authorized active profile UUIDs; no department or administrator bypass. Shared by navigation, route guard and all report RPCs.';