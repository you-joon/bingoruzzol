-- 빙고 방 테이블
CREATE TABLE bingo_rooms (
  room_id VARCHAR(4) PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  host_id UUID NOT NULL,
  game_status VARCHAR(20) DEFAULT 'waiting' CHECK (game_status IN ('waiting', 'playing', 'finished')),
  current_turn UUID,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 플레이어 테이블
CREATE TABLE room_players (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  room_id VARCHAR(4) REFERENCES bingo_rooms(room_id) ON DELETE CASCADE,
  player_name VARCHAR(50) NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  is_host BOOLEAN DEFAULT false,
  turn_order INTEGER,
  bingo_lines INTEGER DEFAULT 0,
  UNIQUE(room_id, player_name)
);

-- 빙고 보드 테이블
CREATE TABLE bingo_boards (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  room_id VARCHAR(4) REFERENCES bingo_rooms(room_id) ON DELETE CASCADE,
  player_id UUID REFERENCES room_players(id) ON DELETE CASCADE,
  board_data JSONB NOT NULL,
  checked_cells BOOLEAN[] DEFAULT array_fill(false, ARRAY[25]),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(room_id, player_id)
);

-- 게임 기록 테이블
CREATE TABLE game_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  room_id VARCHAR(4) REFERENCES bingo_rooms(room_id) ON DELETE CASCADE,
  player_id UUID REFERENCES room_players(id) ON DELETE CASCADE,
  action_type VARCHAR(20) NOT NULL,
  action_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 채팅 메시지 테이블
CREATE TABLE chat_messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  room_id VARCHAR(4) REFERENCES bingo_rooms(room_id) ON DELETE CASCADE,
  player_id UUID REFERENCES room_players(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 실시간 구독을 위한 함수
CREATE OR REPLACE FUNCTION handle_room_update()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 방 업데이트 트리거
CREATE TRIGGER room_updated
  BEFORE UPDATE ON bingo_rooms
  FOR EACH ROW
  EXECUTE FUNCTION handle_room_update();

-- RLS 정책 설정
ALTER TABLE bingo_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE bingo_boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 모든 작업 가능하도록 설정
CREATE POLICY "Allow all for rooms" ON bingo_rooms FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for players" ON room_players FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for boards" ON bingo_boards FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for history" ON game_history FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for messages" ON chat_messages FOR ALL USING (true) WITH CHECK (true); 