"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import Maze from "./Maze";
import Player from "./Player";
import Question from "./Question";
import { generateMaze } from "../utils/mazeGenerator";
import { questions } from "../data/questions";
import Leaderboard from "./Leaderboard";
import ThemeToggle from "./ThemeToggle";

export type CellType =
  | "empty"
  | "wall"
  | "start"
  | "end"
  | "question"
  | "obstacle";

export type MazeType = CellType[][];

export interface Position {
  x: number;
  y: number;
}

export type Level = "easy" | "medium" | "hard";

export const levelSettings: Record<
  Level,
  {
    mazeSize: { width: number; height: number };
    questionCount: number;
    obstacleCount: number;
    scoreMultiplier: number;
    defaultZoom: number;
  }
> = {
  easy: {
    mazeSize: { width: 13, height: 13 },
    questionCount: 5,
    obstacleCount: 3,
    scoreMultiplier: 1.0,
    defaultZoom: 150,
  },
  medium: {
    mazeSize: { width: 16, height: 16 },
    questionCount: 8,
    obstacleCount: 5,
    scoreMultiplier: 1.5,
    defaultZoom: 115,
  },
  hard: {
    mazeSize: { width: 19, height: 19 },
    questionCount: 12,
    obstacleCount: 7,
    scoreMultiplier: 2.0,
    defaultZoom: 100,
  },
};

