-- Atualizar mensagem de inbox sobre foto de perfil
-- Altera o texto e define a ação como "preencher_perfil"

UPDATE inbox_messages
SET
  message = 'Oi! Por favor, preencha seu perfil e adicione sua foto. Obrigado.',
  acao = 'preencher_perfil'
WHERE message ILIKE '%adicione a foto de seu perfil%'
   OR message ILIKE '%Por favor, adicione a foto%';

-- Verificar resultado
SELECT id, message, acao, type, created_at
FROM inbox_messages
WHERE acao = 'preencher_perfil'
ORDER BY created_at DESC;
