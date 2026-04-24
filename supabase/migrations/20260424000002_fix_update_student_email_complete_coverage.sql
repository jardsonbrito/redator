-- Expande update_student_email para cobrir TODAS as tabelas que armazenam
-- email do aluno, evitando qualquer perda de histórico na troca de e-mail.
-- Mantém SECURITY DEFINER para bypassar RLS no INSERT em email_change_audit.
--
-- Tabelas adicionadas em relação à versão anterior:
-- redacoes_exercicio, presenca_participacao_diario, justificativas_ausencia,
-- avaliacoes_presenciais, game_plays, guias_tematicos_conclusoes,
-- inbox_recipients, micro_progresso, micro_analytics, micro_quiz_tentativas,
-- pep_consolidacao_erros, pep_erros_detectados, pep_historico_priorizacao,
-- pep_marcacoes_corretor, pep_tasks, ps_candidatos,
-- student_daily_activity, student_login_sessions

CREATE OR REPLACE FUNCTION public.update_student_email(current_email text, new_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  existing_user_id uuid;
  old_email TEXT;
  new_email_normalized TEXT;
  affected_tables_count integer := 0;
  audit_id uuid;
BEGIN
  old_email := LOWER(TRIM(current_email));
  new_email_normalized := LOWER(TRIM(new_email));

  SELECT id INTO existing_user_id
  FROM public.profiles
  WHERE email = old_email AND user_type = 'aluno';

  IF existing_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'email_not_found',
      'message', 'E-mail não encontrado no sistema');
  END IF;

  IF EXISTS (SELECT 1 FROM public.profiles
             WHERE email = new_email_normalized AND id != existing_user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'email_in_use',
      'message', 'O novo e-mail já está sendo usado por outro aluno');
  END IF;

  IF old_email = new_email_normalized THEN
    RETURN jsonb_build_object('success', false, 'error', 'same_email',
      'message', 'O novo e-mail deve ser diferente do atual');
  END IF;

  BEGIN
    -- 1. profiles (chave principal de autenticação)
    UPDATE public.profiles SET email = new_email_normalized, updated_at = now()
    WHERE id = existing_user_id;
    affected_tables_count := affected_tables_count + 1;

    -- 2. redacoes_enviadas
    UPDATE public.redacoes_enviadas SET email_aluno = new_email_normalized
    WHERE email_aluno = old_email;
    IF FOUND THEN affected_tables_count := affected_tables_count + 1; END IF;

    -- 3. redacoes_simulado
    UPDATE public.redacoes_simulado SET email_aluno = new_email_normalized
    WHERE email_aluno = old_email;
    IF FOUND THEN affected_tables_count := affected_tables_count + 1; END IF;

    -- 4. redacoes_exercicio
    UPDATE public.redacoes_exercicio SET email_aluno = new_email_normalized
    WHERE email_aluno = old_email;
    IF FOUND THEN affected_tables_count := affected_tables_count + 1; END IF;

    -- 5. presenca_aulas
    UPDATE public.presenca_aulas SET email_aluno = new_email_normalized
    WHERE email_aluno = old_email;
    IF FOUND THEN affected_tables_count := affected_tables_count + 1; END IF;

    -- 6. presenca_aulas_backup
    UPDATE public.presenca_aulas_backup SET email_aluno = new_email_normalized
    WHERE email_aluno = old_email;
    IF FOUND THEN affected_tables_count := affected_tables_count + 1; END IF;

    -- 7. presenca_audit_log
    UPDATE public.presenca_audit_log SET student_email = new_email_normalized
    WHERE student_email = old_email;
    IF FOUND THEN affected_tables_count := affected_tables_count + 1; END IF;

    -- 8. presenca_participacao_diario
    UPDATE public.presenca_participacao_diario SET aluno_email = new_email_normalized
    WHERE aluno_email = old_email;
    IF FOUND THEN affected_tables_count := affected_tables_count + 1; END IF;

    -- 9. justificativas_ausencia
    UPDATE public.justificativas_ausencia SET email_aluno = new_email_normalized
    WHERE email_aluno = old_email;
    IF FOUND THEN affected_tables_count := affected_tables_count + 1; END IF;

    -- 10. recorded_lesson_views
    UPDATE public.recorded_lesson_views SET student_email = new_email_normalized
    WHERE student_email = old_email;
    IF FOUND THEN affected_tables_count := affected_tables_count + 1; END IF;

    -- 11. radar_dados
    UPDATE public.radar_dados SET email_aluno = new_email_normalized
    WHERE email_aluno = old_email;
    IF FOUND THEN affected_tables_count := affected_tables_count + 1; END IF;

    -- 12. avisos_leitura
    UPDATE public.avisos_leitura SET email_aluno = new_email_normalized
    WHERE email_aluno = old_email;
    IF FOUND THEN affected_tables_count := affected_tables_count + 1; END IF;

    -- 13. lousa_resposta
    UPDATE public.lousa_resposta SET email_aluno = new_email_normalized
    WHERE email_aluno = old_email;
    IF FOUND THEN affected_tables_count := affected_tables_count + 1; END IF;

    -- 14. redacao_devolucao_visualizacoes
    UPDATE public.redacao_devolucao_visualizacoes SET email_aluno = new_email_normalized
    WHERE email_aluno = old_email;
    IF FOUND THEN affected_tables_count := affected_tables_count + 1; END IF;

    -- 15. avaliacoes_presenciais
    UPDATE public.avaliacoes_presenciais SET aluno_email = new_email_normalized
    WHERE aluno_email = old_email;
    IF FOUND THEN affected_tables_count := affected_tables_count + 1; END IF;

    -- 16. game_plays (gamificação)
    UPDATE public.game_plays SET student_email = new_email_normalized
    WHERE student_email = old_email;
    IF FOUND THEN affected_tables_count := affected_tables_count + 1; END IF;

    -- 17. guias_tematicos_conclusoes
    UPDATE public.guias_tematicos_conclusoes SET aluno_email = new_email_normalized
    WHERE aluno_email = old_email;
    IF FOUND THEN affected_tables_count := affected_tables_count + 1; END IF;

    -- 18. inbox_recipients (mensagens)
    UPDATE public.inbox_recipients SET student_email = new_email_normalized
    WHERE student_email = old_email;
    IF FOUND THEN affected_tables_count := affected_tables_count + 1; END IF;

    -- 19. micro_progresso
    UPDATE public.micro_progresso SET email_aluno = new_email_normalized
    WHERE email_aluno = old_email;
    IF FOUND THEN affected_tables_count := affected_tables_count + 1; END IF;

    -- 20. micro_analytics
    UPDATE public.micro_analytics SET email_aluno = new_email_normalized
    WHERE email_aluno = old_email;
    IF FOUND THEN affected_tables_count := affected_tables_count + 1; END IF;

    -- 21. micro_quiz_tentativas
    UPDATE public.micro_quiz_tentativas SET email_aluno = new_email_normalized
    WHERE email_aluno = old_email;
    IF FOUND THEN affected_tables_count := affected_tables_count + 1; END IF;

    -- 22. pep_consolidacao_erros
    UPDATE public.pep_consolidacao_erros SET aluno_email = new_email_normalized
    WHERE aluno_email = old_email;
    IF FOUND THEN affected_tables_count := affected_tables_count + 1; END IF;

    -- 23. pep_erros_detectados
    UPDATE public.pep_erros_detectados SET aluno_email = new_email_normalized
    WHERE aluno_email = old_email;
    IF FOUND THEN affected_tables_count := affected_tables_count + 1; END IF;

    -- 24. pep_historico_priorizacao
    UPDATE public.pep_historico_priorizacao SET aluno_email = new_email_normalized
    WHERE aluno_email = old_email;
    IF FOUND THEN affected_tables_count := affected_tables_count + 1; END IF;

    -- 25. pep_marcacoes_corretor
    UPDATE public.pep_marcacoes_corretor SET aluno_email = new_email_normalized
    WHERE aluno_email = old_email;
    IF FOUND THEN affected_tables_count := affected_tables_count + 1; END IF;

    -- 26. pep_tasks
    UPDATE public.pep_tasks SET aluno_email = new_email_normalized
    WHERE aluno_email = old_email;
    IF FOUND THEN affected_tables_count := affected_tables_count + 1; END IF;

    -- 27. ps_candidatos (processo seletivo)
    UPDATE public.ps_candidatos SET email_aluno = new_email_normalized
    WHERE email_aluno = old_email;
    IF FOUND THEN affected_tables_count := affected_tables_count + 1; END IF;

    -- 28. student_feature_event
    UPDATE public.student_feature_event SET student_email = new_email_normalized
    WHERE student_email = old_email;
    IF FOUND THEN affected_tables_count := affected_tables_count + 1; END IF;

    -- 29. student_session_tokens
    UPDATE public.student_session_tokens SET student_email = new_email_normalized
    WHERE student_email = old_email;
    IF FOUND THEN affected_tables_count := affected_tables_count + 1; END IF;

    -- 30. student_login_sessions
    UPDATE public.student_login_sessions SET student_email = new_email_normalized
    WHERE student_email = old_email;
    IF FOUND THEN affected_tables_count := affected_tables_count + 1; END IF;

    -- 31. student_daily_activity
    UPDATE public.student_daily_activity SET student_email = new_email_normalized
    WHERE student_email = old_email;
    IF FOUND THEN affected_tables_count := affected_tables_count + 1; END IF;

    -- 32. Registrar na auditoria
    INSERT INTO public.email_change_audit (
      user_id, old_email, new_email, affected_tables_count
    ) VALUES (
      existing_user_id, old_email, new_email_normalized, affected_tables_count
    ) RETURNING id INTO audit_id;

    RETURN jsonb_build_object(
      'success', true,
      'message', 'E-mail atualizado com sucesso e histórico preservado',
      'affected_tables', affected_tables_count,
      'old_email', old_email,
      'new_email', new_email_normalized,
      'user_id', existing_user_id,
      'audit_id', audit_id
    );

  EXCEPTION
    WHEN OTHERS THEN
      RAISE;
  END;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.update_student_email(text, text) TO anon, authenticated;
