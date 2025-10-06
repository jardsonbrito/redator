# Padrão de Nomenclatura de Turmas

**Data de Implementação**: 06/10/2025
**Status**: ✅ Ativo
**Última Atualização**: 06/10/2025

---

## 📋 Visão Geral

Este documento descreve o padrão adotado para armazenamento e exibição de turmas no sistema **Redator**.

### Problema Resolvido

Antes desta padronização, o sistema apresentava inconsistências na nomenclatura de turmas:
- ❌ `"TURMA A"`, `"Turma A"`, `"turma A"`
- ❌ `"LRA 2025"`, `"LRB 2025"` (formatos legados)
- ❌ Variações causando problemas em filtros e comparações

### Solução Implementada

✅ **Armazenamento**: Apenas letras únicas (`A`, `B`, `C`, `D`, `E`) ou `VISITANTE`
✅ **Exibição**: Formatação dinâmica na interface (`Turma A`, `Turma B`, `Visitante`)
✅ **Compatibilidade**: Normalização automática de formatos antigos

---

## 🎯 Padrão Adotado

### Armazenamento no Banco de Dados

**Valores válidos:**
```typescript
type TurmaLetra = 'A' | 'B' | 'C' | 'D' | 'E' | 'VISITANTE'
```

**Exemplos:**
```sql
-- ✅ CORRETO
INSERT INTO profiles (turma) VALUES ('A');
INSERT INTO profiles (turma) VALUES ('VISITANTE');

-- ❌ INCORRETO (formato antigo)
INSERT INTO profiles (turma) VALUES ('Turma A');
INSERT INTO profiles (turma) VALUES ('LRA 2025');
```

### Exibição na Interface

A exibição é feita dinamicamente pela função `formatTurmaDisplay()`:

```typescript
import { formatTurmaDisplay } from '@/utils/turmaUtils';

// Em componentes React:
<span>{formatTurmaDisplay('A')}</span>        // → "Turma A"
<span>{formatTurmaDisplay('VISITANTE')}</span> // → "Visitante"
```

---

## 🛠️ Utilitários Disponíveis

### Arquivo: `src/utils/turmaUtils.ts`

#### 1. `normalizeTurmaToLetter()`

Converte qualquer formato para letra única.

```typescript
import { normalizeTurmaToLetter } from '@/utils/turmaUtils';

// Aceita múltiplos formatos:
normalizeTurmaToLetter("TURMA A")  // → "A"
normalizeTurmaToLetter("Turma B")  // → "B"
normalizeTurmaToLetter("LRA 2025") // → "A"
normalizeTurmaToLetter("visitante") // → "VISITANTE"
normalizeTurmaToLetter("C")        // → "C"
```

**Quando usar:**
- Ao receber dados de fontes externas
- Ao processar dados legados
- Em migrations e scripts de normalização

#### 2. `formatTurmaDisplay()`

Formata para exibição na UI.

```typescript
import { formatTurmaDisplay } from '@/utils/turmaUtils';

formatTurmaDisplay("A")          // → "Turma A"
formatTurmaDisplay("VISITANTE")  // → "Visitante"
formatTurmaDisplay(null)         // → ""

// Aceita também formatos antigos (normaliza automaticamente):
formatTurmaDisplay("TURMA B")    // → "Turma B"
formatTurmaDisplay("LRC 2025")   // → "Turma C"
```

**Quando usar:**
- Em JSX para exibir turmas
- Em labels de formulários
- Em relatórios e dashboards

#### 3. `compareTurmas()`

Compara turmas de forma tolerante.

```typescript
import { compareTurmas } from '@/utils/turmaUtils';

compareTurmas("TURMA A", "A")          // → true
compareTurmas("LRA 2025", "Turma A")   // → true
compareTurmas("A", "B")                // → false
```

**Quando usar:**
- Em filtros e buscas
- Em validações de acesso
- Em lógica de negócio

#### 4. Constantes

```typescript
import { TURMAS_VALIDAS, TODAS_TURMAS } from '@/utils/turmaUtils';

// Para uso em selects e validações:
TURMAS_VALIDAS  // ['A', 'B', 'C', 'D', 'E']
TODAS_TURMAS    // ['A', 'B', 'C', 'D', 'E', 'VISITANTE']
```

---

## 📦 Implementação em Componentes

### Exemplo 1: Formulário de Cadastro

```tsx
import { TURMAS_VALIDAS, formatTurmaDisplay } from '@/utils/turmaUtils';

function CadastroAluno() {
  const [turma, setTurma] = useState('');

  return (
    <Select value={turma} onValueChange={setTurma}>
      <SelectTrigger>
        <SelectValue placeholder="Selecione a turma" />
      </SelectTrigger>
      <SelectContent>
        {TURMAS_VALIDAS.map((letra) => (
          <SelectItem key={letra} value={letra}>
            {formatTurmaDisplay(letra)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
```

### Exemplo 2: Lista de Alunos

```tsx
import { formatTurmaDisplay } from '@/utils/turmaUtils';

function AlunoList({ alunos }) {
  return (
    <Table>
      {alunos.map(aluno => (
        <TableRow key={aluno.id}>
          <TableCell>{aluno.nome}</TableCell>
          <TableCell>{formatTurmaDisplay(aluno.turma)}</TableCell>
        </TableRow>
      ))}
    </Table>
  );
}
```

