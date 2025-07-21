-- Fix employee invite RLS policies
-- Drop existing policies
DROP POLICY IF EXISTS "Allow authenticated users to insert employees" ON employee;
DROP POLICY IF EXISTS "Allow authenticated users to update employees" ON employee;
DROP POLICY IF EXISTS "Allow authenticated users to delete employees" ON employee;

-- Create more specific policies for employee management
-- Only admins and super_admins can insert new employees
CREATE POLICY "Allow admins to insert employees" ON employee
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM employee
      WHERE auth_user_id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

-- Only admins and super_admins can update employees in their hospital
CREATE POLICY "Allow admins to update employees" ON employee
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employee emp
      WHERE emp.auth_user_id = auth.uid()
      AND emp.role IN ('admin', 'super_admin')
      AND (
        emp.role = 'super_admin' OR
        emp.hospital_id = employee.hospital_id
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM employee emp
      WHERE emp.auth_user_id = auth.uid()
      AND emp.role IN ('admin', 'super_admin')
      AND (
        emp.role = 'super_admin' OR
        emp.hospital_id = employee.hospital_id
      )
    )
  );

-- Only admins and super_admins can delete employees in their hospital
CREATE POLICY "Allow admins to delete employees" ON employee
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM employee emp
      WHERE emp.auth_user_id = auth.uid()
      AND emp.role IN ('admin', 'super_admin')
      AND (
        emp.role = 'super_admin' OR
        emp.hospital_id = employee.hospital_id
      )
    )
  );

-- Allow users to update their own employee record
CREATE POLICY "Allow users to update their own employee record" ON employee
  FOR UPDATE
  TO authenticated
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());