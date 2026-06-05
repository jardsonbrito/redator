alter table jarvis_sessoes_sintetizadas
  add column if not exists avaliacao_aluno integer check (avaliacao_aluno between 1 and 5);
