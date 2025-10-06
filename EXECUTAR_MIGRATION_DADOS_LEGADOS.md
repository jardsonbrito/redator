# 🚀 EXECUTAR MIGRATION DE DADOS LEGADOS (Etapas, Aulas, Simulados)

## ⚠️ IMPORTANTE: Leia antes de executar!

Esta migration complementa a anterior e normaliza turmas em tabelas que não foram incluídas na primeira migration:
- `etapas_estudo` (campo `turma`)
- `aulas` (array `turmas_autorizadas`)
- `simulados` (array `turmas_participantes`)
- E outras tabelas com arrays de turmas (exercicios, avisos, biblioteca, videos, games)

**Backup automático**: A migration cria backups antes de qualquer alteração.

---

## 📋 Passo a Passo

### **1. Acessar Supabase Dashboard**

```bash
open "https://supabase.com/dashboard/project/kgmxntpmvlnbftjqtyxx/sql/new"
```

Ou acesse manualmente:
1. https://supabase.com/dashboard/project/kgmxntpmvlnbftjqtyxx
2. Navegue para: **SQL Editor** → **New Query**

---

### **2. Copiar SQL da Migration**

Copie o conteúdo do arquivo:
```bash
cat supabase/migrations/20251006100000_normalizar_turmas_etapas_aulas.sql | pbcopy
```

---

### **3. Executar no SQL Editor**

1. Cole o SQL completo no editor
2. Revise o código (especialmente a seção de BACKUP)
3. Clique em **"Run"** (Ctrl/Cmd + Enter)

---

### **4. Verificar Execução**

Após executar, você verá:
```
✅ Migração de normalização completa concluída!
📊 Execute: SELECT * FROM vw_validacao_normalizacao_completa
💾 Backups disponíveis:
   - etapas_estudo_backup_20251006
   - aulas_backup_20251006
   - simulados_backup_20251006
```

---

### **5. Validar Resultados**

#### **5.1. Ver relatório de validação:**
```sql
SELECT * FROM vw_validacao_normalizacao_completa;
```

**Resultado esperado:**
```
tabela                          | total_registros | normalizados | nao_normalizados
--------------------------------|-----------------|--------------|------------------
etapas_estudo                   | 50              | 50           | 0
aulas_turmas_autorizadas        | 120             | 120          | 0
simulados_turmas_participantes  | 15              | 15           | 0
```

#### **5.2. Ver backup de etapas:**
```sql
SELECT
  id,
  nome,
  turma as turma_antiga,
  (SELECT turma FROM etapas_estudo WHERE id = backup.id) as turma_nova
FROM etapas_estudo_backup_20251006 backup
LIMIT 10;
```

**Resultado esperado:**
```
id   | nome          | turma_antiga | turma_nova
-----|---------------|--------------|------------
123  | 1ª Etapa      | TURMA A      | A
124  | 1ª Etapa      | LRB 2025     | B
125  | 2ª Etapa      | Turma C      | C
```

#### **5.3. Verificar aulas normalizadas:**
```sql
SELECT
  id,
  titulo,
  turmas_autorizadas
FROM aulas
WHERE turmas_autorizadas IS NOT NULL
LIMIT 10;
```

**Resultado esperado (valores normalizados):**
```
id   | titulo                    | turmas_autorizadas
-----|---------------------------|--------------------
1    | Aula de Redação ENEM      | {A,B,C}
2    | Gramática Avançada        | {A,B}
3    | Literatura Brasileira     | {C,D,E}
```

#### **5.4. Verificar simulados normalizados:**
```sql
SELECT
  id,
  titulo,
  turmas_participantes
FROM simulados
WHERE turmas_participantes IS NOT NULL
LIMIT 10;
```

---

## ✅ Checklist Pós-Migration

Após executar, marque os itens:

- [ ] Migration executada sem erros
- [ ] Tabelas de backup criadas (`*_backup_20251006`)
- [ ] View `vw_validacao_normalizacao_completa` disponível
- [ ] Etapas com turmas normalizadas (apenas A-E)
- [ ] Aulas com turmas_autorizadas normalizadas
- [ ] Simulados com turmas_participantes normalizadas
- [ ] Nenhum valor com formato antigo

