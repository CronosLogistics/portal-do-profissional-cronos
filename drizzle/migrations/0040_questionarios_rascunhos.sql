CREATE TABLE public.questionarios_rascunhos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  autor_id uuid NOT NULL DEFAULT auth.uid(),
  titulo text NOT NULL DEFAULT '' CHECK (length(titulo) <= 200),
  descricao text NOT NULL DEFAULT '' CHECK (length(descricao) <= 10000),
  anonimo boolean NOT NULL DEFAULT false,
  perguntas jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(perguntas) = 'array' AND jsonb_array_length(perguntas) <= 30),
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.questionarios_rascunhos TO authenticated;
GRANT ALL ON public.questionarios_rascunhos TO service_role;
ALTER TABLE public.questionarios_rascunhos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Gestores gerenciam os próprios rascunhos" ON public.questionarios_rascunhos FOR ALL TO authenticated
  USING (autor_id = auth.uid() AND public.is_active_user(auth.uid()) AND public.tem_permissao('formularios.gerenciar'))
  WITH CHECK (autor_id = auth.uid() AND public.is_active_user(auth.uid()) AND public.tem_permissao('formularios.gerenciar'));
CREATE OR REPLACE FUNCTION public.questionarios_rascunhos_antes_gravar() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
  NEW.atualizado_em := now();
  IF TG_OP = 'UPDATE' THEN NEW.autor_id := OLD.autor_id; NEW.criado_em := OLD.criado_em; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER questionarios_rascunhos_antes_gravar BEFORE INSERT OR UPDATE ON public.questionarios_rascunhos
  FOR EACH ROW EXECUTE FUNCTION public.questionarios_rascunhos_antes_gravar();