# Sistema de Histórico para Visitantes

## Visão Geral

O sistema de histórico para visitantes foi implementado para permitir que usuários não cadastrados mantenham suas redações e atividades entre sessões, mesmo acessando de dispositivos diferentes.

## Problema Anterior

- Visitantes só tinham dados no `localStorage` (perdidos ao limpar cache/mudar dispositivo)
- Visitantes viam **todas** as redações de outros visitantes
- Não havia rastreabilidade ou persistência de dados
- Impossível reconectar visitante com suas redações em sessões futuras

## Solução Implementada

### 1. Nova Tabela: `visitante_sessoes`

```sql
CREATE TABLE public.visitante_sessoes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email_visitante TEXT NOT NULL UNIQUE,
    nome_visitante TEXT NOT NULL,
    session_id UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
    primeiro_acesso TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ultimo_acesso TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 2. Funcionalidades Principais

#### A. Gestão Automática de Sessões
- **Função RPC**: `gerenciar_sessao_visitante(email, nome)`
- **Comportamento**:
  - Se visitante já existe: atualiza `ultimo_acesso` e `nome_visitante`
  - Se visitante é novo: cria novo registro com `session_id` único
- **Trigger**: Atualiza `ultimo_acesso` automaticamente em updates

#### B. Histórico Pessoal
- Cada visitante vê apenas suas próprias redações
- Filtro por email do visitante em `MinhasRedacoesList.tsx`
- Mantém histórico entre sessões e dispositivos

#### C. Migração Visitante → Aluno
- **Função RPC**: `migrar_visitante_para_aluno(email, nova_turma)`
- **Comportamento**:
  - Move redações do visitante para turma específica
  - Inativa sessão de visitante
  - Mantém todo histórico de redações

### 3. Fluxo de Login Atualizado

```typescript
// useStudentAuth.tsx - loginAsVisitante()
1. Usuário insere nome + email
2. Sistema chama gerenciar_sessao_visitante()
3. Recebe session_id único do banco
4. Salva dados no localStorage + session_id
5. Usuário logado com histórico persistente
```

### 4. Visualização de Redações Atualizada

```typescript
// MinhasRedacoesList.tsx
if (userType === 'visitante') {
  // ANTES: Buscava TODAS redações de visitantes
  // AGORA: Busca apenas redações do próprio email
  const { data } = await supabase
    .from('redacoes_enviadas')
    .select('*')
    .eq('turma', 'visitante')
    .ilike('email_aluno', emailVisitante)  // ← FILTRO PESSOAL
}
```

## Benefícios

### ✅ Para Visitantes
- Mantém histórico entre sessões
- Acesso de qualquer dispositivo com mesmo email
- Privacidade: vê apenas suas redações
- Possibilidade de migração futura para aluno

### ✅ Para Administradores
- Rastreabilidade de visitantes
- Estatísticas de uso
- Função `get_estatisticas_visitantes()` para analytics
- Histórico completo de acessos

### ✅ Para o Sistema
- Escalabilidade: suporta milhares de visitantes
- Performance: índices otimizados
- Segurança: RLS habilitado
- Flexibilidade: migração visitante → aluno

## Uso das Funções RPC

### 1. Criar/Atualizar Sessão
```sql
SELECT gerenciar_sessao_visitante(
  'visitante@exemplo.com',
  'João Silva'
);
```

### 2. Migrar Visitante para Aluno
```sql
SELECT migrar_visitante_para_aluno(
  'visitante@exemplo.com',
  'Turma A'
);
```

### 3. Ver Estatísticas
```sql
SELECT get_estatisticas_visitantes();
```

## Arquivos Modificados

### Frontend
- `src/hooks/useStudentAuth.tsx`: Login com persistência
- `src/pages/MinhasRedacoesList.tsx`: Filtro pessoal para visitantes

### Backend
- `supabase/migrations/20250901000000-create_visitante_sessoes_table.sql`
- `supabase/migrations/20250901000001-create_migrar_visitante_para_aluno.sql`

## Compatibilidade

- ✅ Totalmente compatível com sistema anterior
- ✅ Visitantes existentes continuam funcionando
- ✅ Migração transparente (sem quebrar funcionalidades)
- ✅ Rollback possível se necessário

## Próximos Passos (Opcionais)

1. **Analytics Dashboard**: Painel para administradores
2. **Email de Boas-vindas**: Notificar visitantes sobre histórico
3. **Convite para Cadastro**: Promover migração visitante → aluno
4. **Limpeza Automática**: Remover visitantes inativos após X meses

---

**Implementado em**: 2025-09-01  
**Status**: ✅ Completo e testado  
**Impacto**: Melhoria significativa na experiência do visitante