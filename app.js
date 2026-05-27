-- ============================================================
--  VyXora Agendas — Atualização do banco de dados (Supabase)
-- ============================================================
--  COMO USAR:
--  1. Abra o painel do Supabase do seu projeto
--  2. Vá no menu lateral em "SQL Editor"
--  3. Clique em "New query"
--  4. Cole TODO este conteúdo
--  5. Clique em "Run" (ou aperte Ctrl + Enter)
--  6. Deve aparecer "Success. No rows returned"
--
--  É SEGURO RODAR VÁRIAS VEZES.
--  O "IF NOT EXISTS" faz com que cada coluna só seja criada
--  se ainda não existir. Se já existir, ele simplesmente pula
--  sem dar erro. Você não vai perder nenhum dado.
-- ============================================================


-- ------------------------------------------------------------
--  PARTE 1 — A correção principal: HORÁRIOS DE FUNCIONAMENTO
-- ------------------------------------------------------------
--  Cria a coluna que guarda quais dias da semana sua empresa
--  está aberta. É um JSON com os 7 dias. Por padrão, abre de
--  segunda a sábado e fecha no domingo (dom = false).
--  É isso que faz os horários ficarem SALVOS de verdade e
--  bloquearem os dias fechados no seu link público.

ALTER TABLE agenda_empresas
  ADD COLUMN IF NOT EXISTS horarios_funcionamento JSONB
  DEFAULT '{"seg":true,"ter":true,"qua":true,"qui":true,"sex":true,"sab":true,"dom":false}'::jsonb;


-- ------------------------------------------------------------
--  PARTE 2 — Garante as demais colunas que o painel usa
-- ------------------------------------------------------------
--  Endereço e cidade (aba Configurações → Dados da empresa)

ALTER TABLE agenda_empresas
  ADD COLUMN IF NOT EXISTS endereco TEXT;

ALTER TABLE agenda_empresas
  ADD COLUMN IF NOT EXISTS cidade TEXT;

--  Redes sociais (aba Configurações → Redes sociais)

ALTER TABLE agenda_empresas
  ADD COLUMN IF NOT EXISTS instagram TEXT;

ALTER TABLE agenda_empresas
  ADD COLUMN IF NOT EXISTS facebook TEXT;

ALTER TABLE agenda_empresas
  ADD COLUMN IF NOT EXISTS tiktok TEXT;

ALTER TABLE agenda_empresas
  ADD COLUMN IF NOT EXISTS site TEXT;

--  Outros campos usados pelo cadastro/painel

ALTER TABLE agenda_empresas
  ADD COLUMN IF NOT EXISTS area_atuacao TEXT;

ALTER TABLE agenda_empresas
  ADD COLUMN IF NOT EXISTS whatsapp TEXT;

ALTER TABLE agenda_empresas
  ADD COLUMN IF NOT EXISTS plano TEXT DEFAULT 'Grátis';

ALTER TABLE agenda_empresas
  ADD COLUMN IF NOT EXISTS onboarding_finalizado BOOLEAN DEFAULT false;


-- ------------------------------------------------------------
--  PARTE 3 — Preenche os horários nas empresas que já existem
-- ------------------------------------------------------------
--  Se você já tinha empresa cadastrada antes desta atualização,
--  a coluna nova fica "vazia" (NULL) nelas. Esta linha preenche
--  com o padrão (seg-sáb aberto, dom fechado) só onde estiver
--  vazio, pra tudo funcionar de primeira.

UPDATE agenda_empresas
  SET horarios_funcionamento = '{"seg":true,"ter":true,"qua":true,"qui":true,"sex":true,"sab":true,"dom":false}'::jsonb
  WHERE horarios_funcionamento IS NULL;


-- ============================================================
--  Pronto! Pode clicar em Run.
--  Depois disso, troque o app.js e o index.html e teste:
--  desmarcar um dia → Salvar horários → atualizar a página →
--  o dia continua desmarcado → no link público ele fica
--  bloqueado no calendário.
-- ============================================================
