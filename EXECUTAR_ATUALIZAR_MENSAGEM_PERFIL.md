# Atualizar Mensagem de Perfil - Instruções

## Como executar

1. Acesse o [Dashboard do Supabase](https://supabase.com/dashboard/project/kgmxntpmvlnbftjqtyxx/sql/new)
2. Abra o **SQL Editor**
3. Cole o SQL abaixo e execute:

```sql
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
```

## O que foi alterado

- **Texto da mensagem**: Agora diz "preencha seu perfil e adicione sua foto"
- **Campo acao**: Definido como `preencher_perfil`
- **Comportamento**: Ao clicar na mensagem, o aluno será redirecionado direto para `/editar-perfil` em vez de precisar escrever uma resposta

## Código modificado

O componente `BlockingMessageModal.tsx` foi atualizado para:
- Detectar quando a ação é `preencher_perfil`
- Mostrar um botão "Ir para Editar Perfil" em vez do campo de texto
- Redirecionar automaticamente para a página de edição de perfil
