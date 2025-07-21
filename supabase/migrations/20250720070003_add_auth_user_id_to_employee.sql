-- Migration: 20250720070003_add_auth_user_id_to_employee
-- Add auth_user_id column to employee table to link with Supabase auth users
ALTER TABLE employee ADD COLUMN auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create unique index on auth_user_id to ensure one-to-one relationship
CREATE UNIQUE INDEX idx_employee_auth_user_id ON employee(auth_user_id);

-- Add index for better performance
CREATE INDEX idx_employee_auth_user_id_lookup ON employee(auth_user_id) WHERE auth_user_id IS NOT NULL;

-- Update RLS policy to allow users to see their own employee record
DROP POLICY IF EXISTS "Users can view employees in their hospital" ON employee;

CREATE POLICY "Users can view employees in their hospital" ON employee
  FOR SELECT
  USING (
    auth_user_id = auth.uid() OR 
    hospital_id IN (
      SELECT hospital_id FROM employee WHERE auth_user_id = auth.uid()
    )
  );

-- Policy for insert/update employee records
DROP POLICY IF EXISTS "Enable all operations for employee" ON employee;

CREATE POLICY "Users can manage employee records" ON employee
  FOR ALL
  USING (
    auth_user_id = auth.uid() OR 
    hospital_id IN (
      SELECT hospital_id FROM employee WHERE auth_user_id = auth.uid() AND role IN ('admin', 'manager')
    )
  )
  WITH CHECK (
    auth_user_id = auth.uid() OR 
    hospital_id IN (
      SELECT hospital_id FROM employee WHERE auth_user_id = auth.uid() AND role IN ('admin', 'manager')
    )
  );
