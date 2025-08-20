-- Corrigir a função do trigger para lousas
CREATE OR REPLACE FUNCTION public.fn_lousa_push_radar()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'graded' AND COALESCE(OLD.status,'') <> 'graded' THEN
    INSERT INTO public.radar_dados (
      nome_aluno, 
      email_aluno, 
      turma, 
      titulo_exercicio, 
      nota, 
      data_realizacao,
      exercicio_id,
      created_at,
      updated_at
    )
    VALUES (
      NEW.nome_aluno,
      NEW.email_aluno, 
      NEW.turma, 
      (SELECT 'Lousa: ' || titulo FROM public.lousa WHERE id = NEW.lousa_id),
      COALESCE(NEW.nota, 0),
      CURRENT_DATE,
      NULL, -- Deixar exercicio_id como NULL para lousas
      now(),
      now()
    )
    ON CONFLICT (email_aluno, titulo_exercicio, data_realizacao)
    DO UPDATE SET 
      nota = EXCLUDED.nota,
      updated_at = EXCLUDED.updated_at;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;