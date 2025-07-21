-- 채팅 시스템 RLS 정책 수정 (role 컬럼 없는 버전)
-- 이 스크립트는 role 컬럼이 없는 상태에서 작동합니다.

-- 1. 기존 정책들 삭제
DROP POLICY IF EXISTS "Users can view chat rooms they participate in" ON chat_room;
DROP POLICY IF EXISTS "Users can create chat rooms" ON chat_room;
DROP POLICY IF EXISTS "Room creators and admins can update chat rooms" ON chat_room;
DROP POLICY IF EXISTS "Users can view participants in their rooms" ON chat_room_participant;
DROP POLICY IF EXISTS "Room admins can manage participants" ON chat_room_participant;
DROP POLICY IF EXISTS "Users can view messages in their rooms" ON message;
DROP POLICY IF EXISTS "Users can send messages to their rooms" ON message;
DROP POLICY IF EXISTS "Users can edit their own messages" ON message;
DROP POLICY IF EXISTS "Users can view reactions in their rooms" ON message_reaction;
DROP POLICY IF EXISTS "Users can manage their own reactions" ON message_reaction;

-- 2. 채팅방 정책 (creator 기반)
CREATE POLICY "chat_room_select" ON chat_room
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM chat_room_participant 
            WHERE room_id = chat_room.id 
            AND employee_id = auth.uid() 
            AND is_active = true
        )
    );

CREATE POLICY "chat_room_insert" ON chat_room
    FOR INSERT WITH CHECK (creator_id = auth.uid());

CREATE POLICY "chat_room_update" ON chat_room
    FOR UPDATE USING (
        creator_id = auth.uid()
    );

-- 3. 참여자 정책 (단순화 - creator만 관리 가능)
CREATE POLICY "participant_select" ON chat_room_participant
    FOR SELECT USING (
        employee_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM chat_room_participant cp2
            WHERE cp2.room_id = chat_room_participant.room_id 
            AND cp2.employee_id = auth.uid() 
            AND cp2.is_active = true
        )
    );

CREATE POLICY "participant_insert" ON chat_room_participant
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM chat_room 
            WHERE id = room_id 
            AND creator_id = auth.uid()
        )
    );

CREATE POLICY "participant_update" ON chat_room_participant
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM chat_room 
            WHERE id = room_id 
            AND creator_id = auth.uid()
        )
    );

CREATE POLICY "participant_delete" ON chat_room_participant
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM chat_room 
            WHERE id = room_id 
            AND creator_id = auth.uid()
        )
    );

-- 4. 메시지 정책
CREATE POLICY "message_select" ON message
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM chat_room_participant 
            WHERE room_id = message.room_id 
            AND employee_id = auth.uid() 
            AND is_active = true
        )
    );

CREATE POLICY "message_insert" ON message
    FOR INSERT WITH CHECK (
        sender_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM chat_room_participant 
            WHERE room_id = message.room_id 
            AND employee_id = auth.uid() 
            AND is_active = true
        )
    );

CREATE POLICY "message_update" ON message
    FOR UPDATE USING (sender_id = auth.uid());

-- 5. 메시지 반응 정책
CREATE POLICY "reaction_select" ON message_reaction
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM message m
            JOIN chat_room_participant crp ON m.room_id = crp.room_id
            WHERE m.id = message_reaction.message_id 
            AND crp.employee_id = auth.uid() 
            AND crp.is_active = true
        )
    );

CREATE POLICY "reaction_insert" ON message_reaction
    FOR INSERT WITH CHECK (employee_id = auth.uid());

CREATE POLICY "reaction_update" ON message_reaction
    FOR UPDATE USING (employee_id = auth.uid());

CREATE POLICY "reaction_delete" ON message_reaction
    FOR DELETE USING (employee_id = auth.uid());

-- 6. 확인 쿼리
SELECT schemaname, tablename, policyname, cmd 
FROM pg_policies 
WHERE tablename IN ('chat_room', 'chat_room_participant', 'message', 'message_reaction')
ORDER BY tablename, policyname;
