"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

// 로컬 스토리지 키
const STORAGE_KEY = "bingo_game_state";

export default function GameClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // 게임 상태 관리
  const [gameStarted, setGameStarted] = useState<boolean>(false);
  const [winCondition, setWinCondition] = useState<number>(3); // 기본 승리 조건: 3줄
  const [bingoBoard, setBingoBoard] = useState<string[]>(Array(25).fill(""));
  const [clickedCells, setClickedCells] = useState<boolean[]>(Array(25).fill(false));
  const [completedLines, setCompletedLines] = useState<number>(0);
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [duplicateValues, setDuplicateValues] = useState<number[]>([]);
  const [focusedCell, setFocusedCell] = useState<number | null>(null);
  const [showEmptyWarning, setShowEmptyWarning] = useState<boolean>(false);
  const [gameStartTime, setGameStartTime] = useState<Date | null>(null);
  const [gameEndTime, setGameEndTime] = useState<Date | null>(null);
  const [completedLineIndices, setCompletedLineIndices] = useState<number[][]>([]);
  const [shareUrl, setShareUrl] = useState<string>("");
  const [showShareMessage, setShowShareMessage] = useState<boolean>(false);
  const [playerName, setPlayerName] = useState<string>("");
  const [comment, setComment] = useState<string>("");
  const [searchValue, setSearchValue] = useState<string>("");

  // URL에서 게임 상태 불러오기
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        // URL에서 게임 상태 파라미터 확인
        const state = searchParams.get('state');
        const name = searchParams.get('name');
        const msg = searchParams.get('comment');
        
        if (state) {
          // URL에서 상태를 불러옴
          const decodedState = JSON.parse(atob(state));
          
          setGameStarted(decodedState.gameStarted);
          setWinCondition(decodedState.winCondition);
          setBingoBoard(decodedState.bingoBoard);
          setClickedCells(decodedState.clickedCells);
          setCompletedLines(decodedState.completedLines);
          setIsGameOver(decodedState.isGameOver);
          setIsSaved(decodedState.isSaved);
          setCompletedLineIndices(decodedState.completedLineIndices || []);
          
          // 날짜 객체 복원
          if (decodedState.gameStartTime) {
            setGameStartTime(new Date(decodedState.gameStartTime));
          }
          if (decodedState.gameEndTime) {
            setGameEndTime(new Date(decodedState.gameEndTime));
          }
          
          // 이름과 코멘트 표시
          if (name) setPlayerName(decodeURIComponent(name));
          if (msg) setComment(decodeURIComponent(msg));
          
          // URL에서 불러온 후 알림 표시
          alert(`${name || "누군가"}의 게임 결과가 로드되었습니다!`);
          
          // 로컬 스토리지에도 저장
          localStorage.setItem(STORAGE_KEY, JSON.stringify(decodedState));
          
          return; // URL에서 불러왔으므로 로컬 스토리지 로드는 건너뛰기
        }
        
        // URL에 상태가 없으면 로컬 스토리지에서 불러오기
        const savedState = localStorage.getItem(STORAGE_KEY);
        if (savedState) {
          const {
            gameStarted,
            winCondition,
            bingoBoard,
            clickedCells,
            completedLines,
            isGameOver,
            isSaved,
            gameStartTime,
            gameEndTime,
            completedLineIndices,
            playerName: savedName
          } = JSON.parse(savedState);

          setGameStarted(gameStarted);
          setWinCondition(winCondition);
          setBingoBoard(bingoBoard);
          setClickedCells(clickedCells);
          setCompletedLines(completedLines);
          setIsGameOver(isGameOver);
          setIsSaved(isSaved);
          setCompletedLineIndices(completedLineIndices || []);
          if (savedName) setPlayerName(savedName);
          
          // 날짜 객체 복원
          if (gameStartTime) setGameStartTime(new Date(gameStartTime));
          if (gameEndTime) setGameEndTime(new Date(gameEndTime));

          // 빈 칸 경고 상태 설정
          const hasEmptyCells = bingoBoard.some((cell: string) => removeAllSpaces(cell) === "");
          setShowEmptyWarning(hasEmptyCells && !isSaved);
        } else {
          setShowEmptyWarning(true);
        }
      } catch (error) {
        console.error("게임 상태 로드 중 오류:", error);
      }
    }
  }, [searchParams]);

  // 게임 상태 변경 시 로컬 스토리지에 저장
  useEffect(() => {
    if (typeof window !== 'undefined' && bingoBoard.some(cell => cell !== "")) {
      try {
        const stateToSave = {
          gameStarted,
          winCondition,
          bingoBoard,
          clickedCells,
          completedLines,
          isGameOver,
          isSaved,
          gameStartTime,
          gameEndTime,
          completedLineIndices,
          playerName
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
      } catch (error) {
        console.error("게임 상태 저장 중 오류:", error);
      }
    }
  }, [
    gameStarted,
    winCondition,
    bingoBoard,
    clickedCells,
    completedLines,
    isGameOver,
    isSaved,
    gameStartTime,
    gameEndTime,
    completedLineIndices,
    playerName
  ]);

  // 게임 결과 공유 함수
  const shareGameState = () => {
    try {
      // 게임 상태를 문자열로 변환하고 Base64로 인코딩
      const stateToShare = {
        gameStarted,
        winCondition,
        bingoBoard,
        clickedCells,
        completedLines,
        isGameOver,
        isSaved,
        gameStartTime: gameStartTime?.toISOString(),
        gameEndTime: gameEndTime?.toISOString(),
        completedLineIndices
      };
      
      const encodedState = btoa(JSON.stringify(stateToShare));
      const encodedName = encodeURIComponent(playerName || "");
      const encodedComment = encodeURIComponent(comment || "");
      
      // URL 생성
      const url = `${window.location.origin}${window.location.pathname}?state=${encodedState}&name=${encodedName}&comment=${encodedComment}`;
      
      // 클립보드에 복사
      navigator.clipboard.writeText(url).then(
        () => {
          setShareUrl(url);
          setShowShareMessage(true);
          setTimeout(() => setShowShareMessage(false), 5000); // 5초 후 메시지 숨김
        },
        (err) => {
          console.error('클립보드 복사 실패:', err);
          alert('URL을 클립보드에 복사할 수 없습니다. 직접 복사해주세요.');
        }
      );
    } catch (error) {
      console.error("게임 상태 공유 중 오류:", error);
      alert("게임 상태를 공유하는 중 오류가 발생했습니다.");
    }
  };

  // 셀 내용 변경 처리
  const handleCellChange = (index: number, value: string) => {
    if (gameStarted) return; // 게임 시작되면 편집 불가
    
    const newBoard = [...bingoBoard];
    newBoard[index] = value;
    setBingoBoard(newBoard);
    
    // 저장 상태 및 경고 업데이트
    setIsSaved(false);
    const hasEmptyCells = newBoard.some(cell => removeAllSpaces(cell) === "");
    setShowEmptyWarning(hasEmptyCells);
    
    // 중복 값 체크
    checkDuplicates(newBoard);
  };

  const handleCellFocus = (index: number) => {
    setFocusedCell(index);
  };
  
  const handleCellBlur = () => {
    setFocusedCell(null);
  };

  // 모든 공백 제거 함수
  const removeAllSpaces = (str: string): string => {
    return str.replace(/\s+/g, "");
  };

  // 중복 체크 함수
  const checkDuplicates = (board: string[]) => {
    const valueMap = new Map<string, number>();
    const duplicates: number[] = [];
    
    board.forEach((value, index) => {
      const trimmedValue = removeAllSpaces(value);
      if (trimmedValue === "") return;
      
      if (valueMap.has(trimmedValue)) {
        duplicates.push(index);
        duplicates.push(valueMap.get(trimmedValue)!);
      } else {
        valueMap.set(trimmedValue, index);
      }
    });
    
    // 중복 인덱스 중복 제거
    const uniqueDuplicates = [...new Set(duplicates)];
    setDuplicateValues(uniqueDuplicates);
  };

  // 보드 저장 및 게임 준비
  const saveBoard = () => {
    // 모든 값이 입력되었는지 확인
    const hasEmptyCells = bingoBoard.some(cell => removeAllSpaces(cell) === "");
    if (hasEmptyCells) {
      setShowEmptyWarning(true);
      return;
    }
    
    // 중복된 값이 있는지 확인
    if (duplicateValues.length > 0) {
      return;
    }
    
    setIsSaved(true);
    setShowEmptyWarning(false);
  };

  // 게임 시작
  const startGame = () => {
    setGameStarted(true);
    setGameStartTime(new Date());
    setGameEndTime(null);
    setCompletedLineIndices([]);
  };

  // 셀 클릭 처리
  const handleCellClick = (index: number) => {
    if (!gameStarted || isGameOver) return; // 게임 시작 전이나 게임 종료 후에는 클릭 불가
    
    // 이미 체크된 셀인 경우 취소 확인
    if (clickedCells[index]) {
      const confirmCancel = window.confirm("이 항목 체크를 취소하시겠습니까?");
      if (confirmCancel) {
        const newClickedCells = [...clickedCells];
        newClickedCells[index] = false;
        setClickedCells(newClickedCells);
      }
      return;
    }
    
    // 체크되지 않은 셀 체크
    const newClickedCells = [...clickedCells];
    newClickedCells[index] = true;
    setClickedCells(newClickedCells);
  };

  // 셀이 완성된 빙고 줄에 포함되어 있는지 확인
  const isCellInCompletedLine = (index: number): boolean => {
    return completedLineIndices.some(line => line.includes(index));
  };

  // 시간 포맷팅 함수
  const formatTime = (date: Date): string => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    return `${hours}시 ${minutes}분 ${seconds}초`;
  };

  // 경과 시간 계산 함수
  const calculateElapsedTime = (start: Date, end: Date): string => {
    const elapsedMs = end.getTime() - start.getTime();
    const seconds = Math.floor(elapsedMs / 1000) % 60;
    const minutes = Math.floor(elapsedMs / (1000 * 60)) % 60;
    const hours = Math.floor(elapsedMs / (1000 * 60 * 60));
    
    return `${hours > 0 ? hours + '시간 ' : ''}${minutes}분 ${seconds}초`;
  };

  // 클릭된 셀이 변경될 때마다 빙고 체크
  useEffect(() => {
    if (!gameStarted) return;

    // 가로, 세로, 대각선 라인 정의
    const lines = [
      // 가로 라인
      [0, 1, 2, 3, 4],
      [5, 6, 7, 8, 9],
      [10, 11, 12, 13, 14],
      [15, 16, 17, 18, 19],
      [20, 21, 22, 23, 24],
      // 세로 라인
      [0, 5, 10, 15, 20],
      [1, 6, 11, 16, 21],
      [2, 7, 12, 17, 22],
      [3, 8, 13, 18, 23],
      [4, 9, 14, 19, 24],
      // 대각선 라인
      [0, 6, 12, 18, 24],
      [4, 8, 12, 16, 20]
    ];
    
    // 완성된 라인 개수와 해당 인덱스 추적
    let completedCount = 0;
    const newCompletedLineIndices: number[][] = [];
    
    // 각 라인 확인
    for (const line of lines) {
      const isComplete = line.every(index => clickedCells[index]);
      if (isComplete) {
        completedCount++;
        newCompletedLineIndices.push(line);
      }
    }
    
    setCompletedLines(completedCount);
    setCompletedLineIndices(newCompletedLineIndices);
    
    // 게임 종료 확인
    if (completedCount >= winCondition && !isGameOver) {
      setIsGameOver(true);
      setGameEndTime(new Date());
    }
  }, [clickedCells, gameStarted, winCondition, isGameOver]);

  // 게임 초기화
  const resetGame = () => {
    // 사용자에게 확인 요청
    if (!window.confirm("정말로 게임을 초기화하시겠습니까? 모든 데이터가 삭제됩니다.")) {
      return;
    }
    
    setBingoBoard(Array(25).fill(""));
    setClickedCells(Array(25).fill(false));
    setGameStarted(false);
    setCompletedLines(0);
    setIsGameOver(false);
    setIsSaved(false);
    setDuplicateValues([]);
    setFocusedCell(null);
    setShowEmptyWarning(true);
    setGameStartTime(null);
    setGameEndTime(null);
    setCompletedLineIndices([]);
    setPlayerName("");
    setComment("");
    
    // 로컬 스토리지 초기화
    localStorage.removeItem(STORAGE_KEY);
    
    // URL 파라미터 제거
    router.push(window.location.pathname);
  };

  // 게임 저장 초기화 (새 게임)
  const newGame = () => {
    // 사용자에게 확인 요청
    if (!window.confirm("새 게임을 시작하시겠습니까?")) {
      return;
    }
    
    setBingoBoard(Array(25).fill(""));
    setClickedCells(Array(25).fill(false));
    setGameStarted(false);
    setCompletedLines(0);
    setIsGameOver(false);
    setIsSaved(false);
    setDuplicateValues([]);
    setFocusedCell(null);
    setShowEmptyWarning(true);
    setGameStartTime(null);
    setGameEndTime(null);
    setCompletedLineIndices([]);
    setComment("");
  };

  // 검색 기능 - 입력값과 정확히 일치하는 셀 체크
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!gameStarted || isGameOver || !searchValue.trim()) return;
    
    // 검색값과 정확히 일치하는 셀 찾기
    const newClickedCells = [...clickedCells];
    let found = false;
    
    bingoBoard.forEach((cellValue, index) => {
      // 정확히 일치하는지 확인 (앞뒤 공백 제거)
      if (cellValue.trim() === searchValue.trim()) {
        newClickedCells[index] = true;
        found = true;
      }
    });
    
    if (found) {
      setClickedCells(newClickedCells);
      // 검색 성공 후 입력창 초기화
      setSearchValue("");
    } else {
      // 일치하는 값을 찾지 못했을 때 알림 (선택사항)
      alert(`"${searchValue}"를 찾을 수 없습니다.`);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gradient-to-b from-blue-100 to-purple-100">
      <div className="w-full max-w-4xl bg-white p-6 rounded-lg shadow-lg">
        <h1 className="text-2xl font-bold text-center text-blue-600 mb-4">5x5 빙고 게임</h1>
        
        {!gameStarted && !isSaved && (
          <div className="mb-4">
            <label className="block text-gray-700 mb-2">이름:</label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="이름을 입력하세요"
              className="w-full p-2 border rounded mb-4"
            />
          </div>
        )}
        
        {!gameStarted && (
          <div className="mb-4">
            <label className="block text-gray-700 mb-2">승리 조건 (빙고 줄 수):</label>
            <div className="flex justify-between">
              {[3, 4, 5].map((value) => (
                <button
                  key={value}
                  onClick={() => setWinCondition(value)}
                  className={`flex-1 mx-1 py-2 rounded ${
                    winCondition === value
                      ? "bg-blue-500 text-white"
                      : "bg-gray-200 text-gray-800"
                  }`}
                >
                  {value}줄
                </button>
              ))}
            </div>
          </div>
        )}
        
        {playerName && (
          <div className="mb-4 text-center">
            <p className="font-medium text-purple-700">
              플레이어: <span className="font-bold">{playerName}</span>
            </p>
          </div>
        )}
        
        <div className="mb-4 grid grid-cols-5 gap-1">
          {bingoBoard.map((cell, index) => (
            <div
              key={index}
              className={`aspect-square flex items-center justify-center border p-1 overflow-hidden ${
                gameStarted && isCellInCompletedLine(index)
                  ? "bg-green-500 text-white"
                  : clickedCells[index]
                  ? "bg-blue-500 text-white"
                  : duplicateValues.includes(index) && !isSaved && focusedCell !== index
                  ? "bg-red-100 border-red-500"
                  : "bg-white text-gray-800"
              } ${gameStarted ? "cursor-pointer" : ""}`}
              onClick={() => handleCellClick(index)}
            >
              {gameStarted ? (
                <span className="text-sm sm:text-base font-medium break-words overflow-hidden text-center">
                  {cell}
                </span>
              ) : (
                <textarea
                  value={cell}
                  onChange={(e) => handleCellChange(index, e.target.value)}
                  onFocus={() => handleCellFocus(index)}
                  onBlur={handleCellBlur}
                  className={`w-full h-full text-center text-sm resize-none ${
                    duplicateValues.includes(index) && !isSaved && focusedCell !== index ? "text-red-500" : ""
                  }`}
                  maxLength={25}
                  readOnly={isSaved}
                  rows={3}
                />
              )}
            </div>
          ))}
        </div>
        
        {duplicateValues.length > 0 && !isSaved && (
          <div className="text-center mb-4 p-2 bg-red-100 text-red-800 rounded text-sm">
            중복된 값이 있습니다. 모든 값은 고유해야 합니다.
          </div>
        )}
        
        {showEmptyWarning && !isSaved && (
          <div className="text-center mb-4 p-2 bg-yellow-100 text-yellow-800 rounded text-sm">
            모든 칸을 채워주세요.
          </div>
        )}
        
        {showShareMessage && (
          <div className="fixed top-5 right-5 bg-green-500 text-white px-4 py-3 rounded shadow-lg transition-opacity duration-300 z-50">
            <p className="font-medium">URL이 클립보드에 복사되었습니다!</p>
          </div>
        )}
        
        {gameStarted && !isGameOver && (
          <div className="text-center mb-4">
            <p className="text-lg font-medium">
              완성된 줄: <span className="text-blue-600">{completedLines}</span> / {winCondition}
            </p>
            {gameStartTime && (
              <p className="text-sm text-gray-600 mt-1">
                게임 시작 시간: {formatTime(gameStartTime)}
              </p>
            )}
            
            {/* 검색 기능 */}
            <div className="mt-4">
              <form onSubmit={handleSearch} className="flex">
                <input
                  type="text"
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  placeholder="정확한 값을 입력하세요"
                  className="flex-1 p-2 border rounded-l focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded-r hover:bg-blue-600"
                >
                  찾기
                </button>
              </form>
              <p className="text-xs text-gray-500 mt-1">
                * 값이 정확히 일치하는 칸만 선택됩니다
              </p>
            </div>
          </div>
        )}
        
        {isGameOver && (
          <div className="text-center mb-4 p-3 bg-yellow-100 text-yellow-800 rounded">
            <p className="text-xl font-bold">빙고! 게임 종료</p>
            {gameEndTime && (
              <>
                <p className="mt-2">
                  완료 시간: <span className="font-bold">{formatTime(gameEndTime)}</span>
                </p>
                {gameStartTime && (
                  <p className="mt-1 text-sm">
                    총 소요 시간: {calculateElapsedTime(gameStartTime, gameEndTime)}
                  </p>
                )}
              </>
            )}
            
            {/* 게임 종료 후 코멘트 입력 및 공유 기능 */}
            <div className="mt-4">
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="결과에 대한 코멘트를 남겨보세요!"
                className="w-full p-2 border rounded-lg resize-none text-gray-800"
                rows={2}
                maxLength={100}
              />
              <button
                onClick={shareGameState}
                className="w-full mt-2 px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
              >
                결과 공유하기
              </button>
            </div>
          </div>
        )}
        
        {/* 공유된 게임일 경우 코멘트 표시 */}
        {comment && searchParams.get('state') && (
          <div className="mb-4 p-3 bg-purple-100 text-purple-800 rounded">
            <p className="font-bold">{playerName}의 코멘트:</p>
            <p className="italic">&quot;{comment}&quot;</p>
          </div>
        )}
        
        <div className="flex justify-center space-x-4 flex-wrap">
          {!gameStarted ? (
            <>
              {!isSaved ? (
                <button
                  onClick={saveBoard}
                  className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 min-w-[100px]"
                  disabled={bingoBoard.some(cell => removeAllSpaces(cell) === "") || duplicateValues.length > 0}
                >
                  저장하기
                </button>
              ) : (
                <button
                  onClick={startGame}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 min-w-[100px]"
                >
                  게임 시작
                </button>
              )}
              <button
                onClick={newGame}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 min-w-[100px]"
              >
                새 게임
              </button>
            </>
          ) : (
            <>
              {isGameOver && (
                <button
                  onClick={newGame}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 min-w-[100px]"
                >
                  새 게임
                </button>
              )}
              <button
                onClick={resetGame}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 min-w-[100px]"
              >
                초기화
              </button>
            </>
          )}
          
          <Link 
            href="/" 
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 min-w-[100px] text-center"
          >
            메인으로
          </Link>
        </div>

        <div className="mt-4 text-xs text-center text-gray-500">
          <p>게임 데이터는 자동으로 저장됩니다. 브라우저를 껐다 켜도 게임을 이어서 진행할 수 있습니다.</p>
          <p className="mt-1">게임 종료 후에 결과를 공유할 수 있습니다.</p>
        </div>
      </div>
    </div>
  );
}