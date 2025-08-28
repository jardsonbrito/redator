# 📋 Todo List - Implementações Redator

Lista organizada de tarefas para implementação na plataforma Redator, ordenadas do mais fácil para o mais complexo.

## ✅ Concluído

### 🔧 Sistema de E-mail
- [x] **Quando trocar email de aluno deve levar o histórico junto**
  - Função `update_student_email` implementada
  - Preserva histórico em 14 tabelas diferentes
  - Sistema de auditoria completo
  - Testado e funcionando

- [x] **Correção de Bug: Erro "atualizado_em" na troca de email**  
  - ✅ Problema: Triggers com inconsistência de nomenclatura de campos
  - ✅ Solução: Função `update_updated_at_column()` robusta com try/catch
  - ✅ Suporte a ambos padrões: `updated_at` e `atualizado_em`
  - ✅ Testado e funcionando perfeitamente

### 💾 **Nível 1 - Fácil (UI/UX Simples) - CONCLUÍDO** ✅

#### 1. **Storage de Fotos de Perfil** ✅
- [x] **Foto do usuário logado não está sendo salva no storage**
- ✅ Sistema completamente funcional no componente `StudentAvatar`
- ✅ Upload para Supabase Storage bucket `avatars` configurado  
- ✅ Integração com campo `avatar_url` da tabela profiles
- ✅ Validação de formato (imagens) e tamanho (máx 5MB)
- ✅ Suporte a alunos com localStorage e admin com Supabase Auth
- ✅ Avatar exibido no header e página principal
- ✅ Corrigido problema de duplicação de caminho
- ✅ Funções RPC para bypass de RLS: `get_student_profile_by_email`, `update_student_avatar`

**🔄 UPGRADE COMPLETO - Sistema de Avatars Unificado** ✅
- [x] **Mudança de local**: Avatars movidos para header apenas (removidos das páginas principais)
- [x] **Avatars clicáveis**: Todos os avatars agora permitem upload ao clicar
- [x] **Hover effects**: Indicação visual de que o avatar é clicável
- [x] **Informações contextuais**: Nome + função/turma exibidos ao lado do avatar
- [x] **Responsivo**: Nome/função ocultos em telas pequenas
- [x] **Todos os tipos de usuário**:
  - ✅ **Alunos**: `StudentAvatar` no `StudentHeader` (mostra nome + turma)
  - ✅ **Professores**: `ProfessorAvatar` no `ProfessorDashboard` (mostra nome + "Professor/Administrador")
  - ✅ **Corretores**: `CorretorAvatar` no `CorretorLayout` (mostra nome + "Corretor")
  - ✅ **Administradores**: `AdminAvatar` no `Admin.tsx` (mostra email + "Administrador")
- [x] **Componentes de perfil removidos**: `StudentProfile` e similares removidos das páginas principais
- [x] **Interface limpa**: Experiência unificada e consistente em toda a plataforma

#### 2. **Verificar Presença na Visão Aluno** ✅
- [x] **Verificar presença na visão aluno**
- ✅ Corrigido: função `getMyAttendanceStatus` agora busca na tabela `presenca_aulas`
- ✅ Corrigido: função `registrarEntrada` agora usa `registrar_entrada_email`
- ✅ Sistema de presença agora funciona corretamente para alunos
- ✅ Suporte completo ao localStorage authentication

#### 3. **Sistema de Lousas - Completo** ✅
- [x] **Lousa retirar duplicidade dos botões em ações**
- ✅ **Corretor pode acessar lousas**: Erro 400 Bad Request corrigido
- ✅ **Políticas RLS criadas** para tabelas `lousa` e `lousa_resposta`
- ✅ **Funções RPC implementadas**: `get_corretor_lousas`, `get_lousa_respostas_corretor`
- ✅ **Botões duplicados removidos** da tabela de respostas
- ✅ **Botão renomeado** para "Visualizar e Editar"
- ✅ **Modal melhorado** com formatação adequada de texto
- ✅ **Botão de fechar** movido para a direita (padrão UX)
- ✅ **Interface limpa e intuitiva**

**🚀 UPGRADE AVANÇADO - Sistema de Atribuição de Lousas** ✅
- [x] **Campo corretor_id**: Adicionado na tabela `lousa` com referência para `corretores`
- [x] **Seletor de corretor**: Implementado no formulário admin com lista de corretores ativos
- [x] **Atribuição automática**: Corretores se tornam responsáveis pelas lousas que criam
- [x] **Políticas RLS atualizadas**: Acesso restrito baseado em atribuição
- [x] **Corretores podem criar lousas**: Interface completa com abas no painel corretor
- [x] **Controle de acesso refinado**:
  - ✅ **Lousas sem atribuição** (`corretor_id = NULL`): Todos os corretores podem ver
  - ✅ **Lousas com atribuição**: Apenas corretor específico + administradores
  - ✅ **Alunos restritos**: Só veem lousas da sua turma específica
  - ✅ **Visitantes**: Só veem lousas com `permite_visitante = true`
