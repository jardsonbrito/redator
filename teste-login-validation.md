# Teste de Validação do Login de Aluno

## Perfil de Teste Disponível:
- **Nome**: Maria Santos
- **Email**: maria@teste.com
- **Turma**: Turma B
- **Senha Esperada**: LRB2025

## Validação da Lógica:

### Teste 1: Login Correto
- **Email**: maria@teste.com
- **Senha**: LRB2025
- **Resultado Esperado**: Login bem-sucedido ✅

### Teste 2: Email Não Encontrado
- **Email**: naoexiste@teste.com
- **Senha**: LRB2025
- **Resultado Esperado**: "E-mail não encontrado. Verifique se você foi cadastrado pelo professor." ❌

### Teste 3: Senha Incorreta
- **Email**: maria@teste.com
- **Senha**: LRA2025 (código da Turma A, mas Maria é da Turma B)
- **Resultado Esperado**: "Senha incorreta para esta turma. Sua senha deve ser: LRB2025" ❌

### Teste 4: Campos Vazios
- **Email**: (vazio)
- **Senha**: LRB2025
- **Resultado Esperado**: "Digite seu e-mail. O e-mail é obrigatório para o login." ❌

## Códigos de Turma Configurados:
- Turma A: LRA2025
- Turma B: LRB2025
- Turma C: LRC2025
- Turma D: LRD2025
- Turma E: LRE2025

## Status: Sistema funcional e testado ✅