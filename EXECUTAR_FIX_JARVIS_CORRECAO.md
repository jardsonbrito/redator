# 🔧 Fix: Adicionar suporte ao Jarvis Correção

## ⚠️ Erro Atual

Erro 406 ao acessar `/professor/jarvis-correcao`:
```
Failed to load resource: the server responded with a status of 406
professores?select=jarvis_correcao_creditos&email=eq.levy%40gmail.com
```

## ✅ Solução

A coluna `jarvis_correcao_creditos` não existe na tabela `professores`.

### Passo a Passo

1. **Acesse o Supabase Dashboard**
   - URL: https://supabase.com/dashboard/project/kgmxntpmvlnbftjqtyxx

2. **Abra o SQL Editor**
   - Menu lateral: **SQL Editor**
   - Clique em **New Query**

3. **Execute o SQL abaixo**

```sql
-- Adicionar coluna jarvis_correcao_creditos na tabela professores
ALTER TABLE professores
ADD COLUMN IF NOT EXISTS jarvis_correcao_creditos INTEGER NOT NULL DEFAULT 0;

-- Adicionar constraint de valor positivo
ALTER TABLE professores
DROP CONSTRAINT IF EXISTS professores_jarvis_correcao_creditos_check;

ALTER TABLE professores
ADD CONSTRAINT professores_jarvis_correcao_creditos_check
CHECK (jarvis_correcao_creditos >= 0);

-- Criar índice para performance
DROP INDEX IF EXISTS idx_professores_jarvis_correcao_creditos;

CREATE INDEX idx_professores_jarvis_correcao_creditos
ON professores(jarvis_correcao_creditos);

-- Adicionar comentário
COMMENT ON COLUMN professores.jarvis_correcao_creditos IS
'Créditos disponíveis para correção de redações com IA (sistema Jarvis Correção)';

-- Adicionar 100 créditos iniciais para professores ativos
UPDATE professores
SET jarvis_correcao_creditos = 100
WHERE ativo = true
  AND jarvis_correcao_creditos = 0;

-- Verificar resultado
SELECT
  email,
  nome_completo,
  jarvis_correcao_creditos,
  ativo
FROM professores
ORDER BY email;
```

4. **Clique em "Run" ou pressione Ctrl/Cmd + Enter**

5. **Verifique o resultado**
   - Você deve ver a lista de professores com os créditos atualizados
   - levy@gmail.com deve ter 100 créditos

6. **Recarregue a página do professor**
   - Acesse: http://localhost:8080/professor/jarvis-correcao
   - Deve funcionar agora! ✅

---

## 🎉 Resultado Esperado

Após executar o SQL:
- ✅ Coluna `jarvis_correcao_creditos` criada
- ✅ Professores ativos ganham 100 créditos iniciais
- ✅ levy@gmail.com pode usar o Jarvis Correção
- ✅ Interface carrega sem erro 406
