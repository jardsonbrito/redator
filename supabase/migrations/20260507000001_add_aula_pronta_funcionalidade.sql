-- Adiciona a funcionalidade "Aula Pronta" na tabela de funcionalidades do professor
-- Habilitado_professor = false por padrão (admin habilita em Dashboard > Assinatura > Professores)

INSERT INTO funcionalidades (chave, nome_exibicao, descricao, habilitado_professor, ordem_professor, ativo)
VALUES (
  'aula_pronta',
  'Aula Pronta',
  'Geração de planos de aula, quizzes e questões abertas com IA',
  false,
  12,
  true
)
ON CONFLICT (chave) DO NOTHING;
