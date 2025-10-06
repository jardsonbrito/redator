# 📋 Instruções para Correção Final - Uniformização de Turmas

**Status Atual:** ✅ Funções auxiliares criadas | ⏳ 14 arquivos restantes para corrigir

---

## ✅ O Que Já Foi Feito

1. **turmaUtils.ts** - Adicionadas funções:
   - `getTurmaCode()` - Converte turma para código LRA2025
   - `getTurmaColorClasses()` - Retorna classes CSS para badges

2. **redacaoUtils.ts** - Atualizado para usar `getTurmaColorClasses()`

3. **AlunoList.tsx** - Removida função getTurmaColor local

4. **Build atual:** ✅ 0 erros

---

## ⏳ Arquivos que Precisam de Correção

### 🔴 CRÍTICO - Interface Visível (6 arquivos)

#### 1. `src/components/professor/AlunoListProfessor.tsx`
**Linhas 171-175**
```typescript
// REMOVER esta função:
const getTurmaColor = (turma: string) => {
  const colors = {
    "visitante": "bg-orange-100 text-orange-800",
    "Turma A": "bg-blue-100 text-blue-800",
    "Turma B": "bg-green-100 text-green-800",
    "Turma C": "bg-purple-100 text-purple-800",
    "Turma D": "bg-orange-100 text-orange-800",
    "Turma E": "bg-pink-100 text-pink-800"
  };
  return colors[turma as keyof typeof colors] || "bg-gray-100 text-gray-800";
};

// ADICIONAR no import (linha ~15):
import { getTurmaColorClasses } from "@/utils/turmaUtils";

// SUBSTITUIR a função por:
const getTurmaColor = (turma: string) => {
  return getTurmaColorClasses(turma);
};
```

---

#### 2. `src/components/corretor/ListaRedacoesCorretor.tsx`
**Linha 46**
```typescript
// SUBSTITUIR:
return ['Turma A', 'Turma B', 'Turma C', 'Turma D', 'Turma E', 'Visitantes'];

// POR:
import { TODAS_TURMAS } from "@/utils/turmaUtils";
return TODAS_TURMAS; // Retorna ['A', 'B', 'C', 'D', 'E', 'VISITANTE']
```

---

#### 3. `src/components/admin/MigrarVisitanteModal.tsx`
**Linhas 33 e 38-42**
```typescript
// SUBSTITUIR:
const [turmaDestino, setTurmaDestino] = useState<string>("Turma A");

const turmasDisponiveis = [
  "Turma A",
  "Turma B",
  "Turma C",
  "Turma D",
  "Turma E"
];

// POR:
import { TURMAS_VALIDAS } from "@/utils/turmaUtils";

const [turmaDestino, setTurmaDestino] = useState<string>(TURMAS_VALIDAS[0]); // "A"
const turmasDisponiveis = TURMAS_VALIDAS; // ['A', 'B', 'C', 'D', 'E']

// E no SelectItem (linha ~87):
<SelectItem key={turma} value={turma}>
  {formatTurmaDisplay(turma)}
</SelectItem>
```

---

#### 4. `src/components/admin/AlunoCSVImport.tsx`
**Linhas 26-28, 86, 291**
```typescript
// ADICIONAR no início:
import { TURMAS_VALIDAS, formatTurmaDisplay } from "@/utils/turmaUtils";

// Linha 26-28 - SUBSTITUIR csvContent:
const csvContent = `nome,email,turma
João da Silva,joao@email.com,A
Maria Souza,maria@email.com,B
Pedro Santos,pedro@email.com,C`;

// Linha 86 - SUBSTITUIR:
const validTurmas = TURMAS_VALIDAS; // ['A', 'B', 'C', 'D', 'E']

// Linha 291 - SUBSTITUIR:
<p>• <strong>turma:</strong> {TURMAS_VALIDAS.join(', ')}</p>
```

---

#### 5. `src/components/admin/ExercicioForm.tsx`
**Linha 81**
```typescript
// SUBSTITUIR:
const turmasDisponiveis = TURMAS_VALIDAS.map(letra => `TURMA ${letra}`);

// POR:
const turmasDisponiveis = TURMAS_VALIDAS; // ['A', 'B', 'C', 'D', 'E']

// E adicionar formatTurmaDisplay no map do render (linha ~682):
{turmasDisponiveis.map((turma) => (
  <div key={turma}>
    <Checkbox id={turma} ... />
    <Label>{formatTurmaDisplay(turma)}</Label>
  </div>
))}
```

