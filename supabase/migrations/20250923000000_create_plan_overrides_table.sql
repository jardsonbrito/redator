-- Create plan_overrides table for student plan customizations
CREATE TABLE plan_overrides (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  functionality TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

  -- Ensure each student has unique functionality overrides
  UNIQUE(student_id, functionality)
);

-- Create index for performance
CREATE INDEX idx_plan_overrides_student_id ON plan_overrides(student_id);
CREATE INDEX idx_plan_overrides_functionality ON plan_overrides(functionality);

-- Enable RLS
ALTER TABLE plan_overrides ENABLE ROW LEVEL SECURITY;

-- RLS policies
-- Admins can view and manage all overrides
CREATE POLICY "Admins can view plan overrides" ON plan_overrides
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'admin'
      AND profiles.ativo = true
    )
  );

CREATE POLICY "Admins can insert plan overrides" ON plan_overrides
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'admin'
      AND profiles.ativo = true
    )
  );

CREATE POLICY "Admins can update plan overrides" ON plan_overrides
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'admin'
      AND profiles.ativo = true
    )
  );

CREATE POLICY "Admins can delete plan overrides" ON plan_overrides
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'admin'
      AND profiles.ativo = true
    )
  );

-- Students can view their own overrides
CREATE POLICY "Students can view own plan overrides" ON plan_overrides
  FOR SELECT
  USING (
    student_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'aluno'
      AND profiles.ativo = true
    )
  );

-- Function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_plan_overrides_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at
CREATE TRIGGER plan_overrides_updated_at
  BEFORE UPDATE ON plan_overrides
  FOR EACH ROW
  EXECUTE FUNCTION update_plan_overrides_updated_at();

-- Grant necessary permissions
GRANT ALL ON plan_overrides TO authenticated;
GRANT ALL ON plan_overrides TO service_role;

-- RPC function to get student plan overrides (bypasses RLS)
CREATE OR REPLACE FUNCTION get_student_plan_overrides(student_uuid UUID)
RETURNS TABLE (
  id UUID,
  student_id UUID,
  functionality TEXT,
  enabled BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    po.id,
    po.student_id,
    po.functionality,
    po.enabled,
    po.created_at,
    po.updated_at
  FROM plan_overrides po
  WHERE po.student_id = student_uuid;
END;
$$;

-- RPC function to save student plan overrides (bypasses RLS)
CREATE OR REPLACE FUNCTION save_student_plan_overrides(
  student_uuid UUID,
  overrides_data JSONB
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  override_item JSONB;
BEGIN
  -- Delete existing overrides for this student
  DELETE FROM plan_overrides WHERE student_id = student_uuid;

  -- Insert new overrides
  FOR override_item IN SELECT jsonb_array_elements(overrides_data)
  LOOP
    INSERT INTO plan_overrides (student_id, functionality, enabled)
    VALUES (
      student_uuid,
      override_item->>'functionality',
      (override_item->>'enabled')::BOOLEAN
    );
  END LOOP;

  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$;

-- Grant execute permissions on RPC functions
GRANT EXECUTE ON FUNCTION get_student_plan_overrides(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_student_plan_overrides(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION save_student_plan_overrides(UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION save_student_plan_overrides(UUID, JSONB) TO service_role;