const Game: React.FC = () => {
  const [level, setLevel] = useState<Level>("easy");
  const [maze, setMaze] = useState<MazeType>([]);
  const [playerPosition, setPlayerPosition] = useState<Position>({
    x: 0,
    y: 0,
  });
  const [endPosition, setEndPosition] = useState<Position>({ x: 0, y: 0 });
  const [currentQuestion, setCurrentQuestion] = useState<number | null>(null);
  const [gameStatus, setGameStatus] = useState<"playing" | "won" | "intro">(
    "intro"
  );
  const [moveCount, setMoveCount] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [, setLastMove] = useState<{ dx: number; dy: number } | null>(null);
  const [score, setScore] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [wrongAnswers, setWrongAnswers] = useState(0);
  const [gameTime, setGameTime] = useState(0);
  const [gameTimer] = useState<NodeJS.Timeout | null>(null);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [gameCompleted, setGameCompleted] = useState(false);
  const [timerActive, setTimerActive] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [mazeWidth, setMazeWidth] = useState(15);
  const [mazeHeight, setMazeHeight] = useState(15);
  const [questionCount, setQuestionCount] = useState(5);
  const [obstacleCount, setObstacleCount] = useState(3);
  const [scoreSubmitted, setScoreSubmitted] = useState(false);

  // 音效參考
  const moveSound = useRef<HTMLAudioElement | null>(null);
  const wallSound = useRef<HTMLAudioElement | null>(null);
  const questionSound = useRef<HTMLAudioElement | null>(null);
  const obstacleSound = useRef<HTMLAudioElement | null>(null);
  const winSound = useRef<HTMLAudioElement | null>(null);
  const dreamSound = useRef<HTMLAudioElement | null>(null);

  // 添加新的狀態來控制名稱輸入模態視窗
  const [showNameInputModal, setShowNameInputModal] = useState(false);
  const [playerName, setPlayerName] = useState("");

  // 添加縮放狀態
  const [zoomLevel, setZoomLevel] = useState(100); // 百分比

  // 縮放控制函數 - 根據難度調整最小縮放限制
  const handleZoomOut = () => {
    const minZoom = levelSettings[level].defaultZoom - 20;
    setZoomLevel((prev) => Math.max(prev - 10, minZoom));
  };

  const handleZoomIn = () => {
    const maxZoom = levelSettings[level].defaultZoom + 30;
    setZoomLevel((prev) => Math.min(prev + 5, maxZoom));
  };

  // 初始化音效
  useEffect(() => {
    if (typeof window !== "undefined") {
      moveSound.current = new Audio("/sounds/move.mp3");
      wallSound.current = new Audio("/sounds/wall.mp3");
      questionSound.current = new Audio("/sounds/question.mp3");
      obstacleSound.current = new Audio("/sounds/teleport.mp3");
      winSound.current = new Audio("/sounds/win.mp3");
      dreamSound.current = new Audio("/sounds/dream.mp3");
    }
  }, []);

  // 初始化遊戲
  const initGame = useCallback(() => {
    // 獲取當前難度的設置
    const settings = levelSettings[level];

    // 使用難度設置生成迷宮
    const newMaze = generateMaze(
      settings.mazeSize.width,
      settings.mazeSize.height,
      settings.questionCount,
      settings.obstacleCount
    );

    // 設置迷宮尺寸變數，用於計算和顯示
    setMazeWidth(settings.mazeSize.width);
    setMazeHeight(settings.mazeSize.height);
    setQuestionCount(settings.questionCount);
    setObstacleCount(settings.obstacleCount);

    // 設置預設縮放級別
    setZoomLevel(settings.defaultZoom);

    // 找到起點和終點
    let startPos = { x: 0, y: 0 };
    let endPos = { x: 0, y: 0 };

    for (let y = 0; y < newMaze.length; y++) {
      for (let x = 0; x < newMaze[y].length; x++) {
        if (newMaze[y][x] === "start") {
          startPos = { x, y };
        } else if (newMaze[y][x] === "end") {
          endPos = { x, y };
        }
      }
    }

    // 設置迷宮和玩家位置
    setMaze(newMaze);
    setPlayerPosition(startPos);
    setEndPosition(endPos);

    // 重置遊戲狀態
    setMoveCount(0);
    setCorrectAnswers(0);
    setWrongAnswers(0);
    setGameTime(0);
    setScore(0);
    setLastMove(null);
    setCurrentQuestion(null);
    setShowHint(false);
    setGameCompleted(false);
  }, [level]); // 添加 level 作為依賴項

  // 修改計時器邏輯，使用更精確的計時方式
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;

    if (timerActive && gameStatus === "playing") {
      // 設置開始時間（如果尚未設置）
      if (startTime === null) {
        setStartTime(Date.now());
        setGameTime(0); // 確保從 0 開始
      } else {
        // 立即更新一次當前時間
        const elapsedTime = (Date.now() - startTime) / 1000;
        setGameTime(elapsedTime);
      }

      // 使用較低的更新頻率，每秒更新 10 次
      timer = setInterval(() => {
        if (startTime !== null) {
          const elapsedTime = (Date.now() - startTime) / 1000;
          setGameTime(elapsedTime);
        }
      }, 100); // 每 100 毫秒更新一次
    }

    return () => {
      if (timer) {
        clearInterval(timer);
      }
    };
  }, [timerActive, gameStatus, startTime]);

  // 定義 toggleHint 函數
  const toggleHint = useCallback(() => {
    setShowHint((prev) => !prev);
  }, []);

  // 定義 handleSpecialCell 函數
  const handleSpecialCell = useCallback(
    (cellType: CellType, x: number, y: number) => {
      if (cellType === "question") {
        // 播放問題音效
        if (questionSound.current) {
          questionSound.current.currentTime = 0;
          questionSound.current
            .play()
            .catch((e) => console.log("音效播放失敗:", e));
        }

        // 選擇一個較短的問題
        const availableQuestions = questions
          .map((q, index) => ({ question: q, index }))
          .filter(
            (item) =>
              // 過濾出較短的問題
              item.question.question.length < 100 &&
              item.question.options.every((opt) => opt.length < 80)
          );

        if (availableQuestions.length > 0) {
          const randomIndex = Math.floor(
            Math.random() * availableQuestions.length
          );
          setCurrentQuestion(availableQuestions[randomIndex].index);
        } else {
          // 如果沒有較短的問題，則隨機選擇一個
          const randomIndex = Math.floor(Math.random() * questions.length);
          setCurrentQuestion(randomIndex);
        }

        // 將問題單元格變為空單元格，避免重複觸發
        const newMaze = [...maze];
        newMaze[y][x] = "empty";
        setMaze(newMaze);
      } else if (cellType === "obstacle") {
        if (obstacleSound.current) {
          obstacleSound.current
            .play()
            .catch((e) => console.log("音效播放失敗:", e));
        }

        // 隨機傳送到一個空格子
        const emptyPositions: Position[] = [];
        for (let yy = 0; yy < maze.length; yy++) {
          for (let xx = 0; xx < maze[0].length; xx++) {
            if (maze[yy][xx] === "empty" && !(xx === x && yy === y)) {
              emptyPositions.push({ x: xx, y: yy });
            }
          }
        }

        if (emptyPositions.length > 0) {
          const randomPosition =
            emptyPositions[Math.floor(Math.random() * emptyPositions.length)];
          setPlayerPosition(randomPosition);
        }
      }
    },
    [maze, questionSound]
  );

  // 修改 handleWin 函數，確保計時器停止
  const handleWin = useCallback(() => {
    // 停止計時器
    setTimerActive(false);

    // 計算最終得分
    const timeBonus = Math.max(0, 300 - gameTime) * 2;
    const moveBonus = Math.max(0, 200 - moveCount);
    const questionBonus = correctAnswers * 50 - wrongAnswers * 20;
    const finalScore = Math.floor(timeBonus + moveBonus + questionBonus);

    setScore(finalScore);

    // 設置遊戲狀態為勝利
    setGameStatus("won");
    setGameCompleted(true);
  }, [gameTime, moveCount, correctAnswers, wrongAnswers]);

  // 重置遊戲時也要重置提交狀態
  const resetGame = useCallback(() => {
    setMaze(generateMaze(mazeWidth, mazeHeight, questionCount, obstacleCount));
    setPlayerPosition({ x: 1, y: 1 });
    setGameStatus("playing");
    setGameTime(0);
    setMoveCount(0);
    setCorrectAnswers(0);
    setWrongAnswers(0);
    setCurrentQuestion(null);
    setShowNameInputModal(false);
    setShowLeaderboard(false);
    setPlayerName("");
    setScoreSubmitted(false); // 重置提交狀態
  }, [mazeWidth, mazeHeight, questionCount, obstacleCount]);

  // 處理名稱提交
  const handleNameSubmit = async (name: string) => {
    if (scoreSubmitted) {
      setShowLeaderboard(true);
      return;
    }

    if (!name.trim()) {
      alert("請輸入名稱");
      return;
    }

    try {
      // 先檢查名字是否存在
      const checkResponse = await fetch(
        `/api/leaderboard/check?name=${encodeURIComponent(name)}`
      );
      const checkData = await checkResponse.json();

      if (checkData.exists) {
        alert("此名稱已被使用，請使用其他名稱");
        return; // 不關閉輸入框，讓使用者可以重新輸入
      }

      const score = {
        name,
        time: gameTime,
        score: calculateScore(),
        moveCount,
        correctAnswers,
        wrongAnswers,
        level,
        date: new Date().toISOString(),
      };

      const submitResponse = await fetch("/api/leaderboard", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(score),
      });

      const submitData = await submitResponse.json();

      if (!submitResponse.ok) {
        throw new Error(submitData.error || "無法保存成績");
      }

      setScoreSubmitted(true);
      setShowNameInputModal(false);
      setShowLeaderboard(true);
    } catch (error) {
      console.error("Error submitting score:", error);
      if (error instanceof Error && error.message === "此名稱已被使用") {
        alert("此名稱已被使用，請使用其他名稱");
      } else {
        alert("保存成績時發生錯誤，請稍後再試");
      }
    }
  };

  // 定義 handlePlayerMove 函數
  const handlePlayerMove = useCallback(
    (dx: number, dy: number) => {
      // 如果遊戲尚未開始計時，啟動計時器
      if (!timerActive && gameStatus === "playing") {
        setTimerActive(true);
        setStartTime(Date.now());
      }

      // 如果正在動畫中或者有問題彈窗，不處理移動
      if (animating || currentQuestion !== null) return;

      // 計算新位置
      const newX = playerPosition.x + dx;
      const newY = playerPosition.y + dy;

      // 檢查是否可以移動
      if (
        newX >= 0 &&
        newX < maze[0]?.length &&
        newY >= 0 &&
        newY < maze.length &&
        maze[newY][newX] !== "wall"
      ) {
        // 播放移動音效
        if (moveSound.current) {
          moveSound.current.currentTime = 0;
          moveSound.current
            .play()
            .catch((e) => console.log("音效播放失敗:", e));
        }

        // 更新玩家位置 - 使用動畫過渡
        setPlayerPosition({ x: newX, y: newY });
        setMoveCount((prev) => prev + 1);

        // 設置動畫完成後的回調 - 縮短時間以提高響應速度
        setTimeout(() => {
          setAnimating(false);

          // 檢查是否到達終點
          if (newX === endPosition.x && newY === endPosition.y) {
            // 停止計時器
            setTimerActive(false);

            // 調用勝利處理函數
            handleWin();
          } else {
            // 處理其他特殊單元格
            handleSpecialCell(maze[newY][newX], newX, newY);
          }
        }, 250); // 縮短時間從300ms到250ms，與CSS過渡時間匹配
      } else {
        // 播放撞牆音效
        if (wallSound.current) {
          wallSound.current.currentTime = 0;
          wallSound.current
            .play()
            .catch((e) => console.log("音效播放失敗:", e));
        }

        // 即使撞牆也應該有一些視覺反饋，但時間更短
        setTimeout(() => {
          setAnimating(false);
        }, 100); // 縮短時間從150ms到100ms
      }
    },
    [
      animating,
      currentQuestion,
      maze,
      playerPosition,
      endPosition,
      moveSound,
      wallSound,
      obstacleSound,
      winSound,
      timerActive,
      gameStatus,
      handleSpecialCell,
    ]
  );

  // 添加鍵盤控制
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameStatus !== "playing" || currentQuestion !== null) return;

      switch (e.key) {
        case "ArrowUp":
        case "w":
        case "W":
          handlePlayerMove(0, -1);
          break;
        case "ArrowDown":
        case "s":
        case "S":
          handlePlayerMove(0, 1);
          break;
        case "ArrowLeft":
        case "a":
        case "A":
          handlePlayerMove(-1, 0);
          break;
        case "ArrowRight":
        case "d":
        case "D":
          handlePlayerMove(1, 0);
          break;
        case "h":
        case "H":
          toggleHint();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [gameStatus, currentQuestion, handlePlayerMove, toggleHint]);

  const startGame = () => {
    setGameStatus("playing");
    initGame(); // 這裡會使用當前選擇的難度
    setTimerActive(true);
    setStartTime(Date.now());
  };

  const restartGame = () => {
    // 停止計時器
    setTimerActive(false);

    // 重置遊戲
    resetGame();

    // 返回到介紹畫面
    setGameStatus("intro");
  };

  const handleAnswerQuestion = (isCorrect: boolean) => {
    if (isCorrect) {
      setCorrectAnswers((prev) => prev + 1);
      setScore((prev) => Math.floor(prev + 50)); // 確保分數為整數
    } else {
      setWrongAnswers((prev) => prev + 1);
      setScore((prev) => Math.floor(Math.max(0, prev - 20))); // 確保分數為整數
    }

    setCurrentQuestion(null);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };
  useEffect(() => {
    // 只在組件掛載時初始化遊戲
    initGame();

    // 清理函數
    return () => {
      if (gameTimer) {
        clearInterval(gameTimer);
      }
    };
  }, [initGame]);

  // 計算分數
  const calculateScore = useCallback(() => {
    const settings = levelSettings[level];

    // 基礎分數計算
    const timeScore = Math.max(0, 1000 - gameTime * 2); // 時間越短分數越高
    const moveScore = Math.max(0, 1000 - moveCount * 5); // 步數越少分數越高
    const correctScore = correctAnswers * 200; // 每答對一題加200分
    const wrongPenalty = wrongAnswers * 100; // 每答錯一題減100分

    // 根據難度調整分數
    const levelMultiplier = settings.scoreMultiplier;

    // 計算總分
    const totalScore =
      (timeScore + moveScore + correctScore - wrongPenalty) * levelMultiplier;

    // 確保分數不為負
    return Math.max(0, totalScore);
  }, [gameTime, moveCount, correctAnswers, wrongAnswers, level]);

  // 在遊戲結束時更新分數
  useEffect(() => {
    if (gameCompleted) {
      setScore(calculateScore());
    }
  }, [gameCompleted, calculateScore]);

  // 添加難度選擇界面
  const renderLevelSelection = () => {
    return (
      <div className="level-selection">
        <h2>選擇難度</h2>
        <div className="level-buttons">
          <button
            className={`level-btn ${level === "easy" ? "active" : ""}`}
            onClick={() => setLevel("easy")}
          >
            簡單
          </button>
          <button
            className={`level-btn ${level === "medium" ? "active" : ""}`}
            onClick={() => setLevel("medium")}
          >
            中等
          </button>
          <button
            className={`level-btn ${level === "hard" ? "active" : ""}`}
            onClick={() => setLevel("hard")}
          >
            困難
          </button>
        </div>
        <div className="level-info">
          <p>
            {level === "easy" && "簡單難度：15x15 迷宮，5個問題，3個傳送點"}
            {level === "medium" && "中等難度：19x19 迷宮，8個問題，5個傳送點"}
            {level === "hard" && "困難難度：19x19 迷宮，12個問題，7個傳送點"}
          </p>
        </div>
        <button className="start-game-btn" onClick={startGame}>
          開始遊戲
        </button>
      </div>
    );
  };

  // 添加窗口大小監聽
  useEffect(() => {
    const handleResize = () => {
      // 根據窗口大小和迷宮尺寸自動調整縮放級別
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      // 計算最佳縮放比例
      const cellSize = level === "easy" ? 36 : level === "medium" ? 28 : 22;
      const mazePixelWidth = mazeWidth * cellSize;
      const mazePixelHeight = mazeHeight * cellSize;

      // 考慮視窗大小和迷宮大小，計算最佳縮放比例
      const widthRatio = (viewportWidth * 0.85) / mazePixelWidth;
      const heightRatio = (viewportHeight * 0.75) / mazePixelHeight;

      // 取較小的比例，確保迷宮完全顯示
      const optimalRatio = Math.min(widthRatio, heightRatio);

      // 將比例轉換為百分比並限制在合理範圍內
      const newZoomLevel = Math.max(
        50,
        Math.min(150, Math.floor(optimalRatio * 100))
      );

      setZoomLevel(newZoomLevel);
    };

    // 初始調整
    handleResize();

    // 添加窗口大小變化監聽
    window.addEventListener("resize", handleResize);

    // 清理函數
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [level, mazeWidth, mazeHeight]); // 當難度或迷宮尺寸變化時重新計算

  const renderItemIntroduction = () => {
    return (
      <div className="item-introduction">
        <h2>遊戲說明</h2>
        <div className="item-grid">
          <div className="item-card">
            <div className="item question">?</div>
            <div className="item-description">
              <h3>問題點</h3>
              <p>回答問題可以獲得分數</p>
            </div>
          </div>
          <div className="item-card">
            <div className="item obstacle">!</div>
            <div className="item-description">
              <h3>傳送點</h3>
              <p>到達傳送點會隨機傳送到其他位置</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // 添加虛擬方向鍵處理
  const handleVirtualControl = (
    direction: "up" | "down" | "left" | "right"
  ) => {
    if (gameStatus !== "playing") return;

    const newPosition = { ...playerPosition };
    switch (direction) {
      case "up":
        newPosition.y--;
        break;
      case "down":
        newPosition.y++;
        break;
      case "left":
        newPosition.x--;
        break;
      case "right":
        newPosition.x++;
        break;
    }

    handlePlayerMove(
      newPosition.x - playerPosition.x,
      newPosition.y - playerPosition.y
    );
  };

  return (
    <div className="game-container">
      <ThemeToggle />
      {gameStatus === "intro" && (
        <div className="intro-screen">
          <div className="intro-content">
            <h1 className="intro-title">2025 SCIST X SITCON 問答迷宮</h1>
            <p className="intro-description">
              在這個遊戲中，你可以使用方向鍵或 WASD 移動
              <br />
              途中會遇到各種關於程式設計、 SCIST 和 SITCON
              的問題，想辦法取得最高分吧！
            </p>

            {renderItemIntroduction()}

            {renderLevelSelection()}

            <div className="intro-footer">
              <p>© 2025 SCIST 南臺灣學生資訊社群</p>
            </div>
          </div>
        </div>
      )}

      {gameStatus === "playing" && (
        <div className="game-main">
          <div className="game-board">
            {/* 添加難度指示器 */}
            <div className={`difficulty-indicator difficulty-${level}`}>
              {level === "easy" ? "簡單" : level === "medium" ? "中等" : "困難"}
            </div>

            {/* 縮放控制按鈕 */}
            <div className="zoom-controls">
              <button
                onClick={handleZoomOut}
                className="zoom-btn"
                aria-label="縮小"
              >
                <span>-</span>
              </button>
              <span className="zoom-level">{zoomLevel}%</span>
              <button
                onClick={handleZoomIn}
                className="zoom-btn"
                aria-label="放大"
              >
                <span>+</span>
              </button>
            </div>

            {/* 迷宮容器 - 動態調整邊框和大小 */}
            <div
              className={`maze-container difficulty-${level}`}
              style={{
                transform: `scale(${zoomLevel / 100})`,
                transformOrigin: "center center",
                transition: "transform 0.3s ease",
                margin: "auto",
                padding:
                  level === "easy"
                    ? "15px"
                    : level === "medium"
                    ? "12px"
                    : "10px", // 根據難度動態調整內邊距
                border: `${
                  level === "easy" ? 3 : level === "medium" ? 2 : 1
                }px solid rgba(139, 92, 246, 0.3)`, // 根據難度調整邊框
                boxShadow: `0 0 ${
                  level === "easy" ? 20 : level === "medium" ? 15 : 10
                }px rgba(139, 92, 246, 0.2)`, // 根據難度調整陰影
              }}
            >
              <Maze
                maze={maze}
                playerPosition={playerPosition}
                showHint={showHint}
                endPosition={endPosition}
              />
              <Player position={playerPosition} animating={animating} />
            </div>
          </div>

          <div className="game-sidebar">
            <div className="game-info">
              <h1 className="game-title">SCIST 問答迷宮</h1>
              <div className="game-legend">
                <h3 className="legend-title">圖例</h3>
                <div className="legend-grid">
                  <div className="legend-item">
                    <div className="legend-color wall"></div>
                    <div className="legend-text">牆壁</div>
                  </div>
                  <div className="legend-item">
                    <div className="legend-color start"></div>
                    <div className="legend-text">起點</div>
                  </div>
                  <div className="legend-item">
                    <div className="legend-color end"></div>
                    <div className="legend-text">終點</div>
                  </div>
                  <div className="legend-item">
                    <div className="legend-color question">?</div>
                    <div className="legend-text">問題</div>
                  </div>
                  <div className="legend-item">
                    <div className="legend-color obstacle">!</div>
                    <div className="legend-text">傳送點</div>
                  </div>
                </div>
              </div>
              <div className="game-stats">
                <div className="stat-item">
                  <div className="stat-icon">⏱️</div>
                  <div className="stat-value">{formatTime(gameTime)}</div>
                  <div className="stat-label">時間</div>
                </div>
                <div className="stat-item">
                  <div className="stat-icon">👣</div>
                  <div className="stat-value">{moveCount}</div>
                  <div className="stat-label">步數</div>
                </div>
                <div className="stat-item">
                  <div className="stat-icon">✅</div>
                  <div className="stat-value">{correctAnswers}</div>
                  <div className="stat-label">答對</div>
                </div>
                <div className="stat-item">
                  <div className="stat-icon">❌</div>
                  <div className="stat-value">{wrongAnswers}</div>
                  <div className="stat-label">答錯</div>
                </div>
              </div>

              <div className="game-controls">
                <button onClick={toggleHint} className="hint-btn">
                  {showHint ? "隱藏提示" : "顯示提示"}
                </button>
                <button onClick={restartGame} className="restart-btn">
                  重新開始
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {gameStatus === "won" && (
        <div className="win-screen">
          <h1 className="win-title">成功通關！</h1>
          <div className="win-content">
            <div className="win-stats">
              <p>恭喜你成功走出迷宮！</p>

              {/* 添加難度顯示 */}
              <div className={`difficulty-badge difficulty-${level}`}>
                {level === "easy" && "簡單難度"}
                {level === "medium" && "中等難度"}
                {level === "hard" && "困難難度"}
              </div>

              <div className="stats-grid">
                <div className="stat-card">
                  <br />
                  <div className="stat-icon">⏱️</div>
                  <div className="stat-value">{formatTime(gameTime)}</div>
                  <div className="stat-label">總時間</div>
                </div>
                <div className="stat-card">
                  <br />
                  <div className="stat-icon">👣</div>
                  <div className="stat-value">{moveCount}</div>
                  <div className="stat-label">總步數</div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">✅</div>
                  <div className="stat-value">{correctAnswers}</div>
                  <div className="stat-label">答對題數</div>
                  <div className="stat-icon">❌</div>
                  <div className="stat-value">{wrongAnswers}</div>
                  <div className="stat-label">答錯題數</div>
                </div>
                <div className="stat-card highlight">
                  <div className="stat-icon">🏆</div>
                  <div className="stat-value">{Math.floor(score)}</div>
                  <div className="stat-label">最終得分</div>
                </div>
              </div>
              {!scoreSubmitted ? (
                <button
                  onClick={() => setShowNameInputModal(true)}
                  className="record-score-btn"
                >
                  記錄我的成績
                </button>
              ) : (
                <div className="recorded-message">
                  <a>你已經記錄了這次的成績！</a>
                </div>
              )}
            </div>
          </div>
          <button onClick={restartGame} className="restart-btn pulse-animation">
            返回首頁
          </button>
          <br />
          <div className="intro-footer">
            <p>© 2025 SCIST 南臺灣學生資訊社群</p>
          </div>
        </div>
      )}

      {/* 問題模態框應該在最外層渲染，而不是在遊戲主區域內 */}
      {currentQuestion !== null && (
        <Question
          question={questions[currentQuestion]}
          onAnswer={handleAnswerQuestion}
        />
      )}

      {/* 顯示計時器 */}
      {/* <div className="game-timer">
        {Math.floor(gameTime / 60)
          .toString()
          .padStart(2, "0")}
        :
        {Math.floor(gameTime % 60)
          .toString()
          .padStart(2, "0")}
      </div> */}

      {/* 名稱輸入模態視窗 */}
      {showNameInputModal && (
        <div className="name-input-modal">
          <div className="name-input-content">
            <h2>記錄你的成績</h2>
            <p>請輸入你的名稱以記錄在排行榜上</p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleNameSubmit(playerName);
              }}
              className="player-name-form"
            >
              <input
                type="text"
                className="player-name-input"
                placeholder="輸入你的名稱"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                maxLength={10}
                autoFocus
                required
              />
              <div className="stat-card">
                <button
                  type="submit"
                  className="save-score-btn"
                  disabled={!playerName.trim() || scoreSubmitted}
                >
                  {scoreSubmitted ? "已保存" : "保存"}
                </button>
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => setShowNameInputModal(false)}
                >
                  取消
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 排行榜 - 修改為不包含名稱輸入表單 */}
      {showLeaderboard && (
        <Leaderboard
          onClose={() => {
            // 只關閉排行榜，不重置遊戲
            setShowLeaderboard(false);
          }}
          onPlayAgain={() => {
            // 重置遊戲並返回首頁
            resetGame();
            setGameStatus("intro");
          }}
        />
      )}

      {/* 排行榜按鈕 - 只在首頁和結算畫面顯示 */}
      {(gameStatus === "intro" || gameStatus === "won") && (
        <button
          className="leaderboard-btn"
          onClick={() => setShowLeaderboard(true)}
          aria-label="查看排行榜"
        >
          排行榜
        </button>
      )}

      {/* 在移動設備上顯示虛擬方向鍵 */}
      <div className="virtual-controls">
        <div></div>
        <button
          className="virtual-btn"
          onClick={() => handleVirtualControl("up")}
          aria-label="向上"
        >
          ↑
        </button>
        <div></div>
        <button
          className="virtual-btn"
          onClick={() => handleVirtualControl("left")}
          aria-label="向左"
        >
          ←
        </button>
        <button
          className="virtual-btn"
          onClick={() => handleVirtualControl("down")}
          aria-label="向下"
        >
          ↓
        </button>
        <button
          className="virtual-btn"
          onClick={() => handleVirtualControl("right")}
          aria-label="向右"
        >
          →
        </button>
      </div>
    </div>
  );
};

export default Game;
