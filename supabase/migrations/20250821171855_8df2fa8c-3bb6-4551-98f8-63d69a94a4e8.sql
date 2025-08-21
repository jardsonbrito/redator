-- Inserir dados diretamente na tabela recorded_lesson_views
INSERT INTO public.recorded_lesson_views (
  lesson_id,
  user_id,
  student_email,
  student_name,
  first_watched_at,
  created_at
) VALUES 
  ('f0bafc18-f984-4639-b6ca-7465f8964205', 'bff4f388-b83b-4c35-8a85-6f7ba7263ee2', 'anajuliafreitas11222@gmail.com', 'Antônia Ana Julia Freitas do Carmo', '2025-08-21 16:46:22.442623+00', now()),
  ('36053dde-6b74-46cb-a5ce-ae910e168a69', 'bff4f388-b83b-4c35-8a85-6f7ba7263ee2', 'anajuliafreitas11222@gmail.com', 'Antônia Ana Julia Freitas do Carmo', '2025-08-21 16:46:13.134093+00', now()),
  ('fe052167-0773-42f9-8036-950e7bbbf736', 'bff4f388-b83b-4c35-8a85-6f7ba7263ee2', 'anajuliafreitas11222@gmail.com', 'Antônia Ana Julia Freitas do Carmo', '2025-08-21 16:46:02.97588+00', now()),
  ('b334e6b2-6f42-4f93-b773-731e714fd88a', 'bff4f388-b83b-4c35-8a85-6f7ba7263ee2', 'anajuliafreitas11222@gmail.com', 'Antônia Ana Julia Freitas do Carmo', '2025-08-21 16:45:47.514465+00', now()),
  ('5e6412f6-0ff7-43f6-857b-0c0fd76abd71', 'bff4f388-b83b-4c35-8a85-6f7ba7263ee2', 'anajuliafreitas11222@gmail.com', 'Antônia Ana Julia Freitas do Carmo', '2025-08-21 16:38:54.1718+00', now()),
  ('d6e7dc77-b2e3-473a-bf5d-15286361a176', 'bff4f388-b83b-4c35-8a85-6f7ba7263ee2', 'anajuliafreitas11222@gmail.com', 'Antônia Ana Julia Freitas do Carmo', '2025-08-21 16:38:10.314238+00', now()),
  ('6acecc30-267e-4ade-a714-7eb81203d545', 'bff4f388-b83b-4c35-8a85-6f7ba7263ee2', 'anajuliafreitas11222@gmail.com', 'Antônia Ana Julia Freitas do Carmo', '2025-08-21 16:34:06.794843+00', now())
ON CONFLICT (lesson_id, user_id) DO NOTHING;