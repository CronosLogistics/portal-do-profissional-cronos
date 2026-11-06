ALTER TABLE public.reward_programs
  ADD COLUMN IF NOT EXISTS website_label text NOT NULL DEFAULT 'Visitar site',
  ADD COLUMN IF NOT EXISTS materials_label text NOT NULL DEFAULT 'Materiais / passo a passo';

ALTER TABLE public.benefits
  ADD COLUMN IF NOT EXISTS website_label text NOT NULL DEFAULT 'Visitar site',
  ADD COLUMN IF NOT EXISTS materials_label text NOT NULL DEFAULT 'Materiais e passo a passo';

ALTER TABLE public.partners
  ADD COLUMN IF NOT EXISTS website_label text NOT NULL DEFAULT 'Visitar site';