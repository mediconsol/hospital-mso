-- Drop existing todos table if exists
DROP TABLE IF EXISTS todos;

-- Create HospitalOrMSO table
CREATE TABLE hospital_or_mso (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  logo_url TEXT,
  type VARCHAR(50) NOT NULL CHECK (type IN ('hospital', 'mso')),
  representative VARCHAR(255),
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create Department table
CREATE TABLE department (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  parent_id UUID REFERENCES department(id) ON DELETE CASCADE,
  hospital_id UUID NOT NULL REFERENCES hospital_or_mso(id) ON DELETE CASCADE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create Employee table
CREATE TABLE employee (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  department_id UUID REFERENCES department(id) ON DELETE SET NULL,
  hospital_id UUID NOT NULL REFERENCES hospital_or_mso(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL DEFAULT 'employee' CHECK (role IN ('admin', 'manager', 'employee')),
  position VARCHAR(255),
  status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'resigned')),
  phone VARCHAR(50),
  hire_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create Task table
CREATE TABLE task (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  priority VARCHAR(50) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  assignee_id UUID REFERENCES employee(id) ON DELETE SET NULL,
  creator_id UUID NOT NULL REFERENCES employee(id) ON DELETE CASCADE,
  department_id UUID REFERENCES department(id) ON DELETE SET NULL,
  hospital_id UUID NOT NULL REFERENCES hospital_or_mso(id) ON DELETE CASCADE,
  due_date TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create File table
CREATE TABLE file (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  filename VARCHAR(255) NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL,
  file_size BIGINT,
  mime_type VARCHAR(255),
  owner_id UUID NOT NULL REFERENCES employee(id) ON DELETE CASCADE,
  hospital_id UUID NOT NULL REFERENCES hospital_or_mso(id) ON DELETE CASCADE,
  department_id UUID REFERENCES department(id) ON DELETE SET NULL,
  task_id UUID REFERENCES task(id) ON DELETE CASCADE,
  permissions JSONB DEFAULT '{"public": false, "departments": [], "employees": []}'::jsonb,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create Schedule table
CREATE TABLE schedule (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  location VARCHAR(255),
  is_all_day BOOLEAN DEFAULT false,
  hospital_id UUID NOT NULL REFERENCES hospital_or_mso(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES employee(id) ON DELETE CASCADE,
  participants JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create Notification table
CREATE TABLE notification (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type VARCHAR(50) NOT NULL CHECK (type IN ('task', 'schedule', 'file', 'system', 'announcement')),
  user_id UUID NOT NULL REFERENCES employee(id) ON DELETE CASCADE,
  hospital_id UUID NOT NULL REFERENCES hospital_or_mso(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  related_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for better performance
CREATE INDEX idx_department_hospital_id ON department(hospital_id);
CREATE INDEX idx_department_parent_id ON department(parent_id);
CREATE INDEX idx_employee_hospital_id ON employee(hospital_id);
CREATE INDEX idx_employee_department_id ON employee(department_id);
CREATE INDEX idx_employee_email ON employee(email);
CREATE INDEX idx_task_hospital_id ON task(hospital_id);
CREATE INDEX idx_task_assignee_id ON task(assignee_id);
CREATE INDEX idx_task_status ON task(status);
CREATE INDEX idx_task_due_date ON task(due_date);
CREATE INDEX idx_file_hospital_id ON file(hospital_id);
CREATE INDEX idx_file_owner_id ON file(owner_id);
CREATE INDEX idx_file_task_id ON file(task_id);
CREATE INDEX idx_schedule_hospital_id ON schedule(hospital_id);
CREATE INDEX idx_schedule_start_time ON schedule(start_time);
CREATE INDEX idx_notification_user_id ON notification(user_id);
CREATE INDEX idx_notification_hospital_id ON notification(hospital_id);
CREATE INDEX idx_notification_is_read ON notification(is_read);

-- Enable RLS (Row Level Security)
ALTER TABLE hospital_or_mso ENABLE ROW LEVEL SECURITY;
ALTER TABLE department ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee ENABLE ROW LEVEL SECURITY;
ALTER TABLE task ENABLE ROW LEVEL SECURITY;
ALTER TABLE file ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (basic - can be refined based on requirements)
CREATE POLICY "Users can view their hospital data" ON hospital_or_mso
  FOR SELECT
  USING (true);

CREATE POLICY "Users can view departments in their hospital" ON department
  FOR SELECT
  USING (true);

CREATE POLICY "Users can view employees in their hospital" ON employee
  FOR SELECT
  USING (true);

CREATE POLICY "Users can view tasks in their hospital" ON task
  FOR SELECT
  USING (true);

CREATE POLICY "Users can view files in their hospital" ON file
  FOR SELECT
  USING (true);

CREATE POLICY "Users can view schedules in their hospital" ON schedule
  FOR SELECT
  USING (true);

CREATE POLICY "Users can view their notifications" ON notification
  FOR SELECT
  USING (true);

-- Create policies for insert/update/delete (can be refined based on roles)
CREATE POLICY "Enable all operations for hospital_or_mso" ON hospital_or_mso
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable all operations for department" ON department
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable all operations for employee" ON employee
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable all operations for task" ON task
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable all operations for file" ON file
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable all operations for schedule" ON schedule
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable all operations for notification" ON notification
  FOR ALL
  USING (true)
  WITH CHECK (true);