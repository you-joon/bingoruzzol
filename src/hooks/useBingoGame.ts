import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { BingoRoom, RoomPlayer, BingoBoard, GameAction, ChatMessage } from '@/types/bingo';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

export const useBingoGame = (roomId: string | null) => {
  const [room, setRoom] = useState<BingoRoom | null>(null);
  const [players, setPlayers] = useState<RoomPlayer[]>([]);
  const [boards, setBoards] = useState<BingoBoard[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentPlayer, setCurrentPlayer] = useState<RoomPlayer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 4자리 랜덤 숫자 생성
  const generateRoomId = () => {
    return Math.floor(1000 + Math.random() * 9000).toString();
  };

  // 방 생성
  const createRoom = async (playerName: string) => {
    try {
      const newRoomId = generateRoomId();

      // 방 생성을 먼저 시도
      const { error: roomError } = await supabase
        .from('bingo_rooms')
        .insert({
          room_id: newRoomId,
          host_id: '00000000-0000-0000-0000-000000000000', // 임시 UUID
          game_status: 'waiting',
          last_cell_index: null,
          last_cell_value: null,
          last_player: null,
          win_condition: 3, // 기본값 3줄
          completed_players: [] // 빙고 완료한 플레이어 배열 초기화
        });

      if (roomError) throw roomError;
      
      // 플레이어 생성
      const { data: playerData, error: playerError } = await supabase
        .from('room_players')
        .insert({
          room_id: newRoomId,
          player_name: playerName,
          is_host: true,
          bingo_completed: false,
          rank: null
        })
        .select()
        .single();

      if (playerError) throw playerError;

      // 방의 host_id를 실제 플레이어 ID로 업데이트
      const { error: updateError } = await supabase
        .from('bingo_rooms')
        .update({ host_id: playerData.id })
        .eq('room_id', newRoomId);

      if (updateError) throw updateError;

      setCurrentPlayer(playerData);
      return newRoomId;
    } catch (err) {
      console.error('Error creating room:', err);
      setError(err instanceof Error ? err.message : '방 생성 중 오류가 발생했습니다.');
      return null;
    }
  };

  // 방 참여
  const joinRoom = async (roomId: string, playerName: string) => {
    try {
      // 먼저 같은 이름의 플레이어가 이미 방에 있는지 확인
      const { data: existingPlayers, error: checkError } = await supabase
        .from('room_players')
        .select('player_name')
        .eq('room_id', roomId)
        .eq('player_name', playerName);

      if (checkError) throw checkError;
      
      // 이미 같은 이름의 플레이어가 존재하는 경우
      if (existingPlayers && existingPlayers.length > 0) {
        throw new Error('이미 참여 중인 이름입니다.');
      }

      // 방 정보 확인
      const { data: room, error: roomError } = await supabase
        .from('bingo_rooms')
        .select()
        .eq('room_id', roomId)
        .single();

      if (roomError) throw new Error('존재하지 않는 방입니다.');
      if (room.game_status !== 'waiting') throw new Error('이미 게임이 시작된 방입니다.');

      // 플레이어 생성
      const { data: player, error: playerError } = await supabase
        .from('room_players')
        .insert({
          room_id: roomId,
          player_name: playerName,
          is_host: false,
          bingo_completed: false,
          rank: null
        })
        .select()
        .single();

      if (playerError) throw playerError;

      setCurrentPlayer(player);
      return player;
    } catch (err) {
      setError(err instanceof Error ? err.message : '방 참여 중 오류가 발생했습니다.');
      return null;
    }
  };

  // 빙고판 저장
  const saveBoard = async (playerId: string, boardData: string[]) => {
    try {
      // 먼저 이미 존재하는 보드가 있는지 확인
      const { data: existingBoard, error: checkError } = await supabase
        .from('bingo_boards')
        .select()
        .eq('room_id', roomId)
        .eq('player_id', playerId)
        .maybeSingle();

      if (checkError) throw checkError;

      let result;
      
      if (existingBoard) {
        // 이미 존재하면 업데이트
        const { data, error: updateError } = await supabase
          .from('bingo_boards')
          .update({ board_data: boardData })
          .eq('room_id', roomId)
          .eq('player_id', playerId)
          .select();

        if (updateError) throw updateError;
        result = data;
      } else {
        // 존재하지 않으면 새로 삽입
        const { data, error: insertError } = await supabase
          .from('bingo_boards')
          .insert({
            room_id: roomId,
            player_id: playerId,
            board_data: boardData
          })
          .select();

        if (insertError) throw insertError;
        result = data;
      }
      
      console.log('빙고판 저장 성공:', boardData);
      return { success: true, data: boardData };
    } catch (err) {
      console.error('빙고판 저장 중 오류:', err);
      setError(err instanceof Error ? err.message : '빙고판 저장 중 오류가 발생했습니다.');
      return { success: false, error: err };
    }
  };

  // 게임 상태 초기화 (새 함수)
  const resetGame = async () => {
    if (!roomId || !currentPlayer?.is_host) return false;
    
    try {
      // 1. 게임 상태 초기화
      await supabase
        .from('bingo_rooms')
        .update({
          game_status: 'waiting',
          current_turn: null,
          last_cell_index: null,
          last_cell_value: null,
          last_player: null,
          completed_players: [],
          win_condition: 3 // 기본값으로 초기화
        })
        .eq('room_id', roomId);
      
      // 2. 플레이어 상태 초기화
      for (const player of players) {
        await supabase
          .from('room_players')
          .update({
            bingo_completed: false,
            rank: null,
            turn_order: null
          })
          .eq('id', player.id);
      }
      
      // 3. 빙고판 초기화 (모든 빙고판 삭제)
      await supabase
        .from('bingo_boards')
        .delete()
        .eq('room_id', roomId);
        
      // 4. 게임 히스토리에 기록
      await supabase
        .from('game_history')
        .insert({
          room_id: roomId,
          player_id: currentPlayer.id,
          action_type: 'game_reset',
          action_data: { reset_by: currentPlayer.player_name }
        });
        
      // 5. 메시지 전송
      await sendMessage('🔄 게임이 초기화되었습니다. 새 게임을 시작할 수 있습니다.');
        
      return true;
    } catch (err) {
      console.error('게임 초기화 오류:', err);
      return false;
    }
  };

  // 게임 시작
  const startGame = async () => {
    if (!room || !currentPlayer?.is_host) return;

    try {
      console.log('Starting game...', room.room_id);
      
      // 게임 상태 업데이트를 먼저 수행
      const { data, error: roomError } = await supabase
      .from('bingo_rooms')
      .update({
        game_status: 'playing',
        current_turn: currentPlayer.id, // 방장부터 시작
      })
      .eq('room_id', room.room_id)
      .select();

      if (roomError) throw roomError;

      console.log('Room update result:', data);
      setRoom(prev => ({
        ...prev,
        game_status: 'playing',
        current_turn: currentPlayer.id
      }));
      
      // 플레이어 순서 랜덤 배정
      const shuffledPlayers = [...players].sort(() => Math.random() - 0.5);
      
      // 플레이어 순서 업데이트
      for (let i = 0; i < shuffledPlayers.length; i++) {
        const { error: updateError } = await supabase
          .from('room_players')
          .update({ turn_order: i })
          .eq('id', shuffledPlayers[i].id);

        if (updateError) throw updateError;
      }

      console.log('Game started successfully');
    } catch (err) {
      console.error('Error starting game:', err);
      setError(err instanceof Error ? err.message : '게임 시작 중 오류가 발생했습니다.');
    }
  };

  // 제시어 제출 (기존 함수, 유지)
  const submitWord = async (word: string) => {
    if (!room || !currentPlayer || room.current_turn !== currentPlayer.id) return;

    try {
      await supabase
        .from('game_history')
        .insert({
          room_id: roomId,
          player_id: currentPlayer.id,
          action_type: 'word_submit',
          action_data: { word },
        });

      // 다음 플레이어로 턴 넘기기
      const nextPlayer = players.find(p => p.turn_order === ((currentPlayer.turn_order || 0) + 1) % players.length);
      if (nextPlayer) {
        await supabase
          .from('bingo_rooms')
          .update({ current_turn: nextPlayer.id })
          .eq('room_id', roomId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '제시어 제출 중 오류가 발생했습니다.');
    }
  };

  // 셀 클릭 제출 (새 함수)
  const submitCell = async (cellIndex: number, cellValue: string) => {
    if (!room || !currentPlayer || room.current_turn !== currentPlayer.id) return;
    try {
      // 1. 셀 클릭 기록 저장 (game_history)
      await supabase
        .from('game_history')
        .insert({
          room_id: roomId,
          player_id: currentPlayer.id,
          action_type: 'cell_click',
          action_data: { cellIndex, cellValue },
        });
  
      // 2. 다음 턴 플레이어 계산
  
      // 우선 turn_order 기준으로 시도
      let nextPlayer = null;
      if (currentPlayer.turn_order !== undefined) {
        const currentTurnOrder = currentPlayer.turn_order;
        const nextTurnOrder = (currentTurnOrder + 1) % players.length;
        nextPlayer = players.find(p => p.turn_order === nextTurnOrder);
      }
  
      // turn_order 기준으로 못 찾은 경우 → index 기반 fallback 처리
      if (!nextPlayer) {
        const currentIndex = players.findIndex(p => p.id === currentPlayer.id);
        const nextIndex = (currentIndex + 1) % players.length;
        nextPlayer = players[nextIndex];
      }
  
      if (!nextPlayer) {
        console.warn('다음 턴 플레이어를 찾을 수 없습니다.');
        return;
      }
  
      // 3. bingo_rooms 상태 업데이트
      await supabase
        .from('bingo_rooms')
        .update({
          current_turn: nextPlayer.id,
          last_cell_index: cellIndex,
          last_cell_value: cellValue,
          last_player: currentPlayer.id,
        })
        .eq('room_id', Number(roomId));
  
      console.log(`턴이 ${nextPlayer.player_name}님에게 넘어갔습니다.`);

    } catch (err) {
      setError(err instanceof Error ? err.message : '셀 선택 중 오류가 발생했습니다.');
      console.error(err);
    }
  };
  
  // 빙고 상태 확인
  const checkBingoStatus = async (playerId: string, checkedCells: boolean[], board: string[]) => {
    if (!room) return { completed: false, lines: [] };
    
    const size = 5; // 5x5 빙고판
    const lines: number[][] = [];
    let completedLinesCount = 0;
    
    // 가로 라인 체크
    for (let row = 0; row < size; row++) {
      const lineIndices = Array.from({ length: size }, (_, col) => row * size + col);
      if (lineIndices.every(idx => checkedCells[idx])) {
        lines.push(lineIndices);
        completedLinesCount++;
      }
    }
    
    // 세로 라인 체크
    for (let col = 0; col < size; col++) {
      const lineIndices = Array.from({ length: size }, (_, row) => row * size + col);
      if (lineIndices.every(idx => checkedCells[idx])) {
        lines.push(lineIndices);
        completedLinesCount++;
      }
    }
    
    // 대각선 라인 체크 (왼쪽 위 -> 오른쪽 아래)
    const diagonal1 = Array.from({ length: size }, (_, i) => i * size + i);
    if (diagonal1.every(idx => checkedCells[idx])) {
      lines.push(diagonal1);
      completedLinesCount++;
    }
    
    // 대각선 라인 체크 (오른쪽 위 -> 왼쪽 아래)
    const diagonal2 = Array.from({ length: size }, (_, i) => (i + 1) * size - (i + 1));
    if (diagonal2.every(idx => checkedCells[idx])) {
      lines.push(diagonal2);
      completedLinesCount++;
    }
    
    // 승리 조건 체크
    const winCondition = room.win_condition || 3; // 기본값 3
    const bingoCompleted = completedLinesCount >= winCondition;
    
    if (!bingoCompleted) {
      return { completed: false, lines }; // 빙고 미완료 시 라인만 반환
    }
    
    try {
      // 1. 이미 빙고를 완료한 플레이어인지 확인
      const { data: playerData } = await supabase
        .from('room_players')
        .select('bingo_completed, rank')
        .eq('id', playerId)
        .single();
        
      // 이미 빙고를 완료했으면 추가 처리 불필요
      if (playerData.bingo_completed) {
        return { completed: true, lines, rank: playerData.rank };
      }
      
      // 2. 현재 빙고 완료된 플레이어 수 확인
      const { data: completedPlayersData } = await supabase
        .from('room_players')
        .select('id, rank')
        .eq('room_id', roomId)
        .eq('bingo_completed', true);
      
      // 신규 순위 계산 (1위부터 시작)
      const newRank = (completedPlayersData?.length || 0) + 1;
      
      // 3. 플레이어 상태 업데이트
      await supabase
        .from('room_players')
        .update({
          bingo_completed: true,
          rank: newRank
        })
        .eq('id', playerId);
      
      // 4. 게임 히스토리에 기록
      await supabase
        .from('game_history')
        .insert({
          room_id: roomId,
          player_id: playerId,
          action_type: 'bingo_complete',
          action_data: { lines: completedLinesCount, rank: newRank }
        });
      
      // 5. 게임 종료 조건 확인
      const totalPlayers = players.length;
      const requiredCompletions = Math.max(1, totalPlayers - 1); // 총 인원 - 1명이 빙고를 완료하면 게임 종료
      
      // 새로 빙고가 완료된 플레이어를 포함한 완료 플레이어 수
      const completedCount = (completedPlayersData?.length || 0) + 1;
      
      // 게임 종료 조건에 도달했는지 확인
      if (completedCount >= requiredCompletions) {
        console.log(`게임 종료 조건 도달: ${completedCount}명 완료 (필요: ${requiredCompletions}명)`);
        
        // 게임 종료 처리
        await supabase
          .from('bingo_rooms')
          .update({ 
            game_status: 'finished'
          })
          .eq('room_id', roomId);
        
        // 게임 종료 메시지 전송
        await sendMessage(`🎉 게임 종료! ${newRank}위 결정! (${players.find(p => p.id === playerId)?.player_name}님)`);
      } else {
        // 현재 턴인 플레이어가 빙고를 완료했으면 턴을 넘김
        if (room.current_turn === playerId) {
          // 다음 턴을 결정 (빙고 미완료 플레이어 중에서)
          const activePlayers = players.filter(p => !p.bingo_completed && p.id !== playerId);
          if (activePlayers.length > 0) {
            // 턴 순서에 따라 다음 플레이어 선택
            let nextPlayer = null;
            
            if (currentPlayer?.turn_order !== undefined) {
              // 현재 플레이어의 턴 순서 기준으로 다음 플레이어 찾기
              let nextTurnOrder = (currentPlayer.turn_order + 1) % players.length;
              let loopCount = 0;
              
              // 빙고 완료하지 않은 다음 플레이어를 찾을 때까지 반복
              while (loopCount < players.length) {
                const potentialNext = players.find(p => p.turn_order === nextTurnOrder);
                if (potentialNext && !potentialNext.bingo_completed) {
                  nextPlayer = potentialNext;
                  break;
                }
                nextTurnOrder = (nextTurnOrder + 1) % players.length;
                loopCount++;
              }
            }
            
            // 턴 순서로 찾지 못한 경우 첫 번째 활성 플레이어로 설정
            if (!nextPlayer) {
              nextPlayer = activePlayers[0];
            }
            
            await supabase
              .from('bingo_rooms')
              .update({ current_turn: nextPlayer.id })
              .eq('room_id', roomId);
          }
          
          // 빙고 완료 메시지 전송
          await sendMessage(`${players.find(p => p.id === playerId)?.player_name}님이 빙고를 완료했습니다! (${newRank}위)`);
        }
      }
      
      return { completed: true, lines, rank: newRank };
    } catch (err) {
      console.error('빙고 완료 처리 오류:', err);
      return { completed: false, lines, error: err };
    }
  };

  // 채팅 메시지 전송
  const sendMessage = async (message: string) => {
    if (!roomId || !currentPlayer) return;

    try {
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          room_id: roomId,
          player_id: currentPlayer.id,
          message: message,
        });

      if (error) throw error;
    } catch (err) {
      setError(err instanceof Error ? err.message : '메시지 전송 중 오류가 발생했습니다.');
    }
  };

  // 방 목록 조회
  const getRoomList = async () => {
    try {
      const { data, error } = await supabase
        .from('bingo_rooms')
        .select(`
          room_id,
          game_status,
          created_at,
          host_id,
          room_players (
            player_name,
            is_host
          )
        `)
        .eq('game_status', 'waiting');

      if (error) throw error;

      return data.map(room => ({
        id: room.room_id,
        game_status: room.game_status,
        player_count: room.room_players.length,
        created_at: room.created_at,
        host_name: room.room_players.find(p => p.is_host)?.player_name || '알 수 없음'
      }));
    } catch (err) {
      console.error('Error fetching room list:', err);
      return [];
    }
  };

  // 방 나가기
  const leaveRoom = async (roomId: string, playerId: string) => {
    try {
      // 현재 플레이어가 방장인지와 현재 게임 상태 확인
      const isHost = currentPlayer?.is_host;
      const currentGameStatus = room?.game_status;
      const isPlaying = currentGameStatus === 'playing';

      // 1. 게임 중이라면 방 상태를 'waiting'으로 되돌림
      if (isPlaying) {
        await supabase
          .from('bingo_rooms')
          .update({ game_status: 'waiting' })
          .eq('room_id', roomId);
        
        console.log('게임 중 퇴장: 방 상태 waiting으로 초기화');
      }

      // 2. 해당 플레이어의 메시지 처리 (player_id를 null로 설정)
      await supabase
        .from('chat_messages')
        .update({ player_id: null })
        .eq('player_id', playerId);

      // 3. 그 다음 플레이어 삭제
      const { error: deleteError } = await supabase
        .from('room_players')
        .delete()
        .eq('id', playerId);

      if (deleteError) throw deleteError;

      // 방에 남은 플레이어 수 확인
      const { data: remainingPlayers, error: countError } = await supabase
        .from('room_players')
        .select('id, is_host')
        .eq('room_id', roomId);

      if (countError) throw countError;

      if (remainingPlayers.length === 0) {
        // 모든 플레이어가 나갔으면 방 전체 삭제
        await deleteRoom(roomId);
      } else if (isHost && remainingPlayers.length > 0) {
        // 방장이 나가면 가장 먼저 들어온 플레이어에게 방장 권한 이전
        const nextHost = remainingPlayers[0];
        await supabase
          .from('room_players')
          .update({ is_host: true })
          .eq('id', nextHost.id);

        await supabase
          .from('bingo_rooms')
          .update({ 
            host_id: nextHost.id,
            // 게임 중이었다면 waiting 상태로 변경을 한 번 더 확인
            ...(isPlaying ? { game_status: 'waiting' } : {})
          })
          .eq('room_id', roomId);

        // 4. 빙고판 데이터 초기화 (게임 중이었다면)
        if (isPlaying) {
          // 방의 모든 빙고판 삭제
          await supabase
            .from('bingo_boards')
            .delete()
            .eq('room_id', roomId);
        }
      }

      setCurrentPlayer(null);
      return true;
    } catch (err) {
      console.error('Error leaving room:', err);
      setError(err instanceof Error ? err.message : '방을 나가는 중 오류가 발생했습니다.');
      return false;
    }
  };

  // 방 삭제 함수 수정
  const deleteRoom = async (roomId: string) => {
    try {
      // 1. 먼저 해당 방의 모든 메시지 삭제 (외래 키 제약이 있는 테이블부터)
      await supabase
        .from('chat_messages')
        .delete()
        .eq('room_id', roomId);

      // 2. 게임 히스토리 삭제 (만약 존재한다면)
      await supabase
        .from('game_history')
        .delete()
        .eq('room_id', roomId);
      
      // 3. 방의 모든 빙고판 데이터 삭제
      await supabase
        .from('bingo_boards')
        .delete()
        .eq('room_id', roomId);
      
      // 4. 방의 모든 플레이어 데이터 삭제
      await supabase
        .from('room_players')
        .delete()
        .eq('room_id', roomId);
      
      // 5. 마지막으로 방 자체 삭제
      await supabase
        .from('bingo_rooms')
        .delete()
        .eq('room_id', roomId);
      
      return true;
    } catch (error) {
      console.error('방 삭제 중 오류:', error);
      return false;
    }
  };

  // 중복 이름 체크 함수
  const checkDuplicateName = async (roomId: string, playerName: string) => {
    try {
      const { data, error } = await supabase
        .from('room_players')
        .select('player_name')
        .eq('room_id', roomId)
        .eq('player_name', playerName);
      
      if (error) throw error;
      
      // 중복된 이름이 있으면 true 반환
      return data && data.length > 0;
    } catch (err) {
      console.error('이름 중복 확인 중 오류:', err);
      return false;
    }
  };

  // 플레이어 목록 수동 갱신 함수
  const refreshPlayers = async () => {
    try {
      if (!roomId) return;
      
      const { data, error } = await supabase
        .from('room_players')
        .select()
        .eq('room_id', roomId)
        .order('turn_order');
        
      if (error) throw error;
      if (data) {
        setPlayers(data);
        
        // 현재 사용자의 플레이어 객체 찾기 - 로컬 스토리지를 사용하지 않고 더 신뢰할 수 있는 방법
        if (currentPlayer) {
          const updatedCurrentPlayer = data.find(p => p.id === currentPlayer.id);
          if (updatedCurrentPlayer) {
            // 현재 플레이어 정보 갱신 (방장 권한 변경 등이 반영됨)
            console.log('현재 플레이어 정보 업데이트:', updatedCurrentPlayer);
            setCurrentPlayer(updatedCurrentPlayer);
          }
        }
      }
      return data;
    } catch (err) {
      console.error('플레이어 목록 갱신 중 오류:', err);
      return null;
    }
  };

  // 플레이어의 빙고판 불러오기 함수
  const loadPlayerBoard = async (playerId: string) => {
    try {
      console.log('빙고판 불러오기 시도:', { roomId, playerId });
      
      const { data, error } = await supabase
        .from('bingo_boards')
        .select('board_data')
        .eq('room_id', roomId)
        .eq('player_id', playerId)
        .maybeSingle();
      
      if (error) {
        console.log('저장된 빙고판 없음, 오류 세부 정보:', error);
        return null;
      }
      
      if (!data || !data.board_data) {
        console.log('빙고판 데이터가 없습니다.');
        return null;
      }
      
      console.log('저장된 빙고판 로드 성공:', data.board_data);
      return data.board_data;
    } catch (err) {
      console.error('빙고판 불러오기 오류:', err);
      return null;
    }
  };

  // 플레이어의 빙고판 생성 또는 로드 (새로운 함수)
  const getOrCreatePlayerBoard = async (playerId: string) => {
    try {
      // 1. 먼저 저장된 빙고판이 있는지 확인
      const savedBoard = await loadPlayerBoard(playerId);
      
      if (savedBoard) {
        // 저장된 빙고판이 있으면 사용
        console.log('저장된 빙고판 사용:', savedBoard);
        return { board: savedBoard, isNew: false };
      }
      
      // 2. 저장된 빙고판이 없으면 새로 생성 (1-50 범위로 변경)
      console.log('새 빙고판 생성 (1-50 범위에서 25개 숫자 선택)');
      const numbers = Array.from({ length: 50 }, (_, i) => i + 1);  // 1~50까지 생성
      const shuffled = numbers.sort(() => Math.random() - 0.5).slice(0, 25);  // 랜덤으로 셔플 후 25개만 선택
      const newBoard = shuffled.map(n => n.toString());
      
      // 3. 생성한 빙고판 저장
      console.log('새 빙고판 저장:', newBoard);
      await saveBoard(playerId, newBoard);
      
      return { board: newBoard, isNew: true };
    } catch (err) {
      console.error('빙고판 가져오기 오류:', err);
      // 오류 발생 시 로컬에서 빙고판 생성 (DB 저장 실패해도 게임은 진행)
      const numbers = Array.from({ length: 50 }, (_, i) => i + 1);  // 여기도 1~50으로 수정
      const shuffled = numbers.sort(() => Math.random() - 0.5).slice(0, 25);  // 25개만 선택
      const newBoard = shuffled.map(n => n.toString());
      return { board: newBoard, isNew: true, error: err };
    }
  };
  
  // 방 정보 주기적으로 폴링하는 함수
  const pollRoomInfo = async () => {
    try {
      if (!roomId) return null;
      
      const { data, error } = await supabase
        .from('bingo_rooms')
        .select()
        .eq('room_id', roomId)
        .single();
        
      if (error) {
        // 방이 존재하지 않는 경우 - 사용자가 이미 방을 나갔거나 방이 삭제됨
        if (error.code === 'PGRST116') {
          console.log('방이 더 이상 존재하지 않습니다.');
          return null;
        }
        throw error;
      }
      
      // 상태가 변경되었을 때만 업데이트 및 로깅
      if (!room || data.game_status !== room.game_status) {
        console.log('방 정보 폴링 결과 (상태 변경됨):', data);
        
        // 게임 중에서 대기 중으로 변경된 경우 빙고판 초기화
        if (room?.game_status === 'playing' && data.game_status === 'waiting') {
          console.log('게임이 취소되었습니다. 대기 화면으로 전환합니다.');
        }
        
        setRoom(data);
      }
      
      return data;
    } catch (err) {
      console.error('방 정보 폴링 오류:', err);
      return null;
    }
  };

  // 실시간 업데이트 구독
  useEffect(() => {
    if (!roomId) {
      setLoading(false);
      return;
    }

    console.log('Setting up realtime subscriptions for room:', roomId);

    // 방 정보 구독
    const roomChannel = supabase.channel('room_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bingo_rooms',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          console.log('Room update received:', payload);
          if (payload.new) {
            // 변경 사항 명확하게 기록
            console.log('방 상태 변경:', 
              payload.old ? payload.old.game_status : 'unknown', 
              '->', 
              payload.new.game_status
            );
            setRoom(payload.new as BingoRoom);
          }
        }
      )
      .subscribe((status) => {
        console.log('Room subscription status:', status);
      });

    // 플레이어 정보 구독
    const playerChannel = supabase.channel('player_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'room_players',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          console.log('Player update received:', payload);
          
          // 플레이어 목록 새로고침
          refreshPlayers().then(() => {
            console.log('플레이어 목록 및 현재 플레이어 정보 갱신 완료');
          });
        }
      )
      .subscribe();

    // 채팅 메시지 구독
    const chatChannel = supabase.channel('chat_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_messages',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          console.log('Chat message received:', payload);
          if (payload.eventType === 'INSERT') {
            // 새 메시지 삽입 시
            setMessages(prev => [...prev, payload.new as ChatMessage]);
          } else if (payload.eventType === 'UPDATE') {
            // 메시지 업데이트 시 (기존 메시지 유지하면서 업데이트된 메시지만 변경)
            setMessages(prev => 
              prev.map(msg => msg.id === payload.new.id ? payload.new as ChatMessage : msg)
            );
          }
        }
      )
      .subscribe((status) => {
        console.log('Chat subscription status:', status);
      });

    // 초기 데이터 로드
    const loadInitialData = async () => {
      try {
        const { data: roomData, error: roomError } = await supabase
          .from('bingo_rooms')
          .select()
          .eq('room_id', roomId)
          .single();

        if (roomError) throw roomError;
        setRoom(roomData);

        const { data: playerData, error: playerError } = await supabase
          .from('room_players')
          .select()
          .eq('room_id', roomId)
          .order('turn_order');

        if (playerError) throw playerError;
        setPlayers(playerData);

        // 현재 플레이어 찾기
        const storedName = localStorage.getItem('playerName');
        if (storedName) {
          const currentPlayer = playerData.find(p => p.player_name === storedName);
          if (currentPlayer) setCurrentPlayer(currentPlayer);
        }

        // 채팅 메시지 로드
        const { data: messageData, error: messageError } = await supabase
          .from('chat_messages')
          .select()
          .eq('room_id', roomId)
          .order('created_at');

        if (messageError) throw messageError;
        if (messageData) setMessages(messageData);

      } catch (err) {
        console.error('Error loading initial data:', err);
        setError(err instanceof Error ? err.message : '데이터 로드 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();

    return () => {
      console.log('Cleaning up subscriptions');
      roomChannel.unsubscribe();
      playerChannel.unsubscribe();
      chatChannel.unsubscribe();
    };
  }, [roomId]);

  return {
    room,
    players,
    boards,
    currentPlayer,
    loading,
    error,
    createRoom,
    joinRoom,
    saveBoard,
    startGame,
    submitWord,
    submitCell,        // 새로 추가
    messages,
    sendMessage,
    leaveRoom,
    getRoomList,
    deleteRoom,
    refreshPlayers,
    checkDuplicateName,
    loadPlayerBoard,
    getOrCreatePlayerBoard,
    pollRoomInfo,
    checkBingoStatus, // 새로 추가: 빙고 상태 확인
    resetGame        // 새로 추가: 게임 초기화
  };
};