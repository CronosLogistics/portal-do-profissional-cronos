# Cronos Insider - montagem mensal pelo RH

## Resultado
Todo primeiro dia útil do mês, o portal prepara um **rascunho da edição daquele mês**, usando o modelo enviado e os dados da lista **Profissionais Brasil**. O RH completa os textos, eventos e fotos, revisa e publica no portal. O rascunho não aparece para os demais profissionais antes da publicação.

## Editor do RH
- Adicionar uma área **Cronos Insider** dentro de Avisos, acessível pela permissão existente de Insider.
- Listar edições mensais com situação de rascunho ou publicada e data de preparação.
- Manter o cabeçalho, assinatura, rodapé e banners de aniversariantes e tempo de empresa enviados.
- Permitir editar abertura, textos entre seções e encerramento; adicionar, remover e ordenar eventos com imagem, título, data e descrição.
- Preencher aniversariantes com nome, dia de nascimento, departamento e escritório; RH adiciona ou troca a foto.
- Preencher tempo de empresa com nome, data da comemoração, departamento, escritório e anos completados; RH adiciona ou troca a foto.
- Mostrar uma prévia completa da edição antes de publicar, sem perder alterações ao voltar à edição.
- Salvar rascunhos para continuar depois. Fotos ausentes aparecem com iniciais na prévia; o RH pode revisar antes de publicar.

## Preparação automática
- Usar a conexão Microsoft já existente, cuja leitura da lista e dos campos necessários foi confirmada.
- Considerar apenas situações **ATIVO** e **EFETIVADO/ATIVO**, excluindo desligados.
- Usar nascimento para selecionar o mês e mostrar o dia, sem expor idade ou ano de nascimento.
- Usar **ADMISSÃO** para incluir todos que completam **1 ano ou mais** no mês da edição, ordenados pela data da comemoração.
- Criar uma única edição por mês, sem sobrescrever textos ou fotos já editados pelo RH.
- Preparar às **8h de Brasília** no primeiro dia de segunda a sexta do mês; feriados não alteram a data, conforme sua escolha. Pode haver cerca de 30 segundos de variação na execução.
- Incluir ação **Preparar edição** para gerar manualmente a primeira edição e testar sem esperar o próximo mês.
- Exibir falhas de leitura e permitir nova tentativa manual, sem criar uma edição incompleta como se estivesse correta.

## Publicação e integração com o portal
- Publicar somente após ação explícita do RH, escolhendo o perfil remetente disponível.
- Criar um único aviso do tipo **Cronos Insider** por edição e abrir o jornal completo no leitor existente.
- Preservar sino, leitura de avisos, permissões de envio e a regra atual do carrossel: Insider aparece por três dias de calendário a partir da publicação.
- Manter os avisos Insider antigos funcionando, sem modificar a criação comum de avisos.
- Não criar posts no mural automaticamente: este pedido trata da edição do jornal.

## Fora desta etapa
- Envio de email e exportação HTML, pois você escolheu publicação no portal.
- Geração automática de banners mensais. O banner enviado é a base inicial e poderá ser substituído manualmente pelo RH.
- Busca automática de fotos das pessoas e leitura de outras listas de profissionais fora da lista Brasil informada.

## Detalhes técnicos
- Persistir edições e conteúdo estruturado separadamente dos avisos, com mês único, revisão, vínculo de publicação e controle de acesso no banco.
- Usar funções autenticadas para edição e publicação; publicação e vínculo ao aviso na mesma transação, preservando as verificações existentes de remetente e Insider.
- Renderizar o layout completo a partir do conteúdo estruturado, sem enfraquecer a limpeza de HTML dos avisos comuns.
- Guardar fotos em armazenamento privado e resolver URLs temporárias na leitura; nunca salvar URLs que expiram no conteúdo da edição.
- Reutilizar o padrão de chamadas Microsoft do portal, projetando somente os campos necessários, com paginação limitada e erro explícito se a leitura ficar incompleta.
- Usar um agendamento gerenciado nos dias 1–3 do mês, com verificação do primeiro dia de segunda a sexta antes de consultar a lista; trava e unicidade mensal impedem concorrência e duplicação.

## Validação
- Testar seleção do mês, exclusão de desligados, datas e cálculo dos anos de casa, incluindo viradas de ano.
- Testar primeiro dia de segunda a sexta, edição única, preservação dos rascunhos e permissões de publicação/leitura de fotos.
- Conferir com dados reais: preparar uma edição, editar texto, incluir foto e evento, salvar, reabrir e revisar a prévia.
- Verificar publicação no leitor, aviso e carrossel, sem enviar emails; usar uma edição de teste identificada e arquivá-la após a conferência.