- [x] **Interface corretor**: `CorretorLousaForm.tsx` e abas em `CorretorLousas.tsx`
- [x] **Bug corrigido**: SelectItem com value vazio causando erro Radix UI
- [x] **Testes realizados**: Todos os cenários de acesso validados

### 🎨 **Melhorias de UX Global**
- [x] **Padronização de Modais**
  - ✅ Botão de fechar movido para direita em todos os modais
  - ✅ Layout consistente e responsivo
  - ✅ Formatação de texto melhorada (`whitespace-pre-line`)

---

## 🔄 Pendente

### 🎨 **Nível 2 - Médio (UX/Design)**

#### 4. **Padronizar UX**
- [ ] Padronizar UX a partir de uma página escolhida - layout clean
- Escolher página de referência
- Criar design system/guia de estilo

---

### 🎨 **Nível 2 - Médio (UX/Design)**

#### 4. **Padronizar UX**
- [ ] Padronizar UX a partir de uma página escolhida - layout clean
- Escolher página de referência
- Criar design system/guia de estilo
- Aplicar padrão em componentes principais
- Documentar componentes

#### 5. **Sistema de Login Visitante**
- [ ] Criar login de visitante e gerar cadastro de visitantes com histórico
- Implementar fluxo de cadastro sem aprovação
- Criar tabela de visitantes
- Sistema de histórico básico
- Interface de registro simplificada

---

### 📊 **Nível 3 - Médio-Complexo (Integrações)**

#### 6. **Exercícios no Radar**
- [ ] Os exercícios respondidos devem aparecer no radar do painel administrativo e em conquistas do aluno
- Integrar dados de exercícios no painel radar
- Criar sistema de conquistas/badges
- Dashboard de progresso do aluno
- Métricas de desempenho

#### 7. **Redações em JPG**
- [ ] Redações quando chegarem para o corretor chegar em imagem .jpg
- Sistema de conversão automática
- Upload e processamento de imagens
- Interface de correção otimizada para imagens
- Compressão e otimização

#### 8. **Perfil do Aluno no Radar**
- [ ] No radar mostrar ao clicar no card do aluno deve mostrar o perfil, adicionar o nosso formulário como teste, corrigir redações e uploads
- Modal/página de perfil completo
- Integração com sistema de correção
- Formulários dinâmicos
- Upload de arquivos

---

### 📧 **Nível 4 - Complexo (Notificações) - Resend Integration**

#### 9. **Lembretes por E-mail**
- [ ] **Sistema de lembretes automáticos por e-mail**
- 📧 **Integração Resend API** (resend.com)
- Configurar domínio personalizado 
- Sistema de templates de email responsivos
- Agendamento de lembretes (Edge Functions + Cron)
- Configurações de usuário (frequência, tipos)
- Analytics de entrega e abertura

#### 10. **Notificação de Correção via Resend**
- [ ] **Quando ocorrer alguma correção o aluno receber um email**

**📧 Layout do E-mail (Template Resend):**
- **Header**: Logo centralizado no topo
- **Mensagem principal**: "Olá [NOME], sua redação acaba de ser corrigida."
- **CTA**: "Clique no botão abaixo para ter acesso aos detalhes da correção"

**📋 Caixa de Informações:**
- **Tema**: [Título do tema da redação]
- **Envio**: [Regular/Simulado/Exercício] 
- **Corretor**: [Nome do corretor responsável]
- **Botão**: "Ver Correção" (linkando para a plataforma)

**⚠️ Footer**: "Caso você não reconheça este email, ignore esta mensagem."

**🔧 Implementação Técnica Resend:**
- **Edge Function**: Trigger automático pós-correção
- **Template React Email**: Components modernos e responsivos
- **Resend SDK**: Integração com Supabase Edge Functions
- **Webhook Resend**: Status de entrega (delivered, bounced, opened)
- **Database Log**: Registro de emails enviados e status
- **Rate Limiting**: Controle de frequência de envios
- **Unsubscribe**: Link de descadastro automático

---

### 🎓 **Nível 5 - Muito Complexo (Sistemas Avançados)**

#### 11. **Sistema de Provas Google Forms**
- [ ] Google forms criar sistema de provas arrumar uploads das imagens, colocando as alternativas corretas e poder fazer as correções. Mostrar após terminar a prova o que acertou e porque é a certa
- Integração com Google Forms API
- Sistema de alternativas corretas
- Upload de imagens para questões
- Engine de correção automática
- Feedback detalhado pós-prova
- Interface de resultados

