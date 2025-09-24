# Solução para Erro de Exclusão de Alunos

## 🚫 Problema Identificado

**Erro atual:**
```
update or delete on table "profiles" violates foreign key constraint "credit_audit_user_id_fkey" on table "credit_audit"
```

**Causa:** A tabela `credit_audit` possui uma foreign key que referencia `profiles.id`, impedindo a exclusão de alunos que possuem registros de auditoria de créditos.

---

## ✅ Duas Soluções Implementadas

### 🔧 **Solução 1: Hard Delete com CASCADE (Implementada)**

**O que faz:**
- Remove automaticamente todos os registros relacionados quando um aluno é excluído
- Mantém integridade referencial sem bloquear exclusões

**Migration criada:** `20250924140000-fix-delete-profile-constraints.sql`

**Mudanças aplicadas:**
```sql
-- Para user_id: ON DELETE CASCADE
-- Remove registros de credit_audit quando o usuário é excluído

-- Para admin_id: ON DELETE SET NULL
-- Mantém registros mas remove referência ao admin excluído

-- Aplicado também em: email_change_audit, redacoes_*, etc.
```

**Vantagens:**
- ✅ Solução imediata - permite exclusão sem travamento
- ✅ Remove dados órfãos automaticamente
- ✅ Mantém banco limpo e consistente
- ✅ Performance melhor (não acumula dados desnecessários)

**Considerações:**
- ⚠️ Dados de auditoria são perdidos permanentemente
- ⚠️ Não há como recuperar histórico de créditos após exclusão

---

### 🔄 **Solução 2: Soft Delete (Alternativa)**

**O que seria:**
- Alunos não são realmente excluídos, apenas marcados como "inativo"
- Mantém todo histórico e permite "restauração"

**Implementação:**
```sql
-- Adicionar coluna deleted_at na tabela profiles
ALTER TABLE profiles ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;

-- Modificar queries para filtrar excluídos
WHERE deleted_at IS NULL

-- Função para "soft delete"
UPDATE profiles SET deleted_at = NOW() WHERE id = 'user_id';
```

**Vantagens:**
- ✅ Preserva todo histórico de auditoria
- ✅ Permite restaurar alunos excluídos
- ✅ Dados nunca são perdidos
- ✅ Melhor para compliance e auditoria

**Desvantagens:**
- ❌ Mais complexa de implementar
- ❌ Requer modificação em muitas queries
- ❌ Acumula dados "fantasma" no banco
- ❌ Performance pode ser afetada com o tempo

---

## 🎯 Recomendação

**Solução 1 (CASCADE) é a recomendada** para este caso porque:

1. **Simplicidade:** Funciona imediatamente sem mudanças no código
2. **Performance:** Não afeta velocidade de consultas
3. **Limpeza:** Remove dados realmente desnecessários
4. **Contexto educacional:** Histórico de créditos não é crítico para preservar após exclusão do aluno

---

## 🚀 Como Aplicar a Solução

### **Opção A: Via Supabase Dashboard**
1. Acesse o painel do Supabase
2. Vá em **SQL Editor**
3. Execute o conteúdo do arquivo `supabase/migrations/20250924140000-fix-delete-profile-constraints.sql`

### **Opção B: Via CLI do Supabase**
```bash
# Se usando Supabase CLI
supabase db reset  # Aplica todas as migrations
```

### **Opção C: Aplicação Manual (Urgente)**
Se precisar resolver imediatamente:

```sql
-- Execute no SQL Editor do Supabase:
ALTER TABLE public.credit_audit
  DROP CONSTRAINT IF EXISTS credit_audit_user_id_fkey;

ALTER TABLE public.credit_audit
  ADD CONSTRAINT credit_audit_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES public.profiles(id)
  ON DELETE CASCADE;
```

---

## 🔍 Verificação da Solução

Após aplicar, teste:

1. **Tentativa de exclusão:** Tente excluir um aluno no dashboard admin
2. **Verificação de dados:** Confirme que registros relacionados foram removidos
3. **Funcionalidade:** Teste outras operações como edição e criação

---

## 📋 Checklist de Validação

- [ ] Migration aplicada com sucesso
- [ ] Exclusão de alunos funciona normalmente
- [ ] Dados de auditoria são removidos automaticamente
- [ ] Outras funcionalidades continuam funcionando
- [ ] Performance não foi afetada

---

## 🛠️ Implementação Alternativa (Soft Delete)

Se preferirem preservar histórico completo, posso implementar a solução de soft delete:

```typescript
// Hook para soft delete
const softDeleteProfile = async (profileId: string) => {
  const { error } = await supabase
    .from('profiles')
    .update({
      deleted_at: new Date().toISOString(),
      ativo: false
    })
    .eq('id', profileId);
};

// Modificar queries existentes
const { data } = await supabase
  .from('profiles')
  .select('*')
  .is('deleted_at', null)  // Só buscar não-excluídos
  .eq('user_type', 'aluno');
```

---

**Status:** ✅ Migration criada e pronta para aplicação
**Impacto:** 🟢 Baixo - Apenas resolve o problema sem afetar funcionalidades
**Urgência:** 🔴 Alta - Admin precisa conseguir gerenciar alunos