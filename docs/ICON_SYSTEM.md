# Sistema de Ícones Padronizado - Painel Administrativo

## Visão Geral

Sistema unificado de ações com ícones para todos os menus administrativos, garantindo consistência visual, semântica e acessibilidade.

## Componentes Principais

### IconAction

Componente base para todas as ações administrativas:

```tsx
import { IconAction, ACTION_ICON } from '@/components/ui/icon-action';

// Exemplo básico
<IconAction
  icon={ACTION_ICON.editar}
  label="Editar"
  intent="neutral"
  onClick={handleEdit}
/>
```

### Props Principais

- `icon`: Ícone do vocabulário único (ACTION_ICON)
- `label`: Texto descritivo da ação
- `intent`: Cor por intenção ('neutral', 'positive', 'attention', 'danger', 'blue')
- `density`: Compacidade ('compact', 'standard', 'expanded')
- `loading`: Estado de carregamento com spinner
- `disabled`: Estado desabilitado com tooltip explicativo

## Vocabulário de Ícones

| Ação | Ícone | Intent | Uso |
|------|-------|--------|-----|
| Editar | `Pencil` | neutral | Modificar conteúdo |
| Excluir | `Trash2` | danger | Remover permanentemente |
| Publicar | `Eye` | positive | Tornar visível/ativo |
| Tornar rascunho | `EyeOff` | neutral | Ocultar/inativar |
| Ativar | `PlayCircle` | positive | Habilitar recurso |
| Desativar | `PauseCircle` | attention | Desabilitar recurso |
| Visualizar | `SquareMousePointer` | neutral | Ver detalhes |
| Download | `Download` | neutral | Baixar arquivo |
| Exportar | `FileDown` | neutral | Gerar arquivo |
| Abrir Externo | `ExternalLink` | blue | Link externo |
| Estatísticas | `BarChart3` | blue | Relatórios/métricas |
| Gerenciar Usuário | `UserCog` | neutral | Atribuir/configurar |
| Mensagens | `MessageSquareText` | blue | Chat/comunicação |

## Estados Visuais

### Por Intenção
- **Neutral**: Ações gerais (cinza)
- **Positive**: Ações construtivas (verde)
- **Attention**: Ações de cuidado (âmbar)
- **Danger**: Ações destrutivas (vermelho)
- **Blue**: Navegação/métricas (azul)

### Estados Interativos
- **Hover**: Ícone + texto ficam na cor brand (roxo)
- **Focus**: Anel de foco roxo
- **Disabled**: Opacidade reduzida, sem hover
- **Loading**: Spinner substitui ícone

## Design Tokens CSS

```css
:root {
  --color-brand: hsl(248 59% 60%);
  --color-neutral: hsl(211 7% 42%);
  --color-positive: hsl(142 76% 36%);
  --color-attention: hsl(43 89% 38%);
  --color-danger: hsl(0 84% 60%);
  --color-blue: hsl(217 91% 60%);
  
  --focus-ring: hsl(248 59% 60%);
  --disabled-opacity: 0.4;
}
```

## Responsividade

### Mobile (< 768px)
- Densidade 'compact': apenas ícones
- Tooltips obrigatórios
- Área clicável mínima 40x40px

### Desktop (≥ 768px)
- Densidade 'standard': ícone + texto
- Tooltips opcionais

## Migração Implementada

### ✅ Já Migrados
- **TemaList**: Editar, Publicar/Rascunho, Excluir
- **RedacaoList**: Editar, Excluir

### 🔄 Próximos
- VideoList
- AulaList
- ExercicioList
- SimuladoList
- BibliotecaList
- CorretorList
- AlunoList
- AvisoList

## Exemplos de Uso

### Ações Básicas
```tsx
// Editar
<IconAction icon={ACTION_ICON.editar} label="Editar" intent="neutral" />

// Excluir com confirmação
<AlertDialog>
  <AlertDialogTrigger asChild>
    <IconAction icon={ACTION_ICON.excluir} label="Excluir" intent="danger" />
  </AlertDialogTrigger>
  {/* Modal de confirmação */}
</AlertDialog>
```

### Toggle de Visibilidade
```tsx
<IconAction
  icon={isPublished ? ACTION_ICON.rascunho : ACTION_ICON.publicar}
  label={isPublished ? 'Tornar Rascunho' : 'Publicar'}
  intent={isPublished ? 'neutral' : 'positive'}
  asSwitch
  checked={isPublished}
  onClick={handleToggle}
/>
```

### Estado de Loading
```tsx
<IconAction
  icon={ACTION_ICON.publicar}
  label="Publicando..."
  intent="positive"
  loading={isLoading}
  disabled={isLoading}
/>
```

### Responsivo com Grupo
```tsx
import { IconActionGroup } from '@/components/admin/IconActionGroup';

<IconActionGroup responsive>
  <IconAction icon={ACTION_ICON.editar} label="Editar" intent="neutral" />
  <IconAction icon={ACTION_ICON.visualizar} label="Visualizar" intent="neutral" />
  <IconAction icon={ACTION_ICON.excluir} label="Excluir" intent="danger" />
</IconActionGroup>
```

## Acessibilidade

- `aria-label` descritivo contextual
- `role="switch"` para toggles
- `aria-checked` para estados booleanos
- `aria-busy` durante loading
- `aria-disabled` quando desabilitado
- Foco visível com `focus-visible`
- Área clicável ≥ 40px
- Tooltips explicativos

## Performance

- Tree-shaking: apenas ícones usados são incluídos
- ~2KB por ícone Lucide
- Animações respeitam `prefers-reduced-motion`
- Bundle otimizado com lazy loading