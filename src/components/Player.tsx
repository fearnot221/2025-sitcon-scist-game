import React, { useEffect, useRef, useState } from "react";
import { Position } from "./Game";

interface PlayerProps {
  position: Position;
  animating: boolean;
}

const Player: React.FC<PlayerProps> = ({ position, animating }) => {
  const playerRef = useRef<HTMLDivElement>(null);
  const prevPositionRef = useRef<Position>(position);
  const [direction, setDirection] = useState<string>("down");

  // 使用 CSS 變換來實現平滑移動
  useEffect(() => {
    if (!playerRef.current) return;

    // 如果位置發生變化，應用平滑過渡
    if (
      prevPositionRef.current.x !== position.x ||
      prevPositionRef.current.y !== position.y
    ) {
      // 移除之前的過渡樣式
      playerRef.current.style.transition = "none";

      // 計算移動距離
      const dx = position.x - prevPositionRef.current.x;
      const dy = position.y - prevPositionRef.current.y;

      // 設置方向
      if (dx > 0) setDirection("right");
      else if (dx < 0) setDirection("left");
      else if (dy > 0) setDirection("down");
      else if (dy < 0) setDirection("up");

      // 應用平滑過渡 - 使用 requestAnimationFrame 確保動畫流暢
      requestAnimationFrame(() => {
        if (!playerRef.current) return;

        // 使用更流暢的緩動函數
        playerRef.current.style.transition =
          "transform 0.25s cubic-bezier(0.33, 1, 0.68, 1)";
        playerRef.current.style.transform = `translate(${position.x * 100}%, ${
          position.y * 100
        }%)`;
      });

      prevPositionRef.current = { ...position };
    }
  }, [position]);

  return (
    <div
      ref={playerRef}
      className={`player-avatar ${animating ? "moving" : ""} ${direction}`}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "var(--cell-size)",
        height: "var(--cell-size)",
        backgroundColor: "transparent",
        borderRadius: "50%",
        zIndex: 10,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        transform: `translate(${position.x * 100}%, ${position.y * 100}%)`,
        willChange: "transform",
      }}
    ></div>
  );
};

export default Player;
