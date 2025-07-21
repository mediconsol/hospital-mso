-- 무한 재귀 완전 해결 - 깨끗한 버전
-- 모든 정책을 삭제하고 단순한 형태로 재생성

-- 1. 모든 기존 정책 완전 삭제
DROP POLICY IF EXISTS "Users can view chat rooms they participate in" ON chat_room;
DROP POLICY IF EXISTS "Users can create chat rooms" ON chat_room;
DROP POLICY IF EXISTS "Room creators and admins can update chat rooms" ON chat_room;
DROP POLICY IF EXISTS "chat_room_select" ON chat_room;
DROP POLICY IF EXISTS "chat_room_insert" ON chat_room;
DROP POLICY IF EXISTS "chat_room_update" ON chat_room;

DROP POLICY IF EXISTS "Users can view participants in their rooms" ON chat_room_participant;
DROP POLICY IF EXISTS "Room admins can manage participants" ON chat_room_participant;
DROP POLICY IF EXISTS "participant_select" ON chat_room_participant;
DROP POLICY IF EXISTS "participant_insert" ON chat_room_participant;
DROP POLICY IF EXISTS "participant_update" ON chat_room_participant;

DROP POLICY IF EXISTS "Users can view messages in their rooms" ON message;
DROP POLICY IF EXISTS "Users can send messages to their rooms" ON message;
DROP POLICY IF EXISTS "Users can edit their own messages" ON message;
DROP POLICY IF EXISTS "message_select" ON message;
DROP POLICY IF EXISTS "message_insert" ON message;
DROP POLICY IF EXISTS "message_update" ON message;

DROP POLICY IF EXISTS "Users can view reactions in their rooms" ON message_reaction;
DROP POLICY IF EXISTS "Users can manage their own reactions" ON message_reaction;
DROP POLICY IF EXISTS "reaction_select" ON message_reaction;
DROP POLICY IF EXISTS "reaction_all" ON message_reaction;
DROP POLICY IF EXISTS "reaction_insert" ON message_reaction;
DROP POLICY IF EXISTS "reaction_update" ON message_reaction;
DROP POLICY IF EXISTS "reaction_delete" ON message_reaction;

-- 2. RLS 비활성화 후 재활성화
ALTER TABLE chat_room DISABLE ROW LEVEL SECURITY;
ALTER TABLE chat_room_participant DISABLE ROW LEVEL SECURITY;
ALTER TABLE message DISABLE ROW LEVEL SECURITY;
ALTER TABLE message_reaction DISABLE ROW LEVEL SECURITY;

ALTER TABLE chat_room ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_room_participant ENABLE ROW LEVEL SECURITY;
ALTER TABLE message ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reaction ENABLE ROW LEVEL SECURITY;

-- 3. 단순한 정책 생성

-- 채팅방 정책
CREATE POLICY "simple_chat_room_select" ON chat_room
    FOR SELECT USING (
        creator_id = auth.uid() OR
        id IN (
            SELECT DISTINCT room_id 
            FROM chat_room_participant 
            WHERE employee_id = auth.uid() AND is_active = true
        )
    );

CREATE POLICY "simple_chat_room_insert" ON chat_room
    FOR INSERT WITH CHECK (creator_id = auth.uid());

CREATE POLICY "simple_chat_room_update" ON chat_room
    FOR UPDATE USING (creator_id = auth.uid());

-- 참여자 정책
CREATE POLICY "simple_participant_select" ON chat_room_participant
    FOR SELECT USING (
        employee_id = auth.uid() OR
        room_id IN (
            SELECT id FROM chat_room WHERE creator_id = auth.uid()
        )
    );

CREATE POLICY "simple_participant_insert" ON chat_room_participant
    FOR INSERT WITH CHECK (
        room_id IN (
            SELECT id FROM chat_room WHERE creator_id = auth.uid()
        )
    );

CREATE POLICY "simple_participant_update" ON chat_room_participant
    FOR UPDATE USING (
        employee_id = auth.uid() OR
        room_id IN (
            SELECT id FROM chat_room WHERE creator_id = auth.uid()
        )
    );

CREATE POLICY "simple_participant_delete" ON chat_room_participant
    FOR DELETE USING (
        room_id IN (
            SELECT id FROM chat_room WHERE creator_id = auth.uid()
        )
    );

-- 메시지 정책
CREATE POLICY "simple_message_select" ON message
    FOR SELECT USING (
        sender_id = auth.uid() OR
        room_id IN (
            SELECT DISTINCT room_id 
            FROM chat_room_participant 
            WHERE employee_id = auth.uid() AND is_active = true
        )
    );

CREATE POLICY "simple_message_insert" ON message
    FOR INSERT WITH CHECK (
        sender_id = auth.uid() AND
        room_id IN (
            SELECT DISTINCT room_id 
            FROM chat_room_participant 
            WHERE employee_id = auth.uid() AND is_active = true
        )
    );

CREATE POLICY "simple_message_update" ON message
    FOR UPDATE USING (sender_id = auth.uid());

-- 메시지 반응 정책
CREATE POLICY "simple_reaction_select" ON message_reaction
    FOR SELECT USING (
        employee_id = auth.uid() OR
        message_id IN (
            SELECT id FROM message WHERE sender_id = auth.uid()
        )
    );

CREATE POLICY "simple_reaction_insert" ON message_reaction
    FOR INSERT WITH CHECK (employee_id = auth.uid());

CREATE POLICY "simple_reaction_update" ON message_reaction
    FOR UPDATE USING (employee_id = auth.uid());

CREATE POLICY "simple_reaction_delete" ON message_reaction
    FOR DELETE USING (employee_id = auth.uid());

-- 4. 정책 확인
SELECT schemaname, tablename, policyname, cmd 
FROM pg_policies 
WHERE tablename IN ('chat_room', 'chat_room_participant', 'message', 'message_reaction')
ORDER BY tablename, policyname;
