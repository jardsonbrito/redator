# Instruções para Aplicar Migration - Nome do Aluno

## Problema
O corretor está vendo "aluno" como nome genérico ao invés do nome real dos estudantes.

## Solução
A migration `supabase/migrations/20251004000000_fix_nome_aluno_corretor.sql` corrige isso fazendo JOIN com a tabela `profiles` para buscar o nome real.

## Como Aplicar (Supabase Dashboard)

1. Acesse: https://supabase.com/dashboard/project/SEU_PROJECT_ID/sql
2. Cole o conteúdo do arquivo `supabase/migrations/20251004000000_fix_nome_aluno_corretor.sql`
3. Clique em "Run"
4. Aguarde a confirmação de sucesso

## Como Aplicar (CLI)

Se tiver o Supabase CLI configurado com o projeto remoto:

```bash
supabase db push
```

## Verificar se Funcionou

Após aplicar:
1. Faça logout e login como corretor
2. Acesse Dashboard → Redações
3. Verifique se os nomes reais dos alunos aparecem ao invés de "aluno"
