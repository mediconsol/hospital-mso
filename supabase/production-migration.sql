-- 프로덕션 환경 전체 마이그레이션
-- 모든 마이그레이션을 순서대로 실행

-- 1. 기본 스키마 (20250718_02_hospital_mso_schema.sql)
-- 병원/MSO 테이블
CREATE TABLE IF NOT EXISTS hospital_or_mso (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL DEFAULT 'hospital' CHECK (type IN ('hospital', 'mso')),
  registration_number VARCHAR(100),
  address TEXT,
  phone VARCHAR(20),
  email VARCHAR(255),
  website VARCHAR(255),
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 부서 테이블
CREATE TABLE IF NOT EXISTS department (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id UUID NOT NULL REFERENCES hospital_or_mso(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  manager_id UUID,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 직원 테이블
CREATE TABLE IF NOT EXISTS employee (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id UUID NOT NULL REFERENCES hospital_or_mso(id) ON DELETE CASCADE,
  department_id UUID REFERENCES department(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(20),
  position VARCHAR(100),
  role VARCHAR(50) NOT NULL DEFAULT 'employee' CHECK (role IN ('admin', 'manager', 'employee')),
  hire_date DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 업무 테이블
CREATE TABLE IF NOT EXISTS task (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id UUID NOT NULL REFERENCES hospital_or_mso(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  priority VARCHAR(50) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  creator_id UUID NOT NULL REFERENCES employee(id) ON DELETE CASCADE,
  assignee_id UUID REFERENCES employee(id) ON DELETE SET NULL,
  due_date TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 파일 테이블
CREATE TABLE IF NOT EXISTS file (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id UUID NOT NULL REFERENCES hospital_or_mso(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  original_name VARCHAR(255),
  file_path TEXT,
  file_size BIGINT,
  mime_type VARCHAR(100),
  owner_id UUID NOT NULL REFERENCES employee(id) ON DELETE CASCADE,
  is_public BOOLEAN DEFAULT false,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'deleted')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 일정 테이블
CREATE TABLE IF NOT EXISTS schedule (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id UUID NOT NULL REFERENCES hospital_or_mso(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  location VARCHAR(255),
  creator_id UUID NOT NULL REFERENCES employee(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 공지사항 테이블
CREATE TABLE IF NOT EXISTS announcement (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id UUID NOT NULL REFERENCES hospital_or_mso(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  author_id UUID NOT NULL REFERENCES employee(id) ON DELETE CASCADE,
  priority VARCHAR(50) NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  is_published BOOLEAN DEFAULT false,
  published_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 알림 테이블
CREATE TABLE IF NOT EXISTS notification (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id UUID NOT NULL REFERENCES hospital_or_mso(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES employee(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  message TEXT,
  type VARCHAR(50) NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'warning', 'error', 'success')),
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  related_entity_type VARCHAR(50),
  related_entity_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_employee_hospital_id ON employee(hospital_id);
CREATE INDEX IF NOT EXISTS idx_employee_department_id ON employee(department_id);
CREATE INDEX IF NOT EXISTS idx_employee_email ON employee(email);
CREATE INDEX IF NOT EXISTS idx_department_hospital_id ON department(hospital_id);
CREATE INDEX IF NOT EXISTS idx_task_hospital_id ON task(hospital_id);
CREATE INDEX IF NOT EXISTS idx_task_creator_id ON task(creator_id);
CREATE INDEX IF NOT EXISTS idx_task_assignee_id ON task(assignee_id);
CREATE INDEX IF NOT EXISTS idx_file_hospital_id ON file(hospital_id);
CREATE INDEX IF NOT EXISTS idx_file_owner_id ON file(owner_id);
CREATE INDEX IF NOT EXISTS idx_schedule_hospital_id ON schedule(hospital_id);
CREATE INDEX IF NOT EXISTS idx_schedule_creator_id ON schedule(creator_id);
CREATE INDEX IF NOT EXISTS idx_announcement_hospital_id ON announcement(hospital_id);
CREATE INDEX IF NOT EXISTS idx_announcement_author_id ON announcement(author_id);
CREATE INDEX IF NOT EXISTS idx_notification_hospital_id ON notification(hospital_id);
CREATE INDEX IF NOT EXISTS idx_notification_recipient_id ON notification(recipient_id);

-- RLS 활성화
ALTER TABLE hospital_or_mso ENABLE ROW LEVEL SECURITY;
ALTER TABLE department ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee ENABLE ROW LEVEL SECURITY;
ALTER TABLE task ENABLE ROW LEVEL SECURITY;
ALTER TABLE file ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcement ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification ENABLE ROW LEVEL SECURITY;

-- 2. Storage 설정 (20250718_03_storage_setup.sql)
INSERT INTO storage.buckets (id, name, public) VALUES ('files', 'files', false) ON CONFLICT DO NOTHING;

-- 3. Auth User ID 추가 (20250719_01_add_auth_user_id_to_employee.sql)
ALTER TABLE employee ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 인덱스 생성
DROP INDEX IF EXISTS idx_employee_auth_user_id;
CREATE UNIQUE INDEX idx_employee_auth_user_id ON employee(auth_user_id) WHERE auth_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_employee_auth_user_id_lookup ON employee(auth_user_id) WHERE auth_user_id IS NOT NULL;

-- 4. 메신저 시스템 (20250719_02_messenger_system.sql)
-- 채팅방 테이블
CREATE TABLE IF NOT EXISTS chat_room (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(50) NOT NULL DEFAULT 'group' CHECK (type IN ('direct', 'group', 'department')),
  hospital_id UUID NOT NULL REFERENCES hospital_or_mso(id) ON DELETE CASCADE,
  department_id UUID REFERENCES department(id) ON DELETE SET NULL,
  creator_id UUID NOT NULL REFERENCES employee(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 채팅방 참여자 테이블
CREATE TABLE IF NOT EXISTS chat_room_participant (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES chat_room(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employee(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  last_read_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  UNIQUE(room_id, employee_id)
);

-- 메시지 테이블
CREATE TABLE IF NOT EXISTS message (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES chat_room(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES employee(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  message_type VARCHAR(50) NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'file', 'image', 'system')),
  file_url TEXT,
  file_name VARCHAR(255),
  file_size BIGINT,
  reply_to_id UUID REFERENCES message(id) ON DELETE SET NULL,
  is_edited BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 메시지 반응 테이블
CREATE TABLE IF NOT EXISTS message_reaction (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES message(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employee(id) ON DELETE CASCADE,
  reaction VARCHAR(10) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(message_id, employee_id, reaction)
);

-- 메신저 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_chat_room_hospital_id ON chat_room(hospital_id);
CREATE INDEX IF NOT EXISTS idx_chat_room_type ON chat_room(type);
CREATE INDEX IF NOT EXISTS idx_chat_room_participant_room_id ON chat_room_participant(room_id);
CREATE INDEX IF NOT EXISTS idx_chat_room_participant_employee_id ON chat_room_participant(employee_id);
CREATE INDEX IF NOT EXISTS idx_message_room_id ON message(room_id);
CREATE INDEX IF NOT EXISTS idx_message_sender_id ON message(sender_id);
CREATE INDEX IF NOT EXISTS idx_message_created_at ON message(created_at);
CREATE INDEX IF NOT EXISTS idx_message_reaction_message_id ON message_reaction(message_id);

-- 메신저 RLS 활성화
ALTER TABLE chat_room ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_room_participant ENABLE ROW LEVEL SECURITY;
ALTER TABLE message ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reaction ENABLE ROW LEVEL SECURITY;

-- 5. RLS 정책 생성
-- Employee 정책
DROP POLICY IF EXISTS "Users can view employees in their hospital" ON employee;
CREATE POLICY "Users can view employees in their hospital" ON employee
  FOR SELECT
  USING (
    auth_user_id = auth.uid() OR 
    hospital_id IN (
      SELECT hospital_id FROM employee WHERE auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can manage employee records" ON employee;
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

-- 기본 정책들 (간단화된 버전)
CREATE POLICY "Enable all operations for authenticated users" ON hospital_or_mso FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Enable all operations for authenticated users" ON department FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Enable all operations for authenticated users" ON task FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Enable all operations for authenticated users" ON file FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Enable all operations for authenticated users" ON schedule FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Enable all operations for authenticated users" ON announcement FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Enable all operations for authenticated users" ON notification FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Enable all operations for authenticated users" ON chat_room FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Enable all operations for authenticated users" ON chat_room_participant FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Enable all operations for authenticated users" ON message FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Enable all operations for authenticated users" ON message_reaction FOR ALL USING (auth.uid() IS NOT NULL);

-- Storage 정책
CREATE POLICY "Enable all operations for authenticated users" ON storage.objects FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Enable all operations for authenticated users" ON storage.buckets FOR ALL USING (auth.uid() IS NOT NULL);