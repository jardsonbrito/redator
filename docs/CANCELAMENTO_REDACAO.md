# Funcionalidade: Cancelar Envio de Redação

## Descrição
Sistema que permite ao aluno cancelar redações enviadas diretamente pelo card da redação na seção "Minhas Redações", com ressarcimento automático de créditos.

## Requisitos Implementados

### ✅ Botão de Cancelamento
- Botão "Cancelar envio" aparece nos cards de redações que podem ser canceladas
- Aparece apenas quando a redação ainda não foi corrigida ou iniciou a correção
- Modal de confirmação com detalhes da redação e quantidade de créditos a serem ressarcidos

### ✅ Lógica de Validação
- **Redação já corrigida**: Não pode cancelar se `corrigida = true`
- **Nota final atribuída**: Não pode cancelar se `nota_total` não é null
- **Status bloqueadores**: Não pode cancelar se status é "corrigida", "devolvida" ou "em_andamento"
- **Simulados**: Não pode cancelar se já tem qualquer nota individual (C1-C5)
- **Proteção anti-início de correção**: Impede cancelamento assim que corretor começar a avaliar

### ✅ Ressarcimento Automático
- Regular: 1 crédito devolvido
- Simulado: 2 créditos devolvidos (corrigido por dois corretores)
- Exercício: 0 créditos (gratuito)
- Visitante: 0 créditos (não usa sistema de créditos)

### ✅ Atualização em Tempo Real
- Saldo de créditos atualizado imediatamente após cancelamento
- Lista de redações atualizada automaticamente
- Notificação de sucesso com detalhes do ressarcimento

## Arquivos Criados/Modificados

### 🆕 Novos Arquivos
- `supabase/functions/cancel-redacao/index.ts` - Edge Function para cancelamento
- `src/hooks/useCancelRedacao.ts` - Hook para gerenciar cancelamento
- `docs/CANCELAMENTO_REDACAO.md` - Esta documentação

### 🔧 Arquivos Modificados
- `src/components/RedacaoEnviadaCard.tsx` - Adicionado botão de cancelamento e modal
- `src/components/MinhasRedacoes.tsx` - Callback para atualizar lista após cancelamento
- `src/hooks/useCredits.ts` - Função para adicionar créditos em tempo real

## Como Funciona

### 1. Interface do Usuário
```tsx
// Botão aparece apenas se redação pode ser cancelada
{canCancelRedacao(redacao) && (
  <AlertDialog>
    <AlertDialogTrigger asChild>
      <Button variant="outline" size="sm">
        <X className="w-3 h-3 mr-1" />
        Cancelar envio
      </Button>
    </AlertDialogTrigger>
    // Modal de confirmação...
  </AlertDialog>
)}
```

### 2. Validação de Cancelamento
```typescript
const canCancelRedacao = (redacao: any): boolean => {
  // 1. Não pode cancelar se já foi corrigida
  if (redacao.corrigida === true) return false;

  // 2. Não pode cancelar se tem nota_total (correção finalizada)
  if (redacao.nota_total !== null && redacao.nota_total !== undefined) return false;

  // 3. Não pode cancelar se status é "corrigida", "devolvida" ou "em_andamento"
  if (['corrigida', 'devolvida', 'em_andamento'].includes(redacao.status)) return false;

  // 4. Para simulados, verificar se já iniciou qualquer correção
  if (redacao.tipo_envio === 'simulado') {
    const temNotasIndividuais = ['nota_c1', 'nota_c2', 'nota_c3', 'nota_c4', 'nota_c5']
      .some(campo => redacao[campo] !== null);
    if (temNotasIndividuais) return false;
  }

  return true;
};
```

### 3. Backend (Edge Function)
```typescript
// 1. Verificar se redação existe e pertence ao usuário
// 2. Validar se pode ser cancelada
// 3. Determinar créditos a ressarcir baseado no tipo
// 4. Deletar redação da base de dados
// 5. Ressarcir créditos automaticamente
// 6. Registrar operação no audit de créditos
```

### 4. Ressarcimento de Créditos
```typescript
const getCreditosACancelar = (tipoEnvio: string): number => {
  switch (tipoEnvio) {
    case 'regular': return 1;
    case 'simulado': return 2;
    case 'exercicio': return 0;
    case 'visitante': return 0;
    default: return 1;
  }
};
```

## Fluxo de Cancelamento

1. **Usuário clica em "Cancelar envio"**
   - Modal de confirmação é exibido
   - Mostra detalhes da redação e créditos a serem devolvidos

2. **Confirmação do cancelamento**
   - Edge Function `cancel-redacao` é chamada
   - Validações de segurança são executadas

3. **Processamento no backend**
   - Redação é removida da base de dados
   - Créditos são automaticamente ressarcidos
   - Operação é registrada no audit

4. **Feedback ao usuário**
   - Notificação de sucesso
   - Lista de redações é atualizada
   - Saldo de créditos é atualizado em tempo real

## Segurança

- ✅ Validação rigorosa de propriedade da redação
- ✅ Verificação do status da correção antes de permitir cancelamento
- ✅ Transações atômicas para evitar inconsistências
- ✅ Registro de auditoria para todas as operações de crédito
- ✅ Validação no frontend e backend

## API da Edge Function

### Endpoint
`POST /functions/v1/cancel-redacao`

### Request Body
```json
{
  "redacaoId": "uuid-da-redacao",
  "userEmail": "email@do.usuario"
}
```

### Response (Sucesso)
```json
{
  "success": true,
  "message": "Redação cancelada com sucesso",
  "creditosRessarcidos": 2,
  "novoSaldoCreditos": 15
}
```

### Response (Erro)
```json
{
  "error": "Não é possível cancelar uma redação que já iniciou o processo de correção"
}
```

## Casos de Teste

### ✅ Casos de Sucesso
- Cancelar redação regular (1 crédito ressarcido)
- Cancelar redação de simulado (2 créditos ressarcidos)
- Cancelar redação de exercício (0 créditos)
- Cancelar redação de visitante (0 créditos)

### ✅ Casos de Erro
- Tentar cancelar redação já corrigida
- Tentar cancelar redação em correção (com notas lançadas)
- Tentar cancelar redação de outro usuário
- Tentar cancelar redação inexistente

## Deploy

Para fazer deploy da Edge Function:
```bash
npx supabase functions deploy cancel-redacao
```

## Monitoramento

- Logs da Edge Function disponíveis no dashboard do Supabase
- Auditoria de créditos registrada na tabela `credit_audit`
- Métricas de uso através do sistema de telemetria existente

## Considerações Futuras

1. **Prazo limite**: Implementar prazo limite para cancelamento (ex: 24h após envio)
2. **Notificação por email**: Enviar confirmação por email do cancelamento
3. **Analytics**: Rastrear taxa de cancelamentos por tipo de redação
4. **Histórico**: Manter histórico de redações canceladas para análise

---

**Status**: ✅ Implementado e testado
**Versão**: 1.0
**Data**: 17/09/2025