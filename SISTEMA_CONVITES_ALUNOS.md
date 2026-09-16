# Sistema de Convites para Alunos

## Visão Geral

O sistema de cadastro de alunos funciona **EXCLUSIVAMENTE através de convites**. Não é permitido cadastro manual, importação CSV ou autoatendimento livre.

## Como Funciona

### 1. Criação de Turmas Dinâmicas

O administrador cria turmas no painel **Admin → Dashboard Alunos → Turmas e Alunos**:

- Cada turma tem um nome e código de acesso
- As turmas podem ser ativadas ou desativadas
- Apenas turmas ativas aceitam novos alunos via convite

### 2. Geração de Convites

No painel **Admin → Dashboard Alunos → Convites**:

- O admin seleciona uma turma ativa
- Gera convites individuais (uso único)
- Cada convite pode ser:
  - **Genérico**: Qualquer pessoa com o link pode usar
  - **Específico**: Vinculado a um email específico
  - **Com data de expiração**: Expira automaticamente após data definida

### 3. Processo de Entrada do Aluno

1. Aluno recebe o link do convite: `/aluno/entrar?codigo=XXXX`
2. Acessa o link e informa:
   - Nome completo (se for novo aluno)
   - Email (validado contra o convite, se for específico)
3. Sistema valida:
   - Se o convite é válido e não foi usado
   - Se não expirou
   - Se o email corresponde (caso seja convite específico)
   - Se a turma está ativa
4. Aluno é criado automaticamente com:
   - `is_authenticated_student = true`
   - `ativo = true`
   - Vínculo com a turma (`turma_id`)
   - Tipo de usuário: `aluno`

### 4. Benefícios do Sistema de Convites

- ✅ **Controle total**: Admin decide quem entra
- ✅ **Rastreabilidade**: Cada convite é único e registrado
- ✅ **Segurança**: Convites podem expirar ou ser para emails específicos
- ✅ **Organização**: Alunos já entram na turma correta
- ✅ **Auditoria**: Sistema registra quando e por quem foi usado

## Estrutura do Banco de Dados

### Tabelas Principais

**`turmas_alunos`**
- id (uuid)
- nome (text)
- codigo_acesso (text) - único
- ativo (boolean)
- criado_em (timestamp)

**`convites_alunos`**
- id (uuid)
- codigo (text) - único
- email_destinatario (text, opcional)
- turma_id (uuid) - FK para turmas_alunos
- usado (boolean)
- usado_por_email (text)
- usado_em (timestamp)
- expira_em (timestamp, opcional)
- criado_em (timestamp)

**`profiles`**
- turma_id (uuid, nullable) - FK para turmas_alunos
- turma (text) - nome da turma (compatibilidade)
- is_authenticated_student (boolean)
- user_type (text) - 'aluno'
- ativo (boolean)

### Função SQL Principal

**`aluno_entrar_por_convite(codigo, email, nome)`**

Esta função RPC:
1. Valida o convite
2. Verifica se não expirou
3. Valida o email (se for convite específico)
4. Cria ou atualiza o perfil do aluno
5. Marca o convite como usado (uso único)
6. Retorna sucesso ou erro detalhado

## Interface do Admin

### Painel de Convites

Localização: **Admin → Dashboard Alunos → Convites**

Funcionalidades:
- Listar turmas ativas
- Gerar novos convites para cada turma
- Copiar link do convite
- Abrir link em nova aba (teste)
- Ver estatísticas de convites (total, usados, disponíveis)
- Gerenciar expiração de convites

### Painel de Turmas

Localização: **Admin → Turmas e Alunos**

Funcionalidades:
- Criar novas turmas
- Ativar/desativar turmas
- Gerenciar alunos de cada turma
- Visualizar convites pendentes por turma

## Fluxo Completo

```
Admin cria turma "Turma A"
    ↓
Admin gera 20 convites para "Turma A"
    ↓
Admin envia links dos convites para os alunos
    ↓
Aluno clica no link → Informa nome e email
    ↓
Sistema valida convite → Cria perfil do aluno
    ↓
Convite marcado como usado (não pode ser reutilizado)
    ↓
Aluno automaticamente vinculado à "Turma A"
    ↓
Aluno pode fazer login e acessar o sistema
```

## Configurações Desabilitadas

As seguintes funcionalidades foram **REMOVIDAS** para garantir que apenas convites sejam usados:

- ❌ **Cadastro Manual (CM)**: Removido do Dashboard Alunos
- ❌ **Importação CSV**: Removido do Dashboard Alunos
- ❌ **Autoatendimento Livre** (`/cadastro-aluno`): Rota desabilitada

## Migrações Importantes

**`20260419000000_turmas_alunos_e_convites.sql`**
- Criação das tabelas de turmas e convites
- Função RPC para processar convites

**`20260420000000_fix_aluno_convite_authenticated.sql`**
- Correção para garantir `is_authenticated_student = true`
- Atualização de alunos existentes
- Atualização da função RPC

## Manutenção

### Como adicionar novos alunos?

1. Crie/selecione uma turma ativa
2. Gere convites no painel de Convites
3. Envie os links para os alunos
4. Monitore o uso dos convites

### Como gerenciar turmas cheias?

1. Desative a turma quando atingir capacidade
2. Crie nova turma se necessário
3. Convites de turmas desativadas não funcionam

### Como revogar um convite?

Atualmente, convites não podem ser revogados individualmente. Alternativas:
- Use convites com data de expiração curta
- Use convites específicos por email
- Desative a turma temporariamente

## Próximas Melhorias Possíveis

- [ ] Painel para visualizar todos os convites gerados
- [ ] Opção de revogar convites não usados
- [ ] Limite de convites por turma
- [ ] Notificações quando convite é usado
- [ ] Gerar convites em lote com CSV de emails
- [ ] QR Code para convites
