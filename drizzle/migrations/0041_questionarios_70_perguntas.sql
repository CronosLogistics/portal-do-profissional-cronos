ALTER TABLE public.questionarios_internos DROP CONSTRAINT questionarios_internos_perguntas_check;
ALTER TABLE public.questionarios_internos ADD CONSTRAINT questionarios_internos_perguntas_check CHECK (jsonb_typeof(perguntas) = 'array' AND jsonb_array_length(perguntas) BETWEEN 1 AND 70);--> statement-breakpoint
ALTER TABLE public.questionarios_rascunhos DROP CONSTRAINT questionarios_rascunhos_perguntas_check;
ALTER TABLE public.questionarios_rascunhos ADD CONSTRAINT questionarios_rascunhos_perguntas_check CHECK (jsonb_typeof(perguntas) = 'array' AND jsonb_array_length(perguntas) <= 70);--> statement-breakpoint
DO $$ BEGIN
 EXECUTE replace(pg_get_functiondef('public.validar_perguntas_questionario(jsonb)'::regprocedure), 'NOT BETWEEN 1 AND 30', 'NOT BETWEEN 1 AND 70');
END $$;
