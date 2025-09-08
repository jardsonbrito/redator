# Roadmap - Alterações no Sistema TOP 5

## 📋 Visão Geral

Migração do sistema TOP 5 atual (ranking geral todas as turmas) para um sistema segmentado por turma, mantendo as funcionalidades existentes mas aplicando filtros específicos por turma.

---

## 🎯 Tarefas de Implementação

### 1. **Análise e Mapeamento do Sistema Atual**
- [ ] Localizar e analisar componentes do sistema TOP 5 atual
- [ ] Identificar queries e lógica de cálculo de notas existentes
- [ ] Mapear estrutura de dados (tabelas relacionadas)
- [ ] Documentar fluxo atual de dados entre simulados/regulares/visitantes

### 2. **Implementação do Filtro por Turma**
- [ ] Modificar queries para incluir filtro por turma do aluno logado
- [ ] Implementar lógica de detecção automática da turma do usuário
- [ ] Garantir que visitantes continuem vendo ranking geral
- [ ] Testar segmentação correta dos dados por turma

### 3. **Interface Administrativa - Seletor de Turmas**
- [ ] Criar componente seletor de turma para admin (A, B, C, D, E, Geral)
- [ ] Implementar lógica de permissão (só admin vê seletor)
- [ ] Adicionar exibição de turma nos nomes (apenas na visão admin)
- [ ] Criar toggle entre visão por turma específica e visão geral

### 4. **Aprimoramento da Lógica de Classificação**
- [ ] Implementar ordenação por data de obtenção da nota (mais recente primeiro)
- [ ] Implementar ordenação alfabética como critério de desempate secundário
- [ ] Garantir que apenas a maior nota por aluno/período seja considerada
- [ ] Manter lógica de empates por colocação (1º, 2º, 3º, 4º, 5º)

### 5. **Refatoração da "Galeria de Honra"**
- [ ] Renomear seção de destaque para "Galeria de Honra — 1000 pontos"
- [ ] Implementar histórico global de notas 1000 (todas as turmas)
- [ ] Criar fallback para quando não há registros de 1000 pontos
- [ ] Garantir que galeria seja sempre global, independente da turma

### 6. **Melhorias de UI/UX**
- [ ] Agrupar visualmente alunos por colocação com cabeçalhos
- [ ] Implementar paginação para colocações com muitos empates
- [ ] Remover exibição de turma na visão do aluno (já filtrada)
- [ ] Criar layout responsivo para diferentes tamanhos de tela

### 7. **Otimização de Queries e Performance**
- [ ] Otimizar consultas para evitar N+1 queries
- [ ] Implementar cache adequado para rankings por turma
- [ ] Adicionar índices no banco de dados se necessário
- [ ] Testar performance com volume alto de dados

### 8. **Testes e Validação**
- [ ] Testar filtros por turma com dados de diferentes turmas
- [ ] Validar cálculos de média (simulados) vs nota única (regulares)
- [ ] Testar ordenação por data e nome em casos de empate
- [ ] Verificar permissões admin vs aluno
- [ ] Testar todos os filtros de período (simulado/regular/visitante)

### 9. **Documentação e Deploy**
- [ ] Documentar novas funcionalidades e mudanças de comportamento
- [ ] Criar guia de uso para administradores
- [ ] Atualizar documentação técnica do sistema
- [ ] Planejar estratégia de deploy e rollback se necessário

---

## 🔄 Funcionalidades Mantidas

### ✅ **Abas e Tipos de Envio**
- Simulado, Regular, Visitante (sem alterações)

### ✅ **Cálculo de Notas**
- Simulado: média obrigatória das duas correções
- Regular: nota única do corretor
- Visitante: nota única do corretor

### ✅ **Filtros de Período**
- Simulado: por nome do simulado (ex: "Julho 2025")
- Regular: por mês civil
- Botão "Todos" compila respeitando a turma selecionada

### ✅ **Sistema de Classificação**
- Escala 0-1000 em intervalos de 40 pontos
- Empates: mesma colocação para mesma pontuação
- Top 5 colocações (1º ao 5º lugar)

---

## 🎨 Principais Mudanças Visuais

| **Antes** | **Depois** |
|-----------|------------|
| Ranking geral (todas turmas) | Ranking segmentado por turma do aluno |
| Seção "Maior nota" | "Galeria de Honra — 1000 pontos" |
| Sem info de turma | Admin vê info de turma, aluno não |
| Ordem só por nota | Ordem: nota → data → alfabética |
| Sem seletor admin | Seletor A/B/C/D/E/Geral para admin |

---

## ⚠️ Considerações Técnicas

### **Impacto no Banco de Dados**
- Verificar se existe campo `turma` nas tabelas relevantes
- Criar índices para otimizar queries por turma
- Considerar migração de dados se necessário

### **Autenticação e Permissões**
- Garantir que filtro por turma funcione com sistema de auth atual
- Validar permissões admin vs aluno/visitante
- Manter compatibilidade com sistema de turmas existente

### **Performance**
- Consultas segmentadas podem ser mais rápidas
- Cache por turma pode melhorar performance
- Monitorar impacto em consultas administrativas globais

---

## 📅 Estimativa de Implementação

**Tempo estimado total: 3-4 semanas**

- **Semana 1**: Análise + Filtro por turma (tarefas 1-2)
- **Semana 2**: Interface admin + Lógica de classificação (tarefas 3-4)  
- **Semana 3**: Galeria de Honra + UI/UX (tarefas 5-6)
- **Semana 4**: Performance + Testes + Deploy (tarefas 7-9)

---

## 🚀 Próximos Passos

1. **Validar requisitos** com stakeholders
2. **Analisar código atual** do sistema TOP 5
3. **Definir prioridade** das tarefas
4. **Iniciar implementação** seguindo a ordem do roadmap

---

*Documento criado em: ${new Date().toLocaleDateString('pt-BR')}*