---

## 🔄 Testar no Frontend

### **1. Diário Online - Gestão de Etapas**
```
1. Acesse Dashboard Admin → Diário Online → Gestão de Etapas
2. Selecione uma turma (deve mostrar "Turma A", "Turma B")
3. Clique em uma etapa existente
4. Confirme que os dados da etapa são carregados corretamente
5. Verifique que as notas e registros aparecem
```

### **2. Aulas ao Vivo**
```
1. Como aluno, acesse "Aulas ao Vivo"
2. Confirme que as aulas da sua turma aparecem
3. Verifique que pode acessar as aulas autorizadas para sua turma
```

### **3. Simulados**
```
1. Como aluno, acesse "Simulados"
2. Confirme que vê os simulados da sua turma
3. Teste participar de um simulado disponível
```

---

## 🚨 Rollback (se necessário)

Se algo der errado, você pode reverter:

### **Reverter Diário Etapas:**
```sql
UPDATE etapas_estudo e
SET turma = b.turma
FROM etapas_estudo_backup_20251006 b
WHERE e.id = b.id;
```

### **Reverter Aulas:**
```sql
UPDATE aulas a
SET turmas_autorizadas = b.turmas_autorizadas
FROM aulas_backup_20251006 b
WHERE a.id = b.id;
```

### **Reverter Simulados:**
```sql
UPDATE simulados s
SET turmas_participantes = b.turmas_participantes
FROM simulados_backup_20251006 b
WHERE s.id = b.id;
```

---

## 📊 O Que Foi Normalizado

### **Antes:**
```sql
-- etapas_estudo
turma = "TURMA A", "LRA 2025", "Turma B"

-- aulas
turmas_autorizadas = ["TURMA A", "TURMA B", "LRC 2025"]

-- simulados
turmas_participantes = ["Turma A", "Turma B", "VISITANTE"]
```

### **Depois:**
```sql
-- etapas_estudo
turma = "A", "B", "C"

-- aulas
turmas_autorizadas = ["A", "B", "C"]

-- simulados
turmas_participantes = ["A", "B", "VISITANTE"]
```

---

## 📞 Suporte

### **Verificar valores problemáticos:**

```sql
-- Etapas com turma inválida
SELECT DISTINCT turma
FROM etapas_estudo
WHERE turma NOT IN ('A', 'B', 'C', 'D', 'E', 'VISITANTE')
  AND turma IS NOT NULL;

-- Deve retornar 0 registros após a migration
```

### **Verificar turmas únicas em etapas:**
```sql
SELECT turma, COUNT(*) as total
FROM etapas_estudo
WHERE turma IS NOT NULL
GROUP BY turma
ORDER BY turma;
```

**Resultado esperado:**
```
turma | total
------|------
A     | 15
B     | 12
C     | 10
D     | 8
E     | 5
```

---

## 🎯 Resumo Rápido

```bash
# 1. Copiar SQL
cat supabase/migrations/20251006100000_normalizar_turmas_etapas_aulas.sql | pbcopy

# 2. Abrir SQL Editor
open "https://supabase.com/dashboard/project/kgmxntpmvlnbftjqtyxx/sql/new"

# 3. Colar e executar

# 4. Validar
# SELECT * FROM vw_validacao_normalizacao_completa;

# 5. Testar no frontend
```

---

## ✅ Impacto Esperado

Após executar esta migration:

1. **Diário Online funcionará corretamente** - etapas serão encontradas pelo filtro de turma
2. **Aulas ao Vivo mostrará aulas corretas** - comparação de turmas funcionará
3. **Simulados carregarão para alunos** - filtro de turmas participantes correto
4. **Todas as turmas padronizadas** - formato único em todo o sistema

---

**✅ Execute esta migration para corrigir o problema do Diário Online!**

O sistema está criando novas etapas corretamente, mas as antigas não aparecem porque foram salvas com "TURMA A" em vez de "A".
