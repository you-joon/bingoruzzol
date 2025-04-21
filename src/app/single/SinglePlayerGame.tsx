"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

// 로컬 스토리지 키
const STORAGE_KEY = "bingo_game_state";

export default function SinglePlayerGame() {
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
      const url = `${window.location.origin}/single?state=${encodedState}&name=${encodedName}&comment=${encodedComment}`;
      
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
    
    // 중복 체크
    checkDuplicates(newBoard);
    
    // 빈 칸 경고 상태 업데이트
    const hasEmptyCells = newBoard.some(cell => removeAllSpaces(cell) === "");
    setShowEmptyWarning(hasEmptyCells);
  };

  // 셀 포커스 처리
  const handleCellFocus = (index: number) => {
    setFocusedCell(index);
  };

  // 셀 포커스 아웃 처리
  const handleCellBlur = () => {
    setFocusedCell(null);
  };

  // 모든 공백 제거
  const removeAllSpaces = (str: string): string => {
    return str.replace(/\s/g, '');
  };

  // 중복 값 체크
  const checkDuplicates = (board: string[]) => {
    const duplicates: number[] = [];
    const values = board.map(cell => removeAllSpaces(cell).toLowerCase());
    
    values.forEach((value, index) => {
      if (value !== '') {
        const firstIndex = values.indexOf(value);
        if (firstIndex !== index) {
          duplicates.push(firstIndex, index);
        }
      }
    });
    
    setDuplicateValues([...new Set(duplicates)]);
  };

  // 보드 저장
  const saveBoard = () => {
    // 빈 칸이나 중복이 있으면 저장하지 않음
    if (showEmptyWarning) {
      alert("모든 칸을 채워주세요!");
      return;
    }
    if (duplicateValues.length > 0) {
      alert("중복된 항목을 수정해주세요!");
      return;
    }
    
    setIsSaved(true);
    alert("빙고판이 저장되었습니다!");
  };

  // 게임 시작
  const startGame = () => {
    if (!isSaved) {
      alert("먼저 빙고판을 저장해주세요!");
      return;
    }
    setGameStarted(true);
    setGameStartTime(new Date());
  };

  // 셀 클릭 처리
  const handleCellClick = (index: number) => {
    if (!gameStarted || isGameOver) return;
    
    const newClickedCells = [...clickedCells];
    newClickedCells[index] = !newClickedCells[index];
    setClickedCells(newClickedCells);
    
    // 빙고 체크
    const lines = checkBingo(newClickedCells);
    setCompletedLines(lines.length);
    setCompletedLineIndices(lines);
    
    // 승리 조건 달성 체크
    if (lines.length >= winCondition) {
      setIsGameOver(true);
      setGameEndTime(new Date());
    }
  };

  // 셀이 완성된 라인에 포함되어 있는지 확인
  const isCellInCompletedLine = (index: number): boolean => {
    return completedLineIndices.some(line => line.includes(index));
  };

  // 시간 포맷팅
  const formatTime = (date: Date): string => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  };

  // 경과 시간 계산
  const calculateElapsedTime = (start: Date, end: Date): string => {
    const diff = end.getTime() - start.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    if (hours > 0) {
      return `${hours}시간 ${minutes}분 ${seconds}초`;
    } else if (minutes > 0) {
      return `${minutes}분 ${seconds}초`;
    } else {
      return `${seconds}초`;
    }
  };

  // 빙고 체크
  const checkBingo = (cells: boolean[]): number[][] => {
    const lines: number[][] = [];
    
    // 가로 줄 체크
    for (let i = 0; i < 5; i++) {
      const row = Array.from({length: 5}, (_, j) => i * 5 + j);
      if (row.every(index => cells[index])) {
        lines.push(row);
      }
    }
    
    // 세로 줄 체크
    for (let i = 0; i < 5; i++) {
      const col = Array.from({length: 5}, (_, j) => i + j * 5);
      if (col.every(index => cells[index])) {
        lines.push(col);
      }
    }
    
    // 대각선 체크 (좌상단 -> 우하단)
    const diag1 = Array.from({length: 5}, (_, i) => i * 6);
    if (diag1.every(index => cells[index])) {
      lines.push(diag1);
    }
    
    // 대각선 체크 (우상단 -> 좌하단)
    const diag2 = Array.from({length: 5}, (_, i) => (i + 1) * 4).slice(0, -1);
    if (diag2.every(index => cells[index])) {
      lines.push(diag2);
    }
    
    return lines;
  };

  // 게임 리셋
  const resetGame = () => {
    setGameStarted(false);
    setClickedCells(Array(25).fill(false));
    setCompletedLines(0);
    setIsGameOver(false);
    setGameStartTime(null);
    setGameEndTime(null);
    setCompletedLineIndices([]);
  };

  // 새 게임
  const newGame = () => {
    if (confirm("새 게임을 시작하시겠습니까? 현재 게임의 진행 상황은 저장되지 않습니다.")) {
      setBingoBoard(Array(25).fill(""));
      setClickedCells(Array(25).fill(false));
      setCompletedLines(0);
      setIsGameOver(false);
      setIsSaved(false);
      setDuplicateValues([]);
      setShowEmptyWarning(true);
      setGameStarted(false);
      setGameStartTime(null);
      setGameEndTime(null);
      setCompletedLineIndices([]);
      setShareUrl("");
      setShowShareMessage(false);
      setPlayerName("");
      setComment("");
    }
  };

  // 검색 처리
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const searchTerm = removeAllSpaces(searchValue).toLowerCase();
    if (searchTerm === "") return;
    
    const foundIndex = bingoBoard.findIndex(
      cell => removeAllSpaces(cell).toLowerCase() === searchTerm
    );
    
    if (foundIndex !== -1) {
      // 찾은 셀로 스크롤
      const cell = document.getElementById(`cell-${foundIndex}`);
      if (cell) {
        cell.scrollIntoView({ behavior: 'smooth', block: 'center' });
        cell.classList.add('highlight');
        setTimeout(() => cell.classList.remove('highlight'), 2000);
      }
    } else {
      alert("찾으시는 항목이 없습니다.");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gradient-to-b from-blue-100 to-purple-100">
      <div className="w-full max-w-lg bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-blue-600">빙고 게임</h1>
          <div className="flex gap-2">
            <button
              onClick={newGame}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              새 게임
            </button>
            <Link
              href="/"
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
            >
              메인으로
            </Link>
          </div>
        </div>

        {!gameStarted && (
          <div className="mb-4">
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="이름을 입력하세요"
              className="w-full p-2 border rounded mb-2"
            />
            <div className="flex gap-2">
              <input
                type="number"
                value={winCondition}
                onChange={(e) => setWinCondition(Math.max(1, Math.min(12, parseInt(e.target.value) || 1)))}
                min="1"
                max="12"
                className="w-24 p-2 border rounded"
              />
              <span className="p-2">줄 빙고</span>
            </div>
          </div>
        )}

        {!gameStarted && (
          <form onSubmit={handleSearch} className="mb-4 flex gap-2">
            <input
              type="text"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="찾을 내용을 입력하세요"
              className="flex-1 p-2 border rounded"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              검색
            </button>
          </form>
        )}

        <div className="grid grid-cols-5 gap-2 mb-4">
          {bingoBoard.map((cell, index) => (
            <div
              key={index}
              id={`cell-${index}`}
              className={`
                relative aspect-square border rounded p-2 flex items-center justify-center text-center
                ${gameStarted ? 'cursor-pointer' : 'cursor-text'}
                ${clickedCells[index] ? 'bg-blue-200' : 'bg-white'}
                ${duplicateValues.includes(index) ? 'border-red-500 border-2' : ''}
                ${isCellInCompletedLine(index) ? 'bg-green-200' : ''}
                ${focusedCell === index ? 'border-blue-500 border-2' : ''}
                transition-colors
              `}
              onClick={() => handleCellClick(index)}
            >
              {gameStarted ? (
                <span className="break-all">{cell}</span>
              ) : (
                <textarea
                  value={cell}
                  onChange={(e) => handleCellChange(index, e.target.value)}
                  onFocus={() => handleCellFocus(index)}
                  onBlur={handleCellBlur}
                  className="w-full h-full resize-none bg-transparent text-center"
                />
              )}
            </div>
          ))}
        </div>

        {showEmptyWarning && !gameStarted && (
          <p className="text-red-500 mb-4">모든 칸을 채워주세요!</p>
        )}

        {duplicateValues.length > 0 && !gameStarted && (
          <p className="text-red-500 mb-4">중복된 항목이 있습니다!</p>
        )}

        {!gameStarted ? (
          <div className="flex gap-2">
            <button
              onClick={saveBoard}
              disabled={showEmptyWarning || duplicateValues.length > 0}
              className={`
                flex-1 px-4 py-2 rounded text-white transition-colors
                ${(showEmptyWarning || duplicateValues.length > 0)
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-500 hover:bg-blue-600'}
              `}
            >
              빙고판 저장
            </button>
            <button
              onClick={startGame}
              disabled={!isSaved}
              className={`
                flex-1 px-4 py-2 rounded text-white transition-colors
                ${!isSaved
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-green-500 hover:bg-green-600'}
              `}
            >
              게임 시작
            </button>
          </div>
        ) : (
          <div className="text-center">
            <p className="mb-2">
              {completedLines}줄 빙고! ({winCondition}줄 달성 시 승리)
            </p>
            {gameStartTime && !isGameOver && (
              <p className="text-sm text-gray-600">
                게임 시작: {formatTime(gameStartTime)}
              </p>
            )}
            {isGameOver && gameStartTime && gameEndTime && (
              <>
                <p className="text-lg font-bold text-green-600 mb-2">
                  게임 클리어!
                </p>
                <p className="text-sm text-gray-600">
                  시작: {formatTime(gameStartTime)}
                  <br />
                  종료: {formatTime(gameEndTime)}
                  <br />
                  소요 시간: {calculateElapsedTime(gameStartTime, gameEndTime)}
                </p>
                <div className="mt-4">
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="게임 결과에 대한 코멘트를 남겨주세요"
                    className="w-full p-2 border rounded mb-2"
                    rows={2}
                  />
                  <button
                    onClick={shareGameState}
                    className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                  >
                    결과 공유하기
                  </button>
                </div>
              </>
            )}
            {!isGameOver && (
              <button
                onClick={resetGame}
                className="mt-4 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
              >
                다시 시작
              </button>
            )}
          </div>
        )}

        {showShareMessage && (
          <div className="mt-4 p-4 bg-green-100 rounded">
            <p className="text-green-600 mb-2">URL이 클립보드에 복사되었습니다!</p>
            <p className="text-sm break-all">{shareUrl}</p>
          </div>
        )}
      </div>
    </div>
  );
} 