import React, { useState, useRef, useEffect } from "react";

export interface QuestionType {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
}

interface QuestionProps {
  question: QuestionType;
  onAnswer: (isCorrect: boolean) => void;
}

const Question: React.FC<QuestionProps> = ({ question, onAnswer }) => {
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // 使用 useEffect 添加動畫效果並調整高度
  useEffect(() => {
    if (modalRef.current && containerRef.current) {
      // 確保模態框在進入時有動畫效果
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

      // 強制禁止滾動
      if (contentRef.current) {
        containerRef.current.style.overflow = "hidden";
        contentRef.current.style.overflow = "hidden";

        // 調整容器大小
        containerRef.current.style.height = "auto";
        containerRef.current.style.maxHeight = "none";
      }
    }

    // 防止背景滾動
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, []);

  const handleOptionClick = (index: number) => {
    if (answered) return;
    setSelectedOption(index);
  };

  const handleSubmit = () => {
    if (selectedOption === null) return;

    const isCorrect = selectedOption === question.correctAnswer;
    setAnswered(true);

    // 延遲關閉問題視窗，讓用戶看到結果和解釋
    setTimeout(() => {
      // 添加淡出動畫
      if (modalRef.current && containerRef.current) {
        modalRef.current.style.opacity = "0";
        containerRef.current.style.transform = "scale(0.95) translateY(0)";
        modalRef.current.style.transition = "opacity 0.3s ease";
        containerRef.current.style.transition = "transform 0.3s ease";
      }

      // 等待淡出動畫完成後再關閉
      setTimeout(() => {
        onAnswer(isCorrect);
      }, 300);
    }, 3000);
  };

  return (
    <div className="question-modal" ref={modalRef}>
      <div className="question-container" ref={containerRef}>
        <div className="question-content" ref={contentRef}>
          <h2 className="question-title">問題</h2>
          <p className="question-text">{question.question}</p>
          <div className="options-container">
            {question.options.map((option, index) => (
              <div
                key={index}
                className={`option ${
                  selectedOption === index ? "selected" : ""
                } ${
                  answered
                    ? index === question.correctAnswer
                      ? "correct"
                      : selectedOption === index
                      ? "incorrect"
                      : ""
                    : ""
                }`}
                onClick={() => handleOptionClick(index)}
              >
                <div className="option-marker">
                  {String.fromCharCode(65 + index)}
                </div>
                <div className="option-text">{option}</div>
              </div>
            ))}
          </div>
          <button
            className={`submit-btn ${answered ? "disabled" : ""}`}
            onClick={handleSubmit}
            disabled={selectedOption === null || answered}
          >
            {answered ? "已提交" : "提交答案"}
          </button>
          {answered && (
            <div
              className={`result ${
                selectedOption === question.correctAnswer
                  ? "correct"
                  : "incorrect"
              }`}
            >
              {selectedOption === question.correctAnswer
                ? "答對了！"
                : "答錯了！"}
            </div>
          )}

          {/* 顯示解釋 */}
          {answered && question.explanation && (
            <div className="explanation">
              <h3>解釋：</h3>
              <p>{question.explanation}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Question;
