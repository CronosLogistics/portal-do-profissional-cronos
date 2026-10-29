CREATE OR REPLACE FUNCTION public.minhas_permissoes()
 RETURNS text[] LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT coalesce(array_agg(c), '{}') FROM unnest(ARRAY['admin.usuarios','admin.perfis','avisos.publicar','avisos.gerenciar','avisos.insider','conteudo.editar']) c
  WHERE public.usuario_tem_permissao(auth.uid(), c);
$function$;