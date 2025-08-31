-- Atualizar game_levels existentes para status published
UPDATE game_levels 
SET status = 'published' 
WHERE status = 'draft';