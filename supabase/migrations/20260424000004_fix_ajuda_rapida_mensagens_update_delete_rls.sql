-- Corrige bug: corretores e alunos não conseguiam editar/apagar mensagens
-- porque existiam apenas políticas de INSERT e SELECT — UPDATE e DELETE faltavam.

-- UPDATE: corretor pode editar suas próprias mensagens
CREATE POLICY "Corretores podem editar suas mensagens"
  ON public.ajuda_rapida_mensagens
  FOR UPDATE
  USING (
    autor = 'corretor'
    AND EXISTS (
      SELECT 1 FROM public.corretores
      WHERE corretores.id = ajuda_rapida_mensagens.corretor_id
        AND corretores.email = auth.email()
        AND corretores.ativo = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.corretores
      WHERE corretores.id = ajuda_rapida_mensagens.corretor_id
        AND corretores.email = auth.email()
        AND corretores.ativo = true
    )
  );

-- DELETE: corretor pode apagar suas próprias mensagens
CREATE POLICY "Corretores podem apagar suas mensagens"
  ON public.ajuda_rapida_mensagens
  FOR DELETE
  USING (
    autor = 'corretor'
    AND EXISTS (
      SELECT 1 FROM public.corretores
      WHERE corretores.id = ajuda_rapida_mensagens.corretor_id
        AND corretores.email = auth.email()
        AND corretores.ativo = true
    )
  );

-- UPDATE: aluno pode editar suas próprias mensagens
CREATE POLICY "Alunos podem editar suas mensagens"
  ON public.ajuda_rapida_mensagens
  FOR UPDATE
  USING (
    autor = 'aluno'
    AND (
      (EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
          AND profiles.user_type = 'aluno'
          AND profiles.id = ajuda_rapida_mensagens.aluno_id
      ))
      OR
      (auth.uid() IS NULL AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = ajuda_rapida_mensagens.aluno_id
          AND profiles.user_type = 'aluno'
      ))
    )
  )
  WITH CHECK (
    (EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.user_type = 'aluno'
        AND profiles.id = ajuda_rapida_mensagens.aluno_id
    ))
    OR
    (auth.uid() IS NULL AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = ajuda_rapida_mensagens.aluno_id
        AND profiles.user_type = 'aluno'
    ))
  );

-- DELETE: aluno pode apagar suas próprias mensagens
CREATE POLICY "Alunos podem apagar suas mensagens"
  ON public.ajuda_rapida_mensagens
  FOR DELETE
  USING (
    autor = 'aluno'
    AND (
      (EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
          AND profiles.user_type = 'aluno'
          AND profiles.id = ajuda_rapida_mensagens.aluno_id
      ))
      OR
      (auth.uid() IS NULL AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = ajuda_rapida_mensagens.aluno_id
          AND profiles.user_type = 'aluno'
      ))
    )
  );
