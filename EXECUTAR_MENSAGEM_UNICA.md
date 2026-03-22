# Execute este SQL no Supabase

## Importante!

Este SQL vai **deletar as 2 mensagens antigas** e criar **1 mensagem única**.

Sua mensagem atual **"Assistente de escrita em fase de teste."** será preservada!

## Passos:

1. Abra o **Supabase SQL Editor**
2. Cole e execute o código abaixo:

```sql
-- Migrar para mensagem única no sistema Jarvis
-- Deletar mensagens antigas (se existirem)
DELETE FROM jarvis_system_config
WHERE chave IN ('mensagem_sem_config', 'mensagem_erro_verificacao');

-- Inserir nova mensagem única
INSERT INTO jarvis_system_config (chave, valor, descricao) VALUES
  ('mensagem_sistema', 'Assistente de escrita em fase de teste.', 'Mensagem exibida aos alunos quando o Jarvis está indisponível')
ON CONFLICT (chave)
DO UPDATE SET
  valor = EXCLUDED.valor,
  descricao = EXCLUDED.descricao,
  atualizado_em = NOW();
```

3. Clique em **Run** (F5)

## Resultado:

Agora no admin você terá apenas **1 campo de mensagem** ao invés de 2!

- ✅ Mais simples de gerenciar
- ✅ Uma única mensagem para todas as situações
- ✅ Interface mais limpa

A página do aluno mostrará apenas: 🔒 + Sua mensagem (sem título "Funcionalidade em Desenvolvimento")