### Exemplo 3: Filtros por Turma

```tsx
import { TURMAS_VALIDAS, formatTurmaDisplay, compareTurmas } from '@/utils/turmaUtils';

function FiltroTurma() {
  const [turmaSelecionada, setTurmaSelecionada] = useState<string | null>(null);

  const alunosFiltrados = alunos.filter(aluno =>
    !turmaSelecionada || compareTurmas(aluno.turma, turmaSelecionada)
  );

  return (
    <Tabs value={turmaSelecionada} onValueChange={setTurmaSelecionada}>
      <TabsList>
        <TabsTrigger value="todos">Todos</TabsTrigger>
        {TURMAS_VALIDAS.map(letra => (
          <TabsTrigger key={letra} value={letra}>
            {formatTurmaDisplay(letra)}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
```

---

## 🗄️ Migration de Dados

### Arquivo Criado

```
supabase/migrations/20251006000000_normalizar_turmas.sql
```

### O que a Migration Faz

1. **Backup**: Cria tabela `turmas_backup_20251006` com valores originais
2. **Normalização**: Converte todos os formatos para letras únicas
3. **Validação**: Adiciona constraint para garantir apenas valores válidos
4. **Relatório**: Cria view `vw_relatorio_normalizacao_turmas` para auditoria

### Executar Migration

```bash
# Executar migration no Supabase
supabase db push

# OU aplicar manualmente via dashboard Supabase
# SQL Editor → Copiar conteúdo do arquivo → Run
```

### Verificar Resultados

```sql
-- Ver relatório de normalização
SELECT * FROM vw_relatorio_normalizacao_turmas;

-- Ver backup de valores antigos
SELECT * FROM turmas_backup_20251006;

-- Verificar valores atuais
SELECT DISTINCT turma, COUNT(*) as total
FROM profiles
GROUP BY turma
ORDER BY turma;
```

---

## ✅ Checklist de Validação

Após aplicar a padronização, verificar:

- [ ] Migration executada sem erros
- [ ] Backup criado (`turmas_backup_20251006`)
- [ ] Valores normalizados no banco (apenas `A-E` e `VISITANTE`)
- [ ] Build do projeto sem erros TypeScript
- [ ] Formulários exibindo "Turma A", "Turma B", etc.
- [ ] Filtros funcionando corretamente
- [ ] Login de alunos funcionando
- [ ] Envio de redações mantendo turma correta

---

## 🚨 Troubleshooting

### Problema: Turmas não aparecem nos selects

**Solução:**
```typescript
// Verificar se está importando corretamente:
import { TURMAS_VALIDAS, formatTurmaDisplay } from '@/utils/turmaUtils';
```

### Problema: Filtros não funcionam

**Solução:**
```typescript
// Use compareTurmas() para comparações:
import { compareTurmas } from '@/utils/turmaUtils';

const ehMesmaTurma = compareTurmas(turma1, turma2);
```

### Problema: Dados legados não normalizados

**Solução:**
```typescript
// Use normalizeTurmaToLetter() ao ler do banco:
import { normalizeTurmaToLetter } from '@/utils/turmaUtils';

const turmaNormalizada = normalizeTurmaToLetter(aluno.turma);
```

---

## 📚 Arquivos Atualizados

### Core
- ✅ `src/utils/turmaUtils.ts` - Utilitários principais
- ✅ `supabase/migrations/20251006000000_normalizar_turmas.sql` - Migration

### Componentes Críticos
- ✅ `src/components/TurmaSelector.tsx`
- ✅ `src/components/admin/AlunoFormModern.tsx`
- ✅ `src/components/admin/AlunoList.tsx`
- ✅ `src/pages/CadastroAluno.tsx`

### Validação
- ✅ `src/utils/loginValidation.ts`

---

## 🎓 Boas Práticas

### ✅ DO (Faça)

```typescript
// 1. Armazenar apenas letras
await supabase.from('profiles').insert({ turma: 'A' });

// 2. Formatar para exibição
<span>{formatTurmaDisplay(turma)}</span>

// 3. Normalizar ao receber dados
const turma = normalizeTurmaToLetter(input);

// 4. Usar constantes
const turmas = TURMAS_VALIDAS;
```

### ❌ DON'T (Não faça)

```typescript
// 1. Armazenar com "Turma" no nome
await supabase.from('profiles').insert({ turma: 'Turma A' }); // ❌

// 2. Exibir valor bruto do banco
<span>{turma}</span> // ❌ Use formatTurmaDisplay()

// 3. Comparar strings diretamente
if (turma1 === turma2) {} // ❌ Use compareTurmas()

// 4. Hardcodar arrays de turmas
const turmas = ['Turma A', 'Turma B']; // ❌ Use TURMAS_VALIDAS
```

---

## 📞 Suporte

Para dúvidas ou problemas relacionados a este padrão:

1. Consultar este documento
2. Verificar exemplos em `src/components/admin/AlunoFormModern.tsx`
3. Revisar código em `src/utils/turmaUtils.ts`

---

## 🔄 Histórico de Mudanças

| Data | Versão | Mudanças |
|------|--------|----------|
| 06/10/2025 | 1.0.0 | Implementação inicial da padronização |

---

**Documento mantido por**: Equipe de Desenvolvimento Redator
**Última revisão**: 06/10/2025
