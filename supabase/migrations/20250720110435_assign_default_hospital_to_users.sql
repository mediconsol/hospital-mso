-- Assign default hospital to users without hospital_id
-- This migration handles existing users who don't have hospital assignment

-- First, ensure we have a default hospital (MediConsol 본사)
-- If it doesn't exist, create it
INSERT INTO hospital_or_mso (
  id,
  name,
  type,
  representative,
  contact_email,
  contact_phone,
  address,
  created_at,
  updated_at
) VALUES (
  'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  'MediConsol 본사',
  'mso',
  '관리자',
  'admin@mediconsol.com',
  '02-1234-5678',
  '서울특별시 강남구',
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Create default department if it doesn't exist
INSERT INTO department (
  id,
  name,
  hospital_id,
  description,
  created_at,
  updated_at
) VALUES (
  'a47ac10b-58cc-4372-a567-0e02b2c3d480',
  '일반부서',
  'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  '기본 부서',
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Create employee records for auth users who don't have employee records
-- This handles users who signed up but don't have employee records yet
INSERT INTO employee (
  name,
  email,
  hospital_id,
  department_id,
  role,
  status,
  auth_user_id,
  hire_date,
  created_at,
  updated_at
)
SELECT
  COALESCE(au.raw_user_meta_data->>'name', split_part(au.email, '@', 1)) as name,
  au.email,
  'f47ac10b-58cc-4372-a567-0e02b2c3d479' as hospital_id,
  'a47ac10b-58cc-4372-a567-0e02b2c3d480' as department_id,
  'employee' as role,
  'active' as status,
  au.id as auth_user_id,
  CURRENT_DATE as hire_date,
  NOW() as created_at,
  NOW() as updated_at
FROM auth.users au
LEFT JOIN employee e ON e.auth_user_id = au.id
WHERE e.id IS NULL  -- Only for users without employee records
  AND au.email IS NOT NULL
  AND au.email_confirmed_at IS NOT NULL;  -- Only confirmed users

-- Update existing employees who don't have hospital_id
UPDATE employee
SET
  hospital_id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  department_id = COALESCE(department_id, 'a47ac10b-58cc-4372-a567-0e02b2c3d480'),
  updated_at = NOW()
WHERE hospital_id IS NULL;