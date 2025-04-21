"use client";

import { useState, useEffect, useRef } from 'react';
import { useBingoGame } from '@/hooks/useBingoGame';
import { useSearchParams } from 'next/navigation';
import { useRouter } from 'next/navigation';

interface GameState {
  board: string[];
  checkedCells: boolean[];
  isGameOver: boolean;
  playerName: string;
  startTime?: number;
  endTime?: number;
}

interface Room {
  id: string;
  game_status: 'waiting' | 'playing' | 'finished';
  player_count: number;
  created_at: string;
  host_name: string;
}

export default function MultiplayerGame() {
  const router = useRouter();
  const [playerName, setPlayerName] = useState('');
  const [roomId, setRoomId] = useState<string | null>(null);
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [inputRoomId, setInputRoomId] = useState('');
  const [gameState, setGameState] = useState<GameState>({
    board: Array(25).fill(''),
    checkedCells: Array(25).fill(false),
    isGameOver: false,
    playerName: '',
  });
  const [newMessage, setNewMessage] = useState('');
  // 채팅 컨테이너를 위한 ref
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [bingoBoard, setBingoBoard] = useState<string[]>(Array(25).fill(''));
  const [checkedCells, setCheckedCells] = useState<boolean[]>(Array(25).fill(false));
  const [roomList, setRoomList] = useState<Room[]>([]);
    // 컴포넌트 내부, 다른 상태 변수 선언 근처에 추가
  const prevGameStatus = useRef<string | undefined>(undefined);
  const [hasClickedThisTurn, setHasClickedThisTurn] = useState(false);

  const {
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
    // submitWord,     // 제거 또는 주석 처리
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
    pollRoomInfo
  } = useBingoGame(roomId);

  // 방 목록 가져오기
  useEffect(() => {
    const fetchRooms = async () => {
      if (!roomId) {
        const rooms = await getRoomList();
        setRoomList(rooms);
      }
    };

    fetchRooms();
    // 10초마다 방 목록 갱신
    const interval = setInterval(fetchRooms, 10000);
    return () => clearInterval(interval);
  }, [roomId]);

  // 플레이어 이름 불러오기
  useEffect(() => {
    const savedName = localStorage.getItem('playerName');
    if (savedName) {
      setPlayerName(savedName);
    }
  }, []);

  // 게임 상태 변경 감지
  useEffect(() => {
    if (room) {
      // 상태가 실제로 변경되었을 때만 메시지 표시
      if (prevGameStatus.current !== room.game_status) {
        console.log('방 상태 업데이트:', room.game_status);
        
        if (room.game_status === 'playing' && prevGameStatus.current !== 'playing') {
          console.log('게임이 시작되었습니다! 빙고판을 초기화합니다.');
        }
        
        // 현재 상태를 이전 상태로 저장
        prevGameStatus.current = room.game_status;
      }
    }
  }, [room?.game_status]);

  // 브라우저 종료 시 방 나가기
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (roomId && currentPlayer) {
        leaveRoom(roomId, currentPlayer.id);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [roomId, currentPlayer]);

  // 채팅창 스크롤 다운 효과 수정 - 채팅 컨테이너에서만 스크롤
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // 메시지 수신 시 플레이어 목록도 갱신
  useEffect(() => {
    if (messages.length > 0 && roomId) {
      refreshPlayers();
    }
  }, [messages]);

  // 주기적인 플레이어 목록 갱신 (백업 방안)
  useEffect(() => {
    if (!roomId) return;
    
    // 초기에 한 번 갱신
    refreshPlayers();
    
    // 5초마다 플레이어 정보 갱신 (방장 권한 변경 등이 반영됨)
    const interval = setInterval(() => {
      refreshPlayers();
    }, 5000);
    
    return () => clearInterval(interval);
  }, [roomId]);

  // 주기적으로 방 정보 갱신 (폴링 방식 추가)
  useEffect(() => {
    if (!roomId) return;
    
    // 초기에 한 번 방 정보 갱신
    pollRoomInfo();
    
    // 3초마다 방 정보 갱신
    const interval = setInterval(() => {
      pollRoomInfo();
    }, 3000);
    
    return () => clearInterval(interval);
  }, [roomId]);

  useEffect(() => {
    if (room?.current_turn === currentPlayer?.id) {
      setHasClickedThisTurn(false);
    }
  }, [room?.current_turn, currentPlayer?.id]);

  const handleCreateRoom = async () => {
    if (!playerName.trim()) {
      alert('플레이어 이름을 입력해주세요.');
      return;
    }

    const newRoomId = await createRoom(playerName);
    if (newRoomId) {
      setRoomId(newRoomId);
    }
  };

  const handleJoinRoom = async (targetRoomId: string) => {
    if (!playerName.trim()) {
      alert('플레이어 이름을 입력해주세요.');
      return;
    }
  
    try {
      // 중복 이름 체크
      const isDuplicate = await checkDuplicateName(targetRoomId, playerName);
      
      if (isDuplicate) {
        alert('이미 참여 중인 이름입니다.');
        return; // 중복된 이름이면 여기서 종료
      }
      
      // 중복된 이름이 없으면 정상 참여 진행
      const player = await joinRoom(targetRoomId, playerName);
      if (player) {
        setRoomId(targetRoomId);
      } else if (error) {
        alert(error); // 다른 오류가 있는 경우
      }
    } catch (err) {
      alert('방 참여 중 오류가 발생했습니다.');
      console.error(err);
    }
  };

  const handleLeaveRoom = async () => {
    if (roomId && currentPlayer) {
      try {
        // 1. 서버에 방 나가기 요청
        await leaveRoom(roomId, currentPlayer.id);
        
        // 2. 마지막 플레이어가 나갈 경우 방 관련 데이터 정리
        if (players.length <= 1) {
          // useBingoGame 훅에 deleteRoom 함수를 추가해야 합니다
          await deleteRoom(roomId);
        }
        
        // 3. 클라이언트 상태 초기화
        setRoomId(null);
        setBingoBoard(Array(25).fill(''));
        setCheckedCells(Array(25).fill(false));
        
        // 4. 홈/로비 화면으로 리다이렉트
        router.push('/game');
      } catch (error) {
        console.error('방 나가기 중 오류 발생:', error);
        alert('방을 나가는 중 문제가 발생했습니다.');
      }
    }
  };

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (playerName.trim()) {
      localStorage.setItem('playerName', playerName);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPlayer) {
      alert('게임에 참여해주세요!');
      return;
    }
    if (!newMessage.trim()) return;

    await sendMessage(newMessage);
    setNewMessage('');
  };

  // 게임 시작 시 빙고판 초기화
  useEffect(() => {
    const initializeBoard = async () => {
      console.log('빙고판 초기화 검사 - 현재 방 상태:', room?.game_status);
      console.log('현재 플레이어:', currentPlayer?.player_name);
      
      if (room?.game_status === 'playing' && currentPlayer) {
        console.log('게임 상태가 playing으로 변경됨 - 빙고판 초기화 시작');
        
        // 이미 생성된 빙고판이 있으면 유지
        if (!bingoBoard.every(cell => cell === '')) {
          console.log('이미 빙고판이 있음:', bingoBoard);
          return;
        }
        
        try {
          // getOrCreatePlayerBoard 함수 호출하여 빙고판 가져오기 또는 생성
          const { board, isNew } = await getOrCreatePlayerBoard(currentPlayer.id);
          console.log(isNew ? '새 빙고판 생성됨:' : '기존 빙고판 로드됨:', board);
          
          // 빙고판 상태 업데이트
          setBingoBoard(board);
        } catch (error) {
          console.error('빙고판 초기화 중 오류:', error);
          
          // 오류 발생 시 로컬에서만 빙고판 생성 (백업 메커니즘)
          console.log('오류 발생으로 로컬 빙고판 생성');
          const numbers = Array.from({ length: 25 }, (_, i) => i + 1);
          const shuffled = numbers.sort(() => Math.random() - 0.5);
          const newBoard = shuffled.map(n => n.toString());
          setBingoBoard(newBoard);
        }
      }
    };
    
    initializeBoard();
  }, [room, currentPlayer]);

  // room 상태 변경 감지 시 확인용 로그
  useEffect(() => {
    if (room) {
      // 상태가 실제로 변경되었을 때만 메시지 표시
      if (prevGameStatus.current !== room.game_status) {
        console.log('방 상태 업데이트:', room.game_status);
        
        if (room.game_status === 'playing' && prevGameStatus.current !== 'playing') {
          console.log('게임이 시작되었습니다! 빙고판을 초기화합니다.');
        } else if (prevGameStatus.current === 'playing' && room.game_status === 'waiting') {
          console.log('게임이 중단되었습니다. 대기 화면으로 돌아갑니다.');
          // 빙고판 초기화
          setBingoBoard(Array(25).fill(''));
          setCheckedCells(Array(25).fill(false));
        }
        
        // 현재 상태를 이전 상태로 저장
        prevGameStatus.current = room.game_status;
      }
      
      // 마지막으로 선택된 셀 정보가 있고, 현재 턴이 아닌 경우에만 처리
      // (자신이 선택한 셀은 이미 handleCellClick에서 처리됨)
      if (
        room.last_cell_index !== undefined && 
        room.last_cell_value && 
        room.current_turn !== currentPlayer?.id
      ) {
        // 마지막 선택된 셀 정보 가져오기
        const lastCellIndex = room.last_cell_index;
        
        // 내 빙고판에서 같은 값을 가진 셀을 체크
        bingoBoard.forEach((value, index) => {
          if (value === room.last_cell_value) {
            const newCheckedCells = [...checkedCells];
            newCheckedCells[index] = true;
            setCheckedCells(newCheckedCells);
            
            console.log(`다른 플레이어가 선택한 "${room.last_cell_value}" 셀이 내 빙고판에 반영되었습니다.`);
          }
        });
      }
    }
  }, [room, currentPlayer?.id]);

  // 다른 플레이어의 선택을 내 보드에도 반영
  useEffect(() => {
    if (room?.last_cell_value && currentPlayer) {
      const newCheckedCells = [...checkedCells];
      let hasChanged = false;

      bingoBoard.forEach((value, index) => {
        if (value === room.last_cell_value && !checkedCells[index]) {
          newCheckedCells[index] = true;
          hasChanged = true;
        }
      });

      if (hasChanged) {
        setCheckedCells(newCheckedCells);
        console.log(`"${room.last_cell_value}" 셀을 자동 체크함`);
      }
    }
  }, [room?.last_cell_value]);

  // 셀 클릭 처리
  const handleCellClick = async (index: number) => {
  if (room?.game_status !== 'playing' || room.current_turn !== currentPlayer?.id) return;

  // 🔒 이미 클릭한 경우 무시
  if (hasClickedThisTurn) return;

  try {
    await submitCell(index, bingoBoard[index]);

    const newCheckedCells = [...checkedCells];
    newCheckedCells[index] = true;
    setCheckedCells(newCheckedCells);

    setHasClickedThisTurn(true); // 🔓 한 번만 허용!
    console.log(`${currentPlayer.player_name}님이 "${bingoBoard[index]}" 셀을 선택했습니다.`);
  } catch (err) {
    console.error('셀 선택 중 오류:', err);
  }
};

  if (loading) {
    return <div className="text-center p-4">로딩 중...</div>;
  }

  if (error) {
    return <div className="text-center p-4 text-red-500">{error}</div>;
  }

  if (!roomId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-md bg-white p-6 rounded-lg shadow-lg">
          <h1 className="text-2xl font-bold text-center text-blue-600 mb-6">
            실시간 빙고 게임
          </h1>
          
          <div className="mb-4">
            <label className="block text-gray-700 mb-2">
              플레이어 이름
            </label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="w-full p-2 border rounded"
              placeholder="이름을 입력하세요"
            />
          </div>

          {showJoinForm ? (
            <div className="mb-4">
              <label className="block text-gray-700 mb-2">
                방 번호
              </label>
              <input
                type="text"
                value={inputRoomId}
                onChange={(e) => setInputRoomId(e.target.value)}
                className="w-full p-2 border rounded mb-2"
                placeholder="4자리 숫자"
                maxLength={4}
              />
              <div className="flex space-x-2">
                <button
                  onClick={() => handleJoinRoom(inputRoomId)}
                  className="flex-1 bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
                >
                  참여하기
                </button>
                <button
                  onClick={() => setShowJoinForm(false)}
                  className="flex-1 bg-gray-500 text-white p-2 rounded hover:bg-gray-600"
                >
                  뒤로
                </button>
              </div>
            </div>
          ) : (
            <div className="flex space-x-2 mb-6">
              <button
                onClick={handleCreateRoom}
                className="flex-1 bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
              >
                방 만들기
              </button>
              <button
                onClick={() => setShowJoinForm(true)}
                className="flex-1 bg-green-500 text-white p-2 rounded hover:bg-green-600"
              >
                방 참여하기
              </button>
            </div>
          )}

          {/* 방 목록 */}
          <div className="mt-6">
            <h2 className="text-lg font-semibold mb-3">현재 개설된 방</h2>
            {roomList.length > 0 ? (
              <div className="space-y-2">
                {roomList.map((room) => (
                  <div
                    key={room.id}
                    className="border rounded p-3 hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleJoinRoom(room.id)}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-medium">방 #{room.id}</span>
                      <span className="text-sm text-gray-500">
                        {room.player_count}명 참여 중
                      </span>
                    </div>
                    <div className="text-sm text-gray-600">
                      방장: {room.host_name}
                    </div>
                    <div className="text-sm text-gray-500">
                      상태: {room.game_status === 'waiting' ? '대기 중' : '게임 중'}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500">현재 개설된 방이 없습니다.</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">방 #{roomId}</h1>
        <button
          onClick={handleLeaveRoom}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
          방 나가기
        </button>
      </div>

      {/* 게임 화면 */}
      <div className="flex-1">
        <div className="container mx-auto p-4">
          <div className="flex flex-col items-center justify-center min-h-screen p-4">
            <div className="w-full max-w-4xl bg-white p-6 rounded-lg shadow-lg">
              <div className="mb-4 flex justify-between items-center">
                <h2 className="text-xl font-bold">방 번호: {roomId}</h2>
                <div className="text-sm text-gray-600">
                  {players.length}명 참가 중
                </div>
              </div>

              <div className="mb-4">
                <h3 className="font-bold mb-2">참가자 목록:</h3>
                <div className="space-y-1">
                  {players.map((player) => (
                    <div
                      key={player.id}
                      className={`p-2 rounded ${
                        room?.current_turn === player.id
                          ? 'bg-yellow-100'
                          : 'bg-gray-100'
                      }`}
                    >
                      {player.player_name}
                      {player.is_host && ' (방장)'}
                      {room?.current_turn === player.id && ' (현재 턴)'}
                    </div>
                  ))}
                </div>
              </div>

              {/* 방장 권한 관련 UI */}
              {currentPlayer?.is_host && room?.game_status === 'waiting' && (
                <button
                  onClick={() => {
                    // 참가자가 2명 미만인 경우 게임 시작 방지
                    if (players.length < 2) {
                      alert('최소 2인 이상 시작 가능합니다!');
                      return;
                    }
                    // 충분한 참가자가 있으면 게임 시작
                    startGame();
                  }}
                  className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600 mb-4"
                >
                  게임 시작
                </button>
              )}

              {room?.game_status === 'playing' && (
                <div className="mb-4">
                  {room.current_turn === currentPlayer?.id ? (
                    <div className="p-3 bg-green-100 rounded text-center">
                      <p className="text-lg font-bold text-green-800">당신의 턴입니다!</p>
                      <p className="text-sm text-green-600">빙고판에서 원하는 항목을 선택하세요.</p>
                    </div>
                  ) : (
                    <div className="p-3 bg-gray-100 rounded text-center">
                      <p className="text-lg font-bold text-gray-700">
                        {players.find((p) => p.id === room.current_turn)?.player_name}님의 턴입니다
                      </p>
                      <p className="text-sm text-gray-600">상대방이 항목을 선택할 때까지 기다려주세요.</p>
                    </div>
                  )}
                  
                  {/* 마지막으로 선택된 항목 표시 */}
                  {room.last_cell_value && (
                    <div className="mt-3 p-2 bg-yellow-100 rounded text-center">
                      <p className="text-sm">
                        마지막 선택: <span className="font-bold">"{room.last_cell_value}"</span>
                        {room.last_player && ` (${players.find(p => p.id === room.last_player)?.player_name})`}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* 빙고 보드 - 클릭 가능 상태 표시 */}
              {room?.game_status === 'playing' && (
                <div className={`grid grid-cols-5 gap-1 mb-4 ${room.current_turn !== currentPlayer?.id ? 'opacity-80' : ''}`}>
                  {bingoBoard.map((value, index) => (
                    <div
                      key={index}
                      onClick={() => handleCellClick(index)}
                      className={`
                        aspect-square flex items-center justify-center
                        border rounded text-lg font-bold
                        ${checkedCells[index] ? 'bg-blue-500 text-white' : 'bg-gray-100'}
                        ${room.current_turn === currentPlayer?.id && !checkedCells[index] 
                          ? 'cursor-pointer hover:bg-blue-100' 
                          : 'cursor-default'}
                        transition-colors
                      `}
                    >
                      {value}
                    </div>
                  ))}
                </div>
              )}

              {/* 채팅 메시지 표시 - ref 변경 */}
              <div ref={chatContainerRef} className="border rounded p-4 mb-4 h-64 overflow-y-auto">
                {/* 중복 제거를 위해 메시지 ID 기준으로 필터링 */}
                {messages
                  .filter((msg, index, self) => 
                    index === self.findIndex(m => m.id === msg.id)
                  )
                  .map((msg) => (
                    <div key={msg.id} className="mb-2">
                      <span className="font-bold">
                        {players.find(p => p.id === msg.player_id)?.player_name || '알 수 없음'}:
                      </span>
                      <span className="ml-2">{msg.message}</span>
                      <span className="text-sm text-gray-500 ml-2">
                        {new Date(msg.created_at).toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
              </div>

              {/* 메시지 입력 */}
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="메시지를 입력하세요"
                  className="flex-1 border p-2 rounded"
                />
                <button
                  type="submit"
                  className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                >
                  전송
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}