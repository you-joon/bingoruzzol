// 게임 상태 타입
export type GameStatus = 'waiting' | 'playing' | 'finished';

// 빙고 방 타입
export interface BingoRoom {
  room_id: string;
  host_id: string;
  game_status: GameStatus;
  current_turn: string | null;
  last_updated: string;
  win_condition: number; // 추가: 승리 조건 (몇 줄)
  completed_players?: string[]; // 추가: 빙고 완료한 플레이어 ID 목록
}

// 플레이어 타입
export interface RoomPlayer {
  id: string;
  room_id: string;
  player_name: string;
  is_host: boolean;
  turn_order: number | null;
  bingo_lines: number;
  bingo_completed?: boolean; // 빙고 완료 여부
  rank?: number; // 순위
}

// 빙고 보드 타입
export interface BingoBoard {
  id: string;
  room_id: string;
  player_id: string;
  board_data: string[];
  checked_cells: boolean[];
}

// 게임 액션 타입
export interface GameAction {
  id: string;
  room_id: string;
  player_id: string;
  action_type: 'word_submit' | 'cell_check' | 'game_start' | 'game_end';
  action_data: {
    word?: string;
    cell_index?: number;
    message?: string;
  };
}

// 채팅 메시지 타입
export interface ChatMessage {
  id: string;
  room_id: string;
  player_id: string;
  message: string;
  created_at: string;
} 