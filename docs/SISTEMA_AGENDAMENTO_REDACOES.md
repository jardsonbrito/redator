# Sistema de Agendamento de Redações Exemplares

## Visão Geral

O sistema de agendamento permite que administradores programem a publicação de redações exemplares para datas e horários específicos. As redações agendadas ficam ocultas para os alunos até chegarem na data programada, quando são publicadas automaticamente.

## Funcionalidades Implementadas

### 1. Interface de Agendamento no Formulário de Criação

- **Localização**: `src/components/admin/RedacaoForm.tsx`
- **Funcionalidades**:
  - Checkbox para ativar/desativar agendamento
  - Campo de data e hora (`datetime-local`)
  - Validação de data mínima (não permite agendamento no passado)
  - Indicadores visuais do status de publicação
  - Botão dinâmico que muda texto baseado no agendamento

### 2. Banco de Dados

- **Migration**: `supabase/migrations/20250923120000_add_agendamento_to_redacoes.sql`
- **Campo adicionado**: `data_agendamento TIMESTAMP WITH TIME ZONE`
- **Índice**: Criado para otimizar consultas por data de agendamento
- **Comportamento**:
  - `NULL`: Publicação imediata
  - Data futura: Agendamento ativo (oculta para alunos)
  - Data passada: Publicação automática

### 3. Filtros de Visualização

#### Para Alunos (`useRedacoesExemplarFilters.ts`)
```sql
.or('data_agendamento.is.null,data_agendamento.lte.' + new Date().toISOString())
```
- Só mostra redações sem agendamento OU com data já vencida

#### Para Administradores (`RedacaoList.tsx`)
```sql
.select('...*, data_agendamento')
```
- Mostra TODAS as redações (incluindo agendadas)

### 4. Interface Visual de Status

#### Para Administradores (`RedacaoExemplarCardPadrao.tsx`)

**Redação Agendada:**
- Badge amber com animação
- Data e hora de publicação formatada
- Texto explicativo sobre publicação automática

**Redação Publicada:**
- Badge verde com status confirmado
- Aparece apenas quando não há agendamento

### 5. Lógica de Exibição

```typescript
// Verificar se redação deve aparecer para alunos
const shouldShowRedacao = () => {
  if (perfil === 'admin') return true; // Admin sempre vê tudo

  if (redacao.data_agendamento) {
    const now = new Date();
    const scheduledDate = new Date(redacao.data_agendamento);
    return now >= scheduledDate;
  }

  return true; // Sem agendamento, sempre visível
};

// Verificar se está agendada (para status visual)
const isScheduled = () => {
  if (!redacao.data_agendamento) return false;
  const now = new Date();
  const scheduledDate = new Date(redacao.data_agendamento);
  return now < scheduledDate;
};
```

## Fluxo de Uso

### 1. Criação de Redação Agendada

1. Admin acessa formulário de criação de redação exemplar
2. Preenche todos os campos obrigatórios
3. Marca checkbox "Agendar publicação"
4. Seleciona data e horário futuro
5. Salva a redação

**Resultado**: Redação criada mas oculta para alunos

### 2. Visualização na Lista Administrativa

1. Admin vê todas as redações na lista
2. Redações agendadas mostram badge amber com animação
3. Data de publicação é exibida formatada
4. Status é claro: "Agendada para: DD/MM/AAAA às HH:MM"

### 3. Publicação Automática

- **Mecânica**: Baseada na consulta SQL com filtro de data
- **Timing**: Quando `now() >= data_agendamento`
- **Automaticidade**: Sem necessidade de cron jobs ou processos externos

## Arquivos Modificados

```
├── src/components/admin/RedacaoForm.tsx           # Interface de agendamento
├── src/components/admin/RedacaoList.tsx           # Lista admin com status
├── src/components/shared/RedacaoExemplarCardPadrao.tsx # Cards com status visual
├── src/hooks/useRedacoesExemplarFilters.ts        # Filtro para alunos
├── supabase/migrations/20250923120000_add_agendamento_to_redacoes.sql # DB
└── docs/SISTEMA_AGENDAMENTO_REDACOES.md          # Esta documentação
```

## Vantagens da Implementação

### 1. **Simplicidade**
- Não requer cron jobs ou workers externos
- Filtros SQL nativos do Supabase
- Lógica baseada em comparação de timestamps

### 2. **Performance**
- Índice otimizado para consultas por data
- Filtros aplicados no banco de dados
- Cache do React Query mantém performance

### 3. **Experiência do Usuário**
- Interface intuitiva com feedback visual claro
- Validações em tempo real
- Status transparente para administradores

### 4. **Robustez**
- Validação de data mínima
- Tratamento de erro em formatação de datas
- Compatibilidade com sistema legado

## Limitações e Considerações

### 1. **Precisão de Timing**
- Dependente de quando o usuário acessa a página
- Para timing crítico, considerar implementar webhook/cron

### 2. **Timezone**
- Baseado no timezone do navegador do admin
- Considerar padronização para UTC ou timezone do Brasil

### 3. **Cache**
- React Query cache pode atrasar visualização
- Cache configurado para 5 minutos de `staleTime`

## Melhorias Futuras Possíveis

1. **Webhook de Publicação**
   - Edge Function executada por cron
   - Notificações automáticas de publicação

2. **Timezone Management**
   - Seletor de timezone na interface
   - Padronização para fuso horário específico

3. **Preview de Agendamento**
   - Visualização de como ficará quando publicada
   - Lista separada de redações agendadas

4. **Histórico de Publicações**
   - Log de quando redações foram publicadas
   - Auditoria de agendamentos

## Testando o Sistema

### Cenário 1: Agendamento Futuro
1. Criar redação com data futura
2. Verificar que não aparece na biblioteca para alunos
3. Verificar que aparece com status "Agendada" para admin

### Cenário 2: Publicação Automática
1. Agendar redação para 1 minuto no futuro
2. Aguardar passar o horário
3. Atualizar página do aluno
4. Verificar que redação apareceu na biblioteca

### Cenário 3: Publicação Imediata
1. Criar redação sem agendamento
2. Verificar aparição imediata na biblioteca
3. Verificar status "Publicada" para admin

---

*Sistema implementado em 23/09/2025 - Documentação atualizada automaticamente*