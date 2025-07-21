-- Allow auth_user_id update for connecting authentication
-- This policy allows users to update their own auth_user_id when connecting their account

-- Drop existing policy that might be too restrictive
DROP POLICY IF EXISTS "Allow users to update their own employee record" ON employee;

-- Create a more specific policy for auth_user_id updates
CREATE POLICY "Allow auth_user_id self-connection" ON employee
  FOR UPDATE
  TO authenticated
  USING (
    -- Allow if the user is updating their own record based on email match
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
  WITH CHECK (
    -- Allow if the user is updating their own record based on email match
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Also allow users to update their own employee record after auth_user_id is set
CREATE POLICY "Allow users to update their own employee record" ON employee
  FOR UPDATE
  TO authenticated
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());

-- Allow anonymous users to update auth_user_id for initial connection
-- This is needed for the case where employee record exists but auth_user_id is null
CREATE POLICY "Allow initial auth_user_id connection" ON employee
  FOR UPDATE
  TO authenticated
  USING (
    auth_user_id IS NULL
    AND email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
  WITH CHECK (
    auth_user_id IS NULL
    AND email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );