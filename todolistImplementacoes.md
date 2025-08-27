# 📋 Todo List - Implementações Redator

Lista organizada de tarefas para implementação na plataforma Redator, ordenadas do mais fácil para o mais complexo.

## ✅ Concluído

### 🔧 Sistema de E-mail
- [x] **Quando trocar email de aluno deve levar o histórico junto**
  - Função `update_student_email` implementada
  - Preserva histórico em 14 tabelas diferentes
  - Sistema de auditoria completo
  - Testado e funcionando

---

## 🔄 Pendente

### 💾 **Nível 1 - Fácil (UI/UX Simples)**

#### 1. **Storage de Fotos de Perfil**
- [x] Foto do usuário logado não está sendo salva no storage
- ✅ Sistema completamente funcional no componente `StudentAvatar`
- ✅ Upload para Supabase Storage bucket `avatars` configurado  
- ✅ Integração com campo `avatar_url` da tabela profiles
- ✅ Validação de formato (imagens) e tamanho (máx 5MB)
- ✅ Suporte a alunos com localStorage e admin com Supabase Auth
- ✅ Avatar exibido no header e página principal
- ✅ Corrigido problema de duplicação de caminho

#### 2. **Verificar Presença na Visão Aluno**
- [x] Verificar presença na visão aluno
- Corrigido: função `getMyAttendanceStatus` agora busca na tabela `presenca_aulas`
- Corrigido: função `registrarEntrada` agora usa `registrar_entrada_email`
- Sistema de presença agora funciona corretamente para alunos

#### 3. **Lousa - Remover Duplicidade**
- [x] **Lousa retirar duplicidade dos botões em ações**
- ✅ Removido botão "Corrigir" duplicado da tabela de respostas
- ✅ Botão de visualização renomeado para "Visualizar e Editar"
- ✅ Mantido fluxo: Visualizar → Corrigir (dentro do modal)
- ✅ Interface mais limpa e intuitiva

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

### 📧 **Nível 4 - Complexo (Notificações)**

#### 9. **Lembretes por E-mail**
- [ ] Lembretes por email se possível, solicitar acesso Hostinger
- Configurar SMTP/serviço de email
- Sistema de templates de email
- Agendamento de lembretes
- Configurações de usuário

#### 10. **Notificação de Correção**
- [ ] Quando ocorrer alguma correção o aluno receber um email
- Hook de correção finalizada
- Template de email de correção
- Sistema de notificações
- Configurações de preferência

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

1. **Foco Imediato**: Itens do Nível 1
2. **Sprint Seguinte**: Itens do Nível 2
3. **Médio Prazo**: Itens do Nível 3-4
4. **Longo Prazo**: Itens do Nível 5

---

*Última atualização: 27/08/2025*