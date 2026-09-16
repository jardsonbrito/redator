# Corrigir RLS das Tabelas de Professores e Turmas

## Problemas Encontrados

### 1. Erro 406 - Professor não encontrado
A tabela `professores` tem RLS habilitado mas não possui política para permitir leitura.

### 2. Erro 42501 - Violação de RLS ao criar turmas
```
new row violates row-level security policy for table "turmas_professores"
```

As tabelas `turmas_professores` e `professor_turmas` tem RLS habilitado mas não possuem políticas para INSERT.

## Solução

1. Acesse o **SQL Editor** do Supabase
2. Execute o arquivo `fix_rls_professores.sql` ✅ (já executado)
3. Execute o arquivo `fix_rls_turmas_professores.sql` ⬅️ **Execute este agora**
4. Recarregue a página e tente criar a turma novamente

## O que será corrigido

### fix_rls_professores.sql ✅
- Cria política RLS permitindo leitura da tabela `professores`
- Permite queries `.select("id").eq("email", email)`

### fix_rls_turmas_professores.sql ⬅️
- Cria políticas para INSERT, SELECT, UPDATE em `turmas_professores`
- Cria políticas para INSERT, SELECT, DELETE em `professor_turmas`
- Permite criar turmas e associá-las a professores

## Tabelas afetadas

- `professores` - Dados dos professores
- `turmas_professores` - Turmas criadas por professores
- `professor_turmas` - Associação professor ↔ turma (many-to-many)

## Após executar

- Recarregue `http://localhost:8080/professor/jarvis-correcao`
- Tente criar uma turma novamente
- Os erros 406 e 42501 não devem mais aparecer
