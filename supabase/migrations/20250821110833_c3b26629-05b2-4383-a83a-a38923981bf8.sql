-- Inserir dados de teste para demonstrar o sistema de monitoramento
-- Eventos de exemplo para diferentes alunos e turmas

-- Aluno fictício Turma A
INSERT INTO student_feature_event (student_email, feature, action, entity_id, class_name, occurred_at, metadata) VALUES
-- Janeiro 2025
('teste.turma.a@exemplo.com', 'essay_regular', 'submitted', 'tema-001', 'Turma A', '2025-01-15 10:30:00-03', '{"word_count": 720}'),
('teste.turma.a@exemplo.com', 'essay_regular', 'submitted', 'tema-002', 'Turma A', '2025-01-20 14:15:00-03', '{"word_count": 850}'),
('teste.turma.a@exemplo.com', 'lousa', 'opened', 'lousa-001', 'Turma A', '2025-01-10 09:00:00-03', '{"source": "aluno"}'),
('teste.turma.a@exemplo.com', 'lousa', 'completed', 'lousa-001', 'Turma A', '2025-01-10 09:30:00-03', '{"chars": 450, "attachments": 0}'),
('teste.turma.a@exemplo.com', 'live', 'participated', 'live-001', 'Turma A', '2025-01-12 19:00:00-03', '{}'),
('teste.turma.a@exemplo.com', 'gravada', 'watched', 'video-001', 'Turma A', '2025-01-18 16:45:00-03', '{}'),
('teste.turma.a@exemplo.com', 'gravada', 'watched', 'video-002', 'Turma A', '2025-01-25 20:30:00-03', '{}'),

-- Aluno fictício Turma B
('teste.turma.b@exemplo.com', 'essay_simulado', 'submitted', 'tema-003', 'Turma B', '2025-01-22 11:00:00-03', '{"simulado_name": "Simulado ENEM 1"}'),
('teste.turma.b@exemplo.com', 'lousa', 'opened', 'lousa-002', 'Turma B', '2025-01-14 08:30:00-03', '{"source": "aluno"}'),
('teste.turma.b@exemplo.com', 'lousa', 'completed', 'lousa-002', 'Turma B', '2025-01-14 09:15:00-03', '{"chars": 380, "attachments": 0}'),
('teste.turma.b@exemplo.com', 'live', 'not_participated', 'live-001', 'Turma B', '2025-01-12 19:00:00-03', '{}'),
('teste.turma.b@exemplo.com', 'live', 'participated', 'live-002', 'Turma B', '2025-01-19 19:00:00-03', '{}'),
('teste.turma.b@exemplo.com', 'gravada', 'watched', 'video-003', 'Turma B', '2025-01-16 15:20:00-03', '{}'),

-- Mais eventos para teste de fevereiro
('teste.turma.a@exemplo.com', 'essay_regular', 'submitted', 'tema-004', 'Turma A', '2025-02-05 13:00:00-03', '{"word_count": 780}'),
('teste.turma.a@exemplo.com', 'essay_simulado', 'submitted', 'tema-005', 'Turma A', '2025-02-12 10:45:00-03', '{"simulado_name": "Simulado ENEM 2"}'),
('teste.turma.a@exemplo.com', 'lousa', 'opened', 'lousa-003', 'Turma A', '2025-02-08 09:30:00-03', '{"source": "aluno"}'),
('teste.turma.a@exemplo.com', 'lousa', 'completed', 'lousa-003', 'Turma A', '2025-02-08 10:00:00-03', '{"chars": 520, "attachments": 0}'),
('teste.turma.a@exemplo.com', 'live', 'participated', 'live-003', 'Turma A', '2025-02-14 19:00:00-03', '{}');

-- Inserir perfis de teste se não existirem
INSERT INTO profiles (id, nome, email, turma, user_type, ativo) VALUES
(gen_random_uuid(), 'Aluno Teste A', 'teste.turma.a@exemplo.com', 'Turma A', 'aluno', true),
(gen_random_uuid(), 'Aluno Teste B', 'teste.turma.b@exemplo.com', 'Turma B', 'aluno', true)
ON CONFLICT (email) DO NOTHING;