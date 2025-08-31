-- Create gamification tables

-- Games table
CREATE TABLE public.games (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  template TEXT NOT NULL CHECK (template IN ('conectivos', 'desvios', 'intervencao')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  difficulty INTEGER NOT NULL DEFAULT 1 CHECK (difficulty >= 1 AND difficulty <= 5),
  competencies INTEGER[] NOT NULL DEFAULT '{}',
  tags TEXT[] NOT NULL DEFAULT '{}',
  start_at TIMESTAMP WITH TIME ZONE,
  end_at TIMESTAMP WITH TIME ZONE,
  allow_visitor BOOLEAN NOT NULL DEFAULT false,
  turmas_autorizadas TEXT[] NOT NULL DEFAULT '{}',
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Game levels (phases)
CREATE TABLE public.game_levels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  level_index INTEGER NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  payload JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(game_id, level_index)
);

-- Game plays (user sessions)
CREATE TABLE public.game_plays (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  level_id UUID NOT NULL REFERENCES public.game_levels(id) ON DELETE CASCADE,
  user_id UUID,
  student_email TEXT NOT NULL,
  student_name TEXT NOT NULL,
  student_class TEXT,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  finished_at TIMESTAMP WITH TIME ZONE,
  time_spent_seconds INTEGER,
  result JSONB,
  score_points INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_plays ENABLE ROW LEVEL SECURITY;

-- RLS Policies for games
CREATE POLICY "Admin can manage games" 
ON public.games 
FOR ALL 
USING (is_main_admin())
WITH CHECK (is_main_admin());

CREATE POLICY "Public can view published games" 
ON public.games 
FOR SELECT 
USING (status = 'published');

-- RLS Policies for game_levels
CREATE POLICY "Admin can manage game levels" 
ON public.game_levels 
FOR ALL 
USING (is_main_admin())
WITH CHECK (is_main_admin());

CREATE POLICY "Public can view published levels" 
ON public.game_levels 
FOR SELECT 
USING (status = 'published' AND EXISTS (
  SELECT 1 FROM public.games 
  WHERE games.id = game_levels.game_id 
  AND games.status = 'published'
));

-- RLS Policies for game_plays
CREATE POLICY "Admin can manage all plays" 
ON public.game_plays 
FOR ALL 
USING (is_main_admin())
WITH CHECK (is_main_admin());

CREATE POLICY "Users can insert their own plays" 
ON public.game_plays 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can view their own plays" 
ON public.game_plays 
FOR SELECT 
USING (true);

CREATE POLICY "Users can update their own plays" 
ON public.game_plays 
FOR UPDATE 
USING (true)
WITH CHECK (true);

-- Create indexes
CREATE INDEX idx_games_status ON public.games(status);
CREATE INDEX idx_games_template ON public.games(template);
CREATE INDEX idx_game_levels_game_id ON public.game_levels(game_id);
CREATE INDEX idx_game_plays_game_id ON public.game_plays(game_id);
CREATE INDEX idx_game_plays_student_email ON public.game_plays(student_email);
CREATE INDEX idx_game_plays_finished_at ON public.game_plays(finished_at);

-- Create update trigger for games
CREATE TRIGGER update_games_updated_at
BEFORE UPDATE ON public.games
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create update trigger for game_levels
CREATE TRIGGER update_game_levels_updated_at
BEFORE UPDATE ON public.game_levels
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();