ALTER TABLE public.perfil_permissoes DROP CONSTRAINT perfil_permissoes_permissao_check;
ALTER TABLE public.perfil_permissoes ADD CONSTRAINT perfil_permissoes_permissao_check CHECK (permissao IN ('admin.usuarios','admin.perfis','avisos.publicar','avisos.gerenciar','avisos.insider','conteudo.editar','documentos.gerenciar','formularios.gerenciar'));
INSERT INTO public.perfil_permissoes (perfil_id,permissao) SELECT id,'formularios.gerenciar' FROM public.perfis WHERE sistema OR id='4e26aa42-d294-4e12-babe-48e0a1605f93' ON CONFLICT DO NOTHING;
CREATE TABLE public.formularios (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 setor text NOT NULL CHECK (length(btrim(setor)) BETWEEN 1 AND 100),
 titulo text NOT NULL CHECK (length(btrim(titulo)) BETWEEN 1 AND 200),
 codigo text NOT NULL DEFAULT '' CHECK(length(codigo)<=100),
 descricao text NOT NULL DEFAULT '' CHECK(length(descricao)<=2000),
 acao text NOT NULL CHECK (length(btrim(acao)) BETWEEN 1 AND 200),
 url text NOT NULL CHECK (length(url)<=2048 AND url ~ '^https://[^[:space:]]+$'),
 ordem integer NOT NULL DEFAULT 100,
 criado_em timestamptz NOT NULL DEFAULT now(),
 atualizado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT,INSERT,UPDATE ON public.formularios TO authenticated;
GRANT ALL ON public.formularios TO service_role;
ALTER TABLE public.formularios ENABLE ROW LEVEL SECURITY;
CREATE POLICY formularios_ler ON public.formularios FOR SELECT TO authenticated USING(public.is_active_user(auth.uid()));
CREATE POLICY formularios_inserir ON public.formularios FOR INSERT TO authenticated WITH CHECK(public.tem_permissao('formularios.gerenciar'));
CREATE POLICY formularios_editar ON public.formularios FOR UPDATE TO authenticated USING(public.tem_permissao('formularios.gerenciar')) WITH CHECK(public.tem_permissao('formularios.gerenciar'));
CREATE TRIGGER formularios_atualizado BEFORE UPDATE ON public.formularios FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
-- Backfill the existing official static catalogue as part of moving it into editable storage.
INSERT INTO public.formularios(setor,titulo,codigo,descricao,acao,url,ordem) SELECT setor,titulo,codigo,descricao,acao,url,ordem FROM (VALUES
('Controladoria','Solicitação de ajuste de custo','','Exclusão, edição e inserção de custos nos processos','Ajuste de custo','https://forms.office.com/r/K2w0DWH241',1),
('Controladoria','Cancelamento de processo','','','Solicitação de cancelamento de processos','https://forms.office.com/r/eJZpMGrXzk',2),
('Marketing','Briefing de Marketing','RQ-09-02','','Solicitação de Demandas para o Marketing','https://forms.cloud.microsoft/r/Etb0Rijz25',3),
('Marketing','Brindes comerciais','','','Solicitação de Brindes','https://cronoslogisticscombr.sharepoint.com/:l:/s/administrationteamgroup/JAAdjcGan5s7T6OTdrpF2TsxASAnQFQwfnpGcjNGjRHVemo?nav=NzBiYzgxZmEtNDE2Ny00ZjFiLWE5NmItNzViNDk2N2NiNzUw',4),
('Ouvidoria','Formulário de Ouvidoria Cronos','','','Formulário de Ouvidoria','https://forms.office.com/r/cgLkeNFZ1f',5),
('Qualidade','CRONOS GENIUS – Mentes em Movimento','','','Cadastro de ideias já implementadas','https://forms.office.com/r/mEMSsiww8C',6),
('Qualidade','Sugestão de melhoria e elogio','RQ-00-13','','Cadastro de Sugestão de melhoria e Elogios','https://cronoslogisticscombr.sharepoint.com/:l:/s/qualityteamgroup/FJ2GTcHoI_FMuABhegMUHbMByGDNiq5D1mmcDCYBJ9ab7Q?nav=MWIzODlkOTctMmUwYy00MjhkLTlhZGQtNDgxMjk5ODQ1NDk0',7),
('Qualidade','Não conformidade','RQ-00-02','','Registro de Não Conformidade','https://cronoslogisticscombr.sharepoint.com/:l:/s/qualityteamgroup/FFjvhl5PXUFEjwBj6-7tx0QB38OhowiqUW0HuAp2skyhRA?nav=ZDQyYjc3ZmEtOGQwYi00NjM5LWI3YWUtMDA4MzFiNDUxMzc2',8),
('Qualidade','Cadastro de fornecedor','','','Solicitação de cadastro de Fornecedor','https://forms.cloud.microsoft/r/fcrKi2D9DD',9),
('Qualidade','Cadastro de clientes','','','Solicitação de cadastro de Clientes','https://forms.cloud.microsoft/r/SfdWFqJnfh',10),
('TLD','Solicitação/atualização de cadastro de agentes','','','Solicitação de cadastro de agentes','https://forms.cloud.microsoft/r/WycLYGBcun',11),
('TI','Abertura de ticket / Ticket opening','','','Cadastro de ticket','https://cronoslogisticscombr.sharepoint.com/:l:/s/ITTeamGroup/JAD5KiJVEsADS6Ozp7BosA0_AY-NghuEgBYbHJCq2Cau4s4?nav=M2M2MTk4ZjktZWRlMC00ZmNiLTlmNDItMzkyZGUzN2JkODgx',12)
) AS legado(setor,titulo,codigo,descricao,acao,url,ordem);