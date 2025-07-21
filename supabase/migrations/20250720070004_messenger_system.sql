-- Migration: 20250720070004_messenger_system
-- 채팅방 테이블
CREATE TABLE chat_room (
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
CREATE TABLE chat_room_participant (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES chat_room(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employee(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  last_read_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  UNIQUE(room_id, employee_id)
);

-- 메시지 테이블
CREATE TABLE message (
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
CREATE TABLE message_reaction (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES message(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employee(id) ON DELETE CASCADE,
  reaction VARCHAR(10) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(message_id, employee_id, reaction)
);

-- 인덱스 생성
CREATE INDEX idx_chat_room_hospital_id ON chat_room(hospital_id);
CREATE INDEX idx_chat_room_type ON chat_room(type);
CREATE INDEX idx_chat_room_participant_room_id ON chat_room_participant(room_id);
CREATE INDEX idx_chat_room_participant_employee_id ON chat_room_participant(employee_id);
CREATE INDEX idx_message_room_id ON message(room_id);
CREATE INDEX idx_message_sender_id ON message(sender_id);
CREATE INDEX idx_message_created_at ON message(created_at);
CREATE INDEX idx_message_reaction_message_id ON message_reaction(message_id);

-- RLS 정책 활성화
ALTER TABLE chat_room ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_room_participant ENABLE ROW LEVEL SECURITY;
ALTER TABLE message ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reaction ENABLE ROW LEVEL SECURITY;

-- RLS 정책 생성 (채팅방)
CREATE POLICY "Users can view chat rooms they participate in" ON chat_room
  FOR SELECT
  USING (
    id IN (
      SELECT room_id FROM chat_room_participant 
      WHERE employee_id IN (
        SELECT id FROM employee WHERE auth_user_id = auth.uid()
      ) AND is_active = true
    )
  );

CREATE POLICY "Users can create chat rooms in their hospital" ON chat_room
  FOR INSERT
  WITH CHECK (
    hospital_id IN (
      SELECT hospital_id FROM employee WHERE auth_user_id = auth.uid()
    )
  );

-- RLS 정책 생성 (참여자)
CREATE POLICY "Users can view participants in their chat rooms" ON chat_room_participant
  FOR SELECT
  USING (
    room_id IN (
      SELECT room_id FROM chat_room_participant 
      WHERE employee_id IN (
        SELECT id FROM employee WHERE auth_user_id = auth.uid()
      ) AND is_active = true
    )
  );

CREATE POLICY "Users can manage participants in chat rooms they created" ON chat_room_participant
  FOR ALL
  USING (
    room_id IN (
      SELECT id FROM chat_room 
      WHERE creator_id IN (
        SELECT id FROM employee WHERE auth_user_id = auth.uid()
      )
    )
  );

-- RLS 정책 생성 (메시지)
CREATE POLICY "Users can view messages in their chat rooms" ON message
  FOR SELECT
  USING (
    room_id IN (
      SELECT room_id FROM chat_room_participant 
      WHERE employee_id IN (
        SELECT id FROM employee WHERE auth_user_id = auth.uid()
      ) AND is_active = true
    )
  );

CREATE POLICY "Users can send messages to their chat rooms" ON message
  FOR INSERT
  WITH CHECK (
    room_id IN (
      SELECT room_id FROM chat_room_participant 
      WHERE employee_id IN (
        SELECT id FROM employee WHERE auth_user_id = auth.uid()
      ) AND is_active = true
    ) AND
    sender_id IN (
      SELECT id FROM employee WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can edit their own messages" ON message
  FOR UPDATE
  USING (
    sender_id IN (
      SELECT id FROM employee WHERE auth_user_id = auth.uid()
    )
  );

-- RLS 정책 생성 (반응)
CREATE POLICY "Users can view reactions in their chat rooms" ON message_reaction
  FOR SELECT
  USING (
    message_id IN (
      SELECT id FROM message WHERE room_id IN (
        SELECT room_id FROM chat_room_participant 
        WHERE employee_id IN (
          SELECT id FROM employee WHERE auth_user_id = auth.uid()
        ) AND is_active = true
      )
    )
  );

CREATE POLICY "Users can manage their own reactions" ON message_reaction
  FOR ALL
  USING (
    employee_id IN (
      SELECT id FROM employee WHERE auth_user_id = auth.uid()
    )
  );
