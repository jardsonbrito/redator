-- Corrigir inserção de perfis de teste com campo sobrenome obrigatório
INSERT INTO profiles (id, nome, sobrenome, email, turma, user_type, ativo) VALUES
(gen_random_uuid(), 'Aluno Teste', 'A', 'teste.turma.a@exemplo.com', 'Turma A', 'aluno', true),
(gen_random_uuid(), 'Aluno Teste', 'B', 'teste.turma.b@exemplo.com', 'Turma B', 'aluno', true)
ON CONFLICT (email) DO NOTHING;

-- Inserir eventos de teste
INSERT INTO student_feature_event (student_email, feature, action, entity_id, class_name, occurred_at, metadata) VALUES
-- Janeiro 2025 - Aluno Teste A
('teste.turma.a@exemplo.com', 'essay_regular', 'submitted', 'tema-001', 'Turma A', '2025-01-15 10:30:00-03', '{"word_count": 720}'),
('teste.turma.a@exemplo.com', 'essay_regular', 'submitted', 'tema-002', 'Turma A', '2025-01-20 14:15:00-03', '{"word_count": 850}'),
('teste.turma.a@exemplo.com', 'lousa', 'opened', 'lousa-001', 'Turma A', '2025-01-10 09:00:00-03', '{"source": "aluno"}'),
('teste.turma.a@exemplo.com', 'lousa', 'completed', 'lousa-001', 'Turma A', '2025-01-10 09:30:00-03', '{"chars": 450, "attachments": 0}'),
('teste.turma.a@exemplo.com', 'live', 'participated', 'live-001', 'Turma A', '2025-01-12 19:00:00-03', '{}'),
('teste.turma.a@exemplo.com', 'gravada', 'watched', 'video-001', 'Turma A', '2025-01-18 16:45:00-03', '{}'),
('teste.turma.a@exemplo.com', 'gravada', 'watched', 'video-002', 'Turma A', '2025-01-25 20:30:00-03', '{}'),

-- Janeiro 2025 - Aluno Teste B  
('teste.turma.b@exemplo.com', 'essay_simulado', 'submitted', 'tema-003', 'Turma B', '2025-01-22 11:00:00-03', '{"simulado_name": "Simulado ENEM 1"}'),
('teste.turma.b@exemplo.com', 'lousa', 'opened', 'lousa-002', 'Turma B', '2025-01-14 08:30:00-03', '{"source": "aluno"}'),
('teste.turma.b@exemplo.com', 'lousa', 'completed', 'lousa-002', 'Turma B', '2025-01-14 09:15:00-03', '{"chars": 380, "attachments": 0}'),
('teste.turma.b@exemplo.com', 'live', 'not_participated', 'live-001', 'Turma B', '2025-01-12 19:00:00-03', '{}'),
('teste.turma.b@exemplo.com', 'live', 'participated', 'live-002', 'Turma B', '2025-01-19 19:00:00-03', '{}'),
('teste.turma.b@exemplo.com', 'gravada', 'watched', 'video-003', 'Turma B', '2025-01-16 15:20:00-03', '{}'),

-- Agosto 2025 - Eventos atuais para teste
('teste.turma.a@exemplo.com', 'essay_regular', 'submitted', 'tema-004', 'Turma A', '2025-08-05 13:00:00-03', '{"word_count": 780}'),
('teste.turma.a@exemplo.com', 'essay_simulado', 'submitted', 'tema-005', 'Turma A', '2025-08-12 10:45:00-03', '{"simulado_name": "Simulado ENEM 2"}'),
('teste.turma.a@exemplo.com', 'lousa', 'opened', 'lousa-003', 'Turma A', '2025-08-08 09:30:00-03', '{"source": "aluno"}'),
('teste.turma.a@exemplo.com', 'lousa', 'completed', 'lousa-003', 'Turma A', '2025-08-08 10:00:00-03', '{"chars": 520, "attachments": 0}'),
('teste.turma.a@exemplo.com', 'live', 'participated', 'live-003', 'Turma A', '2025-08-14 19:00:00-03', '{}'),
('teste.turma.a@exemplo.com', 'gravada', 'watched', 'video-004', 'Turma A', '2025-08-18 16:30:00-03', '{}'),

('teste.turma.b@exemplo.com', 'essay_regular', 'submitted', 'tema-006', 'Turma B', '2025-08-10 11:20:00-03', '{"word_count": 650}'),
('teste.turma.b@exemplo.com', 'live', 'participated', 'live-003', 'Turma B', '2025-08-14 19:00:00-03', '{}'),
('teste.turma.b@exemplo.com', 'lousa', 'opened', 'lousa-004', 'Turma B', '2025-08-16 14:00:00-03', '{"source": "aluno"}'),
('teste.turma.b@exemplo.com', 'lousa', 'completed', 'lousa-004', 'Turma B', '2025-08-16 14:45:00-03', '{"chars": 420, "attachments": 0}')
ON CONFLICT DO NOTHING;