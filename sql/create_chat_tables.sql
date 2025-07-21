-- 채팅방 테이블 생성
CREATE TABLE IF NOT EXISTS chat_room (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL CHECK (type IN ('direct', 'group', 'department', 'project')),
    hospital_id UUID NOT NULL REFERENCES hospital(id),
    department_id UUID REFERENCES department(id),
    creator_id UUID NOT NULL REFERENCES employee(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 채팅방 참여자 테이블 생성
CREATE TABLE IF NOT EXISTS chat_room_participant (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    room_id UUID NOT NULL REFERENCES chat_room(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employee(id),
    role VARCHAR(50) NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    is_active BOOLEAN DEFAULT true,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_read_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(room_id, employee_id)
);

-- 메시지 테이블 생성
CREATE TABLE IF NOT EXISTS message (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    room_id UUID NOT NULL REFERENCES chat_room(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES employee(id),
    content TEXT NOT NULL,
    message_type VARCHAR(50) NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'file', 'image', 'system')),
    file_url TEXT,
    file_name TEXT,
    reply_to_id UUID REFERENCES message(id),
    is_edited BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 메시지 반응 테이블 생성
CREATE TABLE IF NOT EXISTS message_reaction (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    message_id UUID NOT NULL REFERENCES message(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employee(id),
    reaction VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(message_id, employee_id, reaction)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_chat_room_hospital_id ON chat_room(hospital_id);
CREATE INDEX IF NOT EXISTS idx_chat_room_creator_id ON chat_room(creator_id);
CREATE INDEX IF NOT EXISTS idx_chat_room_participant_room_id ON chat_room_participant(room_id);
CREATE INDEX IF NOT EXISTS idx_chat_room_participant_employee_id ON chat_room_participant(employee_id);
CREATE INDEX IF NOT EXISTS idx_message_room_id ON message(room_id);
CREATE INDEX IF NOT EXISTS idx_message_sender_id ON message(sender_id);
CREATE INDEX IF NOT EXISTS idx_message_created_at ON message(created_at);
CREATE INDEX IF NOT EXISTS idx_message_reaction_message_id ON message_reaction(message_id);

-- 업데이트 트리거 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 업데이트 트리거 생성
CREATE TRIGGER update_chat_room_updated_at BEFORE UPDATE ON chat_room
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_message_updated_at BEFORE UPDATE ON message
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS (Row Level Security) 활성화
ALTER TABLE chat_room ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_room_participant ENABLE ROW LEVEL SECURITY;
ALTER TABLE message ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reaction ENABLE ROW LEVEL SECURITY;

-- 기존 RLS 정책 삭제 (존재하는 경우)
DROP POLICY IF EXISTS "Users can view chat rooms they participate in" ON chat_room;
DROP POLICY IF EXISTS "Users can create chat rooms" ON chat_room;
DROP POLICY IF EXISTS "Room creators and admins can update chat rooms" ON chat_room;
DROP POLICY IF EXISTS "Users can view participants in their rooms" ON chat_room_participant;
DROP POLICY IF EXISTS "Room admins can manage participants" ON chat_room_participant;

-- 채팅방 RLS 정책 (무한 재귀 방지 버전)
CREATE POLICY "Users can view chat rooms they participate in" ON chat_room
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM chat_room_participant
            WHERE room_id = chat_room.id
            AND employee_id = auth.uid()
            AND is_active = true
        )
    );

CREATE POLICY "Users can create chat rooms" ON chat_room
    FOR INSERT WITH CHECK (creator_id = auth.uid());

CREATE POLICY "Room creators and admins can update chat rooms" ON chat_room
    FOR UPDATE USING (
        creator_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM chat_room_participant
            WHERE room_id = chat_room.id
            AND employee_id = auth.uid()
            AND role = 'admin'
            AND is_active = true
        )
    );

-- 채팅방 참여자 RLS 정책 (단순화된 버전)
CREATE POLICY "Users can view participants in their rooms" ON chat_room_participant
    FOR SELECT USING (
        employee_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM chat_room_participant cp2
            WHERE cp2.room_id = chat_room_participant.room_id
            AND cp2.employee_id = auth.uid()
            AND cp2.is_active = true
        )
    );

CREATE POLICY "Room creators can manage participants" ON chat_room_participant
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM chat_room
            WHERE id = room_id
            AND creator_id = auth.uid()
        )
    );

CREATE POLICY "Room admins can update participants" ON chat_room_participant
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM chat_room_participant cp2
            WHERE cp2.room_id = chat_room_participant.room_id
            AND cp2.employee_id = auth.uid()
            AND cp2.role = 'admin'
            AND cp2.is_active = true
        )
    );

CREATE POLICY "Room admins can delete participants" ON chat_room_participant
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM chat_room_participant cp2
            WHERE cp2.room_id = chat_room_participant.room_id
            AND cp2.employee_id = auth.uid()
            AND cp2.role = 'admin'
            AND cp2.is_active = true
        )
    );

-- 기존 메시지 정책 삭제
DROP POLICY IF EXISTS "Users can view messages in their rooms" ON message;
DROP POLICY IF EXISTS "Users can send messages to their rooms" ON message;
DROP POLICY IF EXISTS "Users can edit their own messages" ON message;
DROP POLICY IF EXISTS "Users can view reactions in their rooms" ON message_reaction;
DROP POLICY IF EXISTS "Users can manage their own reactions" ON message_reaction;

-- 메시지 RLS 정책 (단순화된 버전)
CREATE POLICY "Users can view messages in their rooms" ON message
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM chat_room_participant
            WHERE room_id = message.room_id
            AND employee_id = auth.uid()
            AND is_active = true
        )
    );

CREATE POLICY "Users can send messages to their rooms" ON message
    FOR INSERT WITH CHECK (
        sender_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM chat_room_participant
            WHERE room_id = message.room_id
            AND employee_id = auth.uid()
            AND is_active = true
        )
    );

CREATE POLICY "Users can edit their own messages" ON message
    FOR UPDATE USING (sender_id = auth.uid());

-- 메시지 반응 RLS 정책 (단순화된 버전)
CREATE POLICY "Users can view reactions in their rooms" ON message_reaction
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM message m
            JOIN chat_room_participant crp ON m.room_id = crp.room_id
            WHERE m.id = message_reaction.message_id
            AND crp.employee_id = auth.uid()
            AND crp.is_active = true
        )
    );

CREATE POLICY "Users can manage their own reactions" ON message_reaction
    FOR ALL USING (employee_id = auth.uid());

-- 실시간 구독을 위한 publication 생성
CREATE PUBLICATION chat_changes FOR TABLE message, chat_room_participant;

-- 샘플 데이터 삽입 (선택사항)
-- INSERT INTO chat_room (name, type, hospital_id, creator_id) VALUES 
-- ('전체 공지', 'group', (SELECT id FROM hospital LIMIT 1), (SELECT id FROM employee LIMIT 1));