#### 12. **Correção Automática de Testes**
- [ ] No teste fazer correção automática e lançar em boletim e exportar PDF e CSV
- Algoritmo de correção automática
- Sistema de boletim digital
- Geração de PDF automatizada
- Export para CSV/Excel
- Templates de relatório
- Cálculo de notas e estatísticas

---

## 📋 **Critérios de Priorização**

### **Nível 1 - Fácil** 
- Correções simples de UI
- Bugs visuais
- Funcionalidades existentes

### **Nível 2 - Médio**
- Novos componentes
- Melhorias de UX
- Integrações simples

### **Nível 3 - Médio-Complexo**
- Dashboards e relatórios
- Integrações de dados
- Funcionalidades de upload

### **Nível 4 - Complexo**
- Sistemas de notificação
- Integração com serviços externos
- Automações

### **Nível 5 - Muito Complexo**
- APIs externas complexas
- Sistemas de correção automática
- Geração de relatórios avançados

---

## 🎯 **Próximos Passos**

1. **✅ Concluído**: ~~Itens do Nível 1~~ - **TODOS IMPLEMENTADOS!**
2. **Foco Atual**: Itens do Nível 2 (UX/Design)
3. **Médio Prazo**: Itens do Nível 3-4
4. **Longo Prazo**: Itens do Nível 5

---

## 📊 **Status do Projeto**

### **Progresso Geral: 4/12 tarefas concluídas (33%)**

**✅ Nível 1 - Fácil**: **3/3 CONCLUÍDO (100%)**
- Sistema de Avatars Unificado ✅
- Verificação de Presença ✅  
- Sistema de Lousas Completo ✅

**🔄 Nível 2 - Médio**: **0/2 (0%)**
- Padronizar UX
- Sistema de Login Visitante

**🔄 Nível 3 - Médio-Complexo**: **0/3 (0%)**
- Exercícios no Radar
- Redações em JPG
- Perfil do Aluno no Radar

**🔄 Nível 4 - Complexo**: **0/2 (0%)**
- Lembretes por E-mail
- Notificação de Correção

**🔄 Nível 5 - Muito Complexo**: **0/2 (0%)**
- Sistema de Provas Google Forms
- Correção Automática de Testes

---

## 🏆 **Conquistas Recentes (Sessão 28/08/2025)**

### **🔧 Problemas Críticos Resolvidos:**
1. **Corretores não conseguiam acessar lousas** → **RESOLVIDO**
2. **Presença mostrava "Ausente" para alunos presentes** → **RESOLVIDO**  
3. **Upload de avatar falhava para alunos** → **RESOLVIDO**
4. **Interface confusa com botões duplicados** → **RESOLVIDO**
5. **Avatar não aparecia no painel administrativo** → **RESOLVIDO**
6. **Alunos viam lousas de outras turmas** → **RESOLVIDO**
7. **Corretores não podiam criar lousas** → **RESOLVIDO**
8. **Bug SelectItem com value vazio** → **RESOLVIDO**

### **🚀 Melhorias Técnicas:**
- **8 Migrations** aplicadas no Supabase
- **Políticas RLS** refinadas para acesso baseado em atribuição
- **Funções RPC** atualizadas para nova lógica de corretores
- **Sistema de Avatars** unificado para todos os usuários
- **Sistema de Lousas** completamente reformulado
- **Interface de corretor** expandida com criação de lousas

### **🎯 Sistema de Lousas - Implementação Completa:**
1. **Banco de dados**: Campo `corretor_id` com relacionamento para atribuição
2. **Políticas RLS**: Acesso refinado baseado em corretor responsável
3. **Interface Admin**: Seletor de corretor no formulário de criação
4. **Interface Corretor**: Abas para visualização e criação de lousas
5. **Controle de acesso**: Alunos restritos à sua turma, corretores às suas lousas
6. **Auto-atribuição**: Corretores automaticamente responsáveis pelas lousas criadas
7. **Bug fixes**: Correção de erro Radix UI com SelectItem valor vazio

### **📁 Arquivos Principais Modificados/Criados:**
- **Criados**: `CorretorLousaForm.tsx`, `AdminAvatar.tsx`, `ProfessorAvatar.tsx`, `CorretorAvatar.tsx`
- **Atualizados**: `LousaForm.tsx`, `CorretorLousas.tsx`, `AlunoLousaList.tsx`, `Admin.tsx`
- **Migrations**: 3 novas migrations para políticas RLS e estrutura do banco

---

*Última atualização: 28/08/2025*