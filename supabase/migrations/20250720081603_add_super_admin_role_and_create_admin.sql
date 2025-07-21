-- Add super_admin role to employee table and create admin user
-- 1. Drop existing role constraint and add new one with super_admin
ALTER TABLE employee DROP CONSTRAINT IF EXISTS employee_role_check;
ALTER TABLE employee ADD CONSTRAINT employee_role_check
  CHECK (role IN ('super_admin', 'admin', 'manager', 'employee'));

-- 2. Create default hospital/MSO for admin if not exists
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

-- 3. Create default department for admin
INSERT INTO department (
  id,
  name,
  hospital_id,
  description,
  created_at,
  updated_at
) VALUES (
  'a47ac10b-58cc-4372-a567-0e02b2c3d480',
  '시스템 관리부',
  'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  '시스템 전체 관리 및 운영',
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- 4. Create super admin employee record
INSERT INTO employee (
  id,
  name,
  email,
  department_id,
  hospital_id,
  role,
  position,
  status,
  phone,
  hire_date,
  created_at,
  updated_at
) VALUES (
  'b47ac10b-58cc-4372-a567-0e02b2c3d481',
  '최종관리자',
  'admin@mediconsol.com',
  'a47ac10b-58cc-4372-a567-0e02b2c3d480',
  'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  'super_admin',
  '최고관리자',
  'active',
  '02-1234-5678',
  CURRENT_DATE,
  NOW(),
  NOW()
) ON CONFLICT (email) DO UPDATE SET
  role = 'super_admin',
  position = '최고관리자',
  status = 'active',
  updated_at = NOW();