---

#### 6. `src/components/MenuGrid.tsx`
**Linha 224**
```typescript
// PODE MANTER COMO ESTÁ (é mensagem literal) OU:
? `Recurso bloqueado para ${formatTurmaDisplay("E")}`
```

---

### 🟡 IMPORTANTE - Mapeamento de Códigos (5 arquivos)

Todos seguem o mesmo padrão. Adicionar no topo de cada arquivo:

```typescript
import { getTurmaCode } from "@/utils/turmaUtils";
```

E substituir o mapeamento manual por:

```typescript
// REMOVER:
const turmasMap = {
  "Turma A": "LRA2025",
  "Turma B": "LRB2025",
  "Turma C": "LRC2025",
  "Turma D": "LRD2025",
  "Turma E": "LRE2025"
};
turmaCode = turmasMap[alunoTurma as keyof typeof turmasMap] || "visitante";

// SUBSTITUIR POR:
const turmaCode = getTurmaCode(alunoTurma);
```

**Arquivos:**
1. `src/pages/MeusSimulados.tsx` (linha 54-59 → 65)
2. `src/pages/Index.tsx` (linha 22-26 → 32)
3. `src/components/shared/RedacaoFormUnificado.tsx` (linha 85-89 → 95)
4. `src/components/MeusSimuladosFixo.tsx` (linha 87-91 → 97)
5. `src/components/MinhasRedacoes.tsx` (linha 117-121 → 127)

---

## 🔧 Como Executar as Correções

### Opção 1: Usar o Claude Code
Cole este arquivo e peça:
> "Corrija todos os arquivos listados em INSTRUCOES_CORRECAO_FINAL_TURMAS.md seguindo as instruções"

### Opção 2: Manual (mais rápido)
1. Abra cada arquivo no VS Code
2. Use Cmd+F (Find) para localizar as linhas mencionadas
3. Copie e cole as substituições
4. Rode `npm run build` ao final

### Opção 3: Search & Replace Global (cuidado!)
```bash
# Na pasta do projeto, substituir arrays hardcoded:
# NÃO RECOMENDADO - fazer manualmente é mais seguro
```

---

## ✅ Validação Final

Após todas as correções:

```bash
# 1. Build deve passar:
npm run build

# 2. Buscar por turmas hardcoded restantes:
grep -r "Turma A" src/components/ src/pages/ --include="*.tsx" --include="*.ts"

# 3. Testar visualmente:
# - Dashboard → Exercícios (deve mostrar A, B, C, D, E)
# - Dashboard → Inbox (já correto - referência)
# - Dashboard → Lousa
# - Dashboard → Mural de Avisos
# - Todas as outras rotas listadas no relatório inicial
```

---

## 📊 Progresso

- [x] Funções auxiliares criadas
- [x] redacaoUtils.ts atualizado
- [x] AlunoList.tsx corrigido
- [ ] 5 arquivos críticos de UI
- [ ] 5 arquivos de mapeamento de códigos
- [ ] 3 arquivos de baixa prioridade
- [ ] Build final
- [ ] Testes visuais

**Tempo estimado restante:** 1-2 horas

---

## 🎯 Resultado Esperado

Após todas as correções:

### ✅ Exibição Padronizada:
- **Filtros e dropdowns:** A, B, C, D, E, VISITANTE
- **Badges e chips:** A, B, C, D, E, VISITANTE
- **Tabelas:** A, B, C, D, E, VISITANTE

### ✅ Sem mais:
- ❌ "Turma A", "Turma B"
- ❌ "TURMA A", "TURMA B"
- ❌ Arrays hardcoded

### ✅ Código Limpo:
- Função `getTurmaCode()` para conversões
- Função `getTurmaColorClasses()` para badges
- Arrays `TURMAS_VALIDAS` e `TODAS_TURMAS` centralizados
- 0 erros no build

---

**✅ Próxima ação:** Corrigir os 11 arquivos listados acima seguindo as instruções exatas.
