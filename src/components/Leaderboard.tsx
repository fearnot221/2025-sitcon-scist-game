import React, { useState, useEffect, useRef, useMemo } from "react";
import { Level } from "./Game";

export interface LeaderboardEntry {
  name: string;
  time: number;
  date: string;
  score?: number;
  moveCount?: number;
  correctAnswers?: number;
  wrongAnswers?: number;
  level: Level;
}

interface LeaderboardProps {
  onClose: () => void;
  onPlayAgain: () => void;
}

const Leaderboard: React.FC<LeaderboardProps> = ({ onClose }) => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<LeaderboardEntry | null>(
    null
  );
  const [selectedDifficulty, setSelectedDifficulty] = useState<Level>("easy");
  const modalRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [showFormula, setShowFormula] = useState(false);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      const response = await fetch("/api/leaderboard");
      const data = await response.json();
      setLeaderboard(data);
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
    }
  };

  // 根據難度過濾並排序排行榜數據
  const filteredLeaderboard = useMemo(() => {
    return leaderboard
      .filter((entry) => entry.level === selectedDifficulty)
      .sort((a, b) => (b.score || 0) - (a.score || 0));
    // .slice(0, 10); // 只顯示前10名/
  }, [leaderboard, selectedDifficulty]);

  // 添加動畫效果
  useEffect(() => {
    if (modalRef.current && containerRef.current) {
      modalRef.current.style.opacity = "0";
      containerRef.current.style.transform = "scale(0.95) translateY(0)";

      requestAnimationFrame(() => {
        if (modalRef.current && containerRef.current) {
          modalRef.current.style.opacity = "1";
          modalRef.current.style.transition = "opacity 0.3s ease";
          containerRef.current.style.transform = "scale(1) translateY(0)";
          containerRef.current.style.transition =
            "transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)";
        }
      });
    }

    // 防止背景滾動
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, []);

  // 格式化時間
  const formatTime = (timeInSeconds: number): string => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
  };

  // 顯示詳細資訊
  const showEntryDetails = (entry: LeaderboardEntry) => {
    setSelectedEntry(entry);
  };

  // 添加排行榜標題動畫效果
  const LeaderboardTitle = () => (
    <div className="leaderboard-header-container">
      <h2 className="leaderboard-title">迷宮排行榜</h2>
      <button
        className="formula-btn"
        onClick={() => setShowFormula(true)}
        aria-label="查看分數計算公式"
      >
        <span className="formula-icon">∑</span>
        <span className="formula-text">分數計算</span>
      </button>
    </div>
  );

  // 修改分數計算公式組件，添加更多視覺效果
  const ScoreFormula = () => (
    <div className="score-formula">
      <h3>分數計算方式</h3>
      <div className="formula-container">
        <p>總分 = 基礎分數 × 難度倍率</p>
        <ul>
          <li>
            <span className="formula-label">基礎分數</span>
            <span className="formula-value">
              2000 - (遊戲時間 × 10) - (移動步數 × 10)
              <span className="formula-hint">時間和步數越少，分數越高</span>
            </span>
          </li>
          <li>
            <span className="formula-label">答題加分</span>
            <span className="formula-value">
              答對題數 × 200
              <span className="formula-hint">每答對一題加 200 分</span>
            </span>
          </li>
          <li>
            <span className="formula-label">答錯扣分</span>
            <span className="formula-value">
              答錯題數 × 100
              <span className="formula-hint">每答錯一題扣 100 分</span>
            </span>
          </li>
          <li>
            <span className="formula-label">難度倍率</span>
            <span className="formula-value">
              簡單: 1.0 倍<br />
              中等: 1.2 倍<br />
              困難: 1.5 倍
              <span className="formula-hint">難度越高，分數倍率越高</span>
            </span>
          </li>
        </ul>
        <p className="formula-note">注意: 基礎分數最低為 0 分</p>
      </div>
      <button
        className="close-formula-btn"
        onClick={() => setShowFormula(false)}
      >
        返回排行榜
      </button>
    </div>
  );

  // 添加排行榜行動畫效果
  useEffect(() => {
    // 為排行榜行添加延遲動畫
    const rows = document.querySelectorAll(".leaderboard-row");
    rows.forEach((row, index) => {
      const delay = index * 100;
      (row as HTMLElement).style.opacity = "0";
      (row as HTMLElement).style.transform = "translateY(10px)";

      setTimeout(() => {
        (row as HTMLElement).style.opacity = "1";
        (row as HTMLElement).style.transform = "translateY(0)";
        (row as HTMLElement).style.transition =
          "all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)";
      }, delay);
    });
  }, [leaderboard]);

  return (
    <div className="leaderboard-modal" ref={modalRef}>
      <div className="leaderboard-container" ref={containerRef}>
        <div className="leaderboard-content">
          <LeaderboardTitle />
          <button
            className="leaderboard-close-btn"
            onClick={onClose}
            aria-label="關閉排行榜"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          {/* 難度選擇器 */}
          <div className="difficulty-selector">
            <button
              className={`difficulty-btn ${
                selectedDifficulty === "easy" ? "active" : ""
              }`}
              onClick={() => setSelectedDifficulty("easy")}
            >
              簡單
            </button>
            <button
              className={`difficulty-btn ${
                selectedDifficulty === "medium" ? "active" : ""
              }`}
              onClick={() => setSelectedDifficulty("medium")}
            >
              中等
            </button>
            <button
              className={`difficulty-btn ${
                selectedDifficulty === "hard" ? "active" : ""
              }`}
              onClick={() => setSelectedDifficulty("hard")}
            >
              困難
            </button>
          </div>

          {filteredLeaderboard.length > 0 ? (
            <div className="leaderboard-table">
              <div className="leaderboard-header">
                <div className="leaderboard-cell rank">排名</div>
                <div className="leaderboard-cell name">玩家</div>
                <div className="leaderboard-cell score">分數</div>
                <div className="leaderboard-cell time">時間</div>
              </div>
              <div className="leaderboard-body">
                {filteredLeaderboard.map((entry, index) => (
                  <div
                    key={index}
                    className="leaderboard-row"
                    onClick={() => showEntryDetails(entry)}
                  >
                    <div className="leaderboard-cell rank">{index + 1}</div>
                    <div className="leaderboard-cell name">{entry.name}</div>
                    <div className="leaderboard-cell score">
                      {Math.floor(entry.score || 0)}
                    </div>
                    <div className="leaderboard-cell time">
                      {formatTime(entry.time)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="no-scores">
              {selectedDifficulty === "easy" &&
                "簡單難度還沒有記錄，來當第一名吧！"}
              {selectedDifficulty === "medium" &&
                "中等難度還沒有記錄，來挑戰一下吧！"}
              {selectedDifficulty === "hard" &&
                "困難難度還沒有記錄，證明你的實力吧！"}
            </p>
          )}

          {selectedEntry && (
            <>
              <div
                className="modal-overlay"
                onClick={() => setSelectedEntry(null)}
              />
              <div className="entry-details">
                <h3>{selectedEntry.name} 的夢境記錄</h3>
                <div className="details-grid">
                  <div className="detail-item highlight">
                    <span className="detail-label">總得分</span>
                    <span className="detail-value">
                      {Math.floor(selectedEntry.score || 0)}
                    </span>
                  </div>

                  <div className="detail-item">
                    <span className="detail-label">遊戲時間</span>
                    <span className="detail-value">
                      {formatTime(selectedEntry.time)}
                    </span>
                  </div>

                  <div className="detail-item">
                    <span className="detail-label">移動步數</span>
                    <span className="detail-value">
                      {selectedEntry.moveCount || 0}
                    </span>
                  </div>

                  <div className="detail-item answers">
                    <span className="detail-label">答題狀況</span>
                    <div className="answers-container">
                      <div className="answer-stat">
                        <span className="answer-value correct">
                          {selectedEntry.correctAnswers || 0}
                        </span>
                        <span className="answer-label">答對</span>
                      </div>
                      <div className="answer-stat">
                        <span className="answer-value incorrect">
                          {selectedEntry.wrongAnswers || 0}
                        </span>
                        <span className="answer-label">答錯</span>
                      </div>
                    </div>
                  </div>

                  <div className="detail-item">
                    <span className="detail-label">遊戲日期</span>
                    <span className="detail-value">
                      {new Date(selectedEntry.date).toLocaleString()}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedEntry(null)}
                  className="close-details-btn"
                >
                  返回排行榜
                </button>
              </div>
            </>
          )}

          {showFormula && <ScoreFormula />}
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;
