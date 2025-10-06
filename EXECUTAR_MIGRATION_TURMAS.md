# 🚀 EXECUTAR MIGRATION DE NORMALIZAÇÃO DE TURMAS

## ⚠️ IMPORTANTE: Leia antes de executar!

Esta migration vai normalizar TODOS os valores de turma no banco de dados.

**Backup automático**: A migration cria backup em `turmas_backup_20251006` antes de qualquer alteração.

---

## 📋 Passo a Passo

### **1. Acessar Supabase Dashboard**

1. Acesse: https://supabase.com/dashboard/project/kgmxntpmvlnbftjqtyxx
2. Faça login se necessário
3. Navegue para: **SQL Editor** (menu lateral esquerdo)

---

### **2. Copiar SQL da Migration**

Abra o arquivo e copie TODO o conteúdo:
```
/Users/jardsonbrito/Documents/Redator/redator/supabase/migrations/20251006000000_normalizar_turmas.sql
```

**OU** copie diretamente daqui (comando abaixo):

```bash
cat supabase/migrations/20251006000000_normalizar_turmas.sql | pbcopy
```

---

### **3. Executar no SQL Editor**

1. No SQL Editor do Supabase, clique em **"New Query"**
2. Cole o SQL completo da migration
3. Revise o código (especialmente a seção de BACKUP)
4. Clique em **"Run"** (Ctrl/Cmd + Enter)

---

### **4. Verificar Execução**

Após executar, você verá mensagens de sucesso:

```
✅ Migração de normalização de turmas concluída com sucesso!
📊 Consulte vw_relatorio_normalizacao_turmas para ver resultados
💾 Backup disponível em turmas_backup_20251006
```

---

### **5. Validar Resultados**

Execute estas queries para confirmar:

#### **5.1. Ver relatório de normalização:**
```sql
SELECT * FROM vw_relatorio_normalizacao_turmas
ORDER BY tabela, turma;
```

**Resultado esperado:**
```
tabela              | turma      | quantidade
--------------------|------------|------------
profiles            | A          | X
profiles            | B          | Y
profiles            | VISITANTE  | Z
redacoes_enviadas   | A          | X
redacoes_enviadas   | B          | Y
```

#### **5.2. Ver backup dos valores antigos:**
```sql
SELECT * FROM turmas_backup_20251006
ORDER BY quantidade_registros DESC;
```

**Resultado esperado:**
```
turma_original | turma_normalizada | quantidade_registros
---------------|-------------------|---------------------
TURMA A        | A                 | 150
Turma B        | B                 | 120
LRA 2025       | A                 | 50
visitante      | VISITANTE         | 30
```

#### **5.3. Verificar valores atuais em profiles:**
```sql
SELECT
  turma,
  COUNT(*) as total_alunos,
  COUNT(CASE WHEN ativo = true THEN 1 END) as ativos
FROM profiles
WHERE turma IS NOT NULL
GROUP BY turma
ORDER BY turma;
```

**Resultado esperado (apenas valores normalizados):**
```
turma      | total_alunos | ativos
-----------|--------------|--------
A          | 50           | 45
B          | 40           | 38
C          | 35           | 32
D          | 30           | 28
E          | 25           | 23
VISITANTE  | 10           | 10
```

---

## ✅ Checklist Pós-Migration

Após executar, marque os itens:

- [ ] Migration executada sem erros
- [ ] Tabela `turmas_backup_20251006` criada
- [ ] View `vw_relatorio_normalizacao_turmas` disponível
- [ ] Valores normalizados (apenas A-E e VISITANTE)
- [ ] Nenhum valor com formato antigo ("TURMA A", "LRA 2025", etc.)
- [ ] Constraint `valid_turma_check` aplicado em profiles

---

## 🔄 Testar no Frontend

Após a migration, teste estes fluxos:

### **1. Login de Aluno**
```
1. Acesse: http://localhost:8080/aluno-login
2. Tente fazer login com alunos de diferentes turmas
3. Confirme que o login funciona normalmente
```

### **2. Cadastro de Novo Aluno**
```
1. Acesse: http://localhost:8080/cadastro-aluno
2. Selecione uma turma no formulário
3. Observe que exibe "Turma A", "Turma B", etc.
4. Complete o cadastro
5. Verifique no banco que salvou apenas a letra (ex: "A")
```

### **3. Dashboard Admin - Lista de Alunos**
```
1. Acesse o admin e vá para lista de alunos
2. Verifique que as abas de filtro mostram "Turma A", "Turma B", etc.
3. Clique em cada aba e confirme que filtra corretamente
4. Edite um aluno e confirme que a turma está correta
```

### **4. Envio de Redação**
```
1. Como aluno, envie uma redação
2. Verifique que a turma do aluno é mantida corretamente
3. No admin, confirme que a redação aparece com turma correta
```

---

## 🚨 Rollback (se necessário)

Se algo der errado, você pode reverter usando o backup:

```sql
-- ATENÇÃO: Isto vai restaurar os valores ANTIGOS!
-- Use apenas se houver problemas graves

-- 1. Restaurar profiles
UPDATE profiles p
SET turma = b.turma_original
FROM turmas_backup_20251006 b
WHERE p.turma = b.turma_normalizada;

-- 2. Remover constraint (se necessário)
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS valid_turma_check;
```

---

## 📊 Estatísticas Esperadas

Após a migration, você deverá ver:

- ✅ **0 registros** com formato "TURMA A", "Turma B", etc.
- ✅ **0 registros** com formato "LRA 2025", "LRB 2025", etc.
- ✅ **100% dos registros** com formato normalizado (A-E ou VISITANTE)
- ✅ **Backup completo** em `turmas_backup_20251006`

---

## 📞 Suporte

Se encontrar problemas:

1. **Erro na execução**: Verifique se há sintaxe SQL incorreta
2. **Valores não normalizados**: Execute novamente a migration
3. **Constraint falhando**: Há valores inválidos no banco (não A-E ou VISITANTE)

Para investigar valores problemáticos:
```sql
-- Ver valores que não são válidos
SELECT DISTINCT turma
FROM profiles
WHERE turma NOT IN ('A', 'B', 'C', 'D', 'E', 'VISITANTE')
  AND turma IS NOT NULL;
```

---

## 🎯 Resumo Rápido

```bash
# 1. Copiar SQL
cat supabase/migrations/20251006000000_normalizar_turmas.sql | pbcopy

# 2. Executar no Supabase Dashboard SQL Editor

# 3. Validar
# - Executar queries de verificação
# - Testar login e cadastro
# - Confirmar filtros funcionando
```

---

**✅ Após executar a migration com sucesso, todo o sistema estará padronizado!**

A exibição continuará mostrando "Turma A", "Turma B", mas o armazenamento será limpo e consistente.
