create table if not exists jarvis_bug_reports (
  id              uuid primary key default gen_random_uuid(),
  aluno_email     text not null,
  conversation_id uuid references jarvis_conversations(id) on delete set null,
  descricao       text not null,
  resolvido       boolean default false,
  created_at      timestamptz default now()
);

alter table jarvis_bug_reports enable row level security;

create policy "Autenticados podem inserir" on jarvis_bug_reports
  for insert with check (auth.uid() is not null);

create policy "Autenticados podem ler" on jarvis_bug_reports
  for select using (auth.uid() is not null);

create policy "Autenticados podem atualizar" on jarvis_bug_reports
  for update using (auth.uid() is not null);
