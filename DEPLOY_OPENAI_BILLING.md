# Deploy da Edge Function OpenAI Billing

## Esta função permite visualizar o saldo da OpenAI no card do Jarvis

### Passo 1: Fazer o deploy da edge function

```bash
npx supabase functions deploy openai-billing
```

### Passo 2: Configurar a OPENAI_API_KEY no Supabase

1. Acesse https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em **Settings** → **Edge Functions**
4. Clique em **Manage secrets**
5. Adicione um novo secret:
   - **Name**: `OPENAI_API_KEY`
   - **Value**: Sua chave da OpenAI (sk-...)
6. Clique em **Save**

### Resultado:

Após fazer o deploy, acesse:

**Admin → Card Jarvis → Aba "Configurações"**

Você verá um card mostrando:

- 💵 **Uso do Mês**: Quanto já gastou este mês
- 💰 **Limite da Conta**: Limite máximo configurado na OpenAI
- 🟢 **Disponível**: Quanto ainda tem disponível
- 📊 **Barra de Progresso**: Porcentagem de uso do limite
  - Verde: < 60%
  - Amarelo: 60-80%
  - Vermelho: > 80%

**Botão "Atualizar"**: Clique para buscar dados atualizados da OpenAI

---

## Troubleshooting:

### Se aparecer erro "Erro ao buscar billing"

Isso pode ser porque:
1. A chave da OpenAI não está configurada corretamente
2. A chave não tem permissão para acessar billing
3. Você está usando uma conta da OpenAI sem limite configurado

### Solução:

1. Verifique se a `OPENAI_API_KEY` está correta no Supabase
2. Acesse https://platform.openai.com/account/billing/limits
3. Configure um limite na sua conta OpenAI
