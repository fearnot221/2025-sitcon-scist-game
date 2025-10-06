import React, { useEffect, useState } from "react";
import { MazeType } from "./Game";

interface MazeProps {
  maze: MazeType;
  playerPosition: { x: number; y: number };
  showHint: boolean;
  endPosition: { x: number; y: number };
}

const Maze: React.FC<MazeProps> = React.memo(
  ({ maze, playerPosition, showHint, endPosition }) => {
    // 計算從起點到終點的路徑（用於提示）
    const [hintPath, setHintPath] = useState<Set<string>>(new Set());

    useEffect(() => {
      if (showHint && maze.length > 0) {
        // 使用廣度優先搜索找到最近的特殊格子（問題或障礙）
        const queue: { x: number; y: number; path: string[] }[] = [
          { x: playerPosition.x, y: playerPosition.y, path: [] },
        ];
        const visited = new Set<string>();
        visited.add(`${playerPosition.x},${playerPosition.y}`);

        const directions = [
          [0, -1], // 上
          [1, 0], // 右
          [0, 1], // 下
          [-1, 0], // 左
        ];

        let foundSpecialCell = false;
        let specialCellPath = new Set<string>();

        while (queue.length > 0 && !foundSpecialCell) {
          const { x, y, path } = queue.shift()!;

          // 檢查是否是特殊格子（問題或障礙）
          if (
            (maze[y][x] === "question" || maze[y][x] === "obstacle") &&
            !(x === playerPosition.x && y === playerPosition.y)
          ) {
            // 找到了特殊格子，設置路徑
            specialCellPath = new Set<string>();
            path.forEach((pos) => specialCellPath.add(pos));
            specialCellPath.add(`${x},${y}`); // 添加特殊格子本身
            foundSpecialCell = true;
            break;
          }

          for (const [dx, dy] of directions) {
            const nx = x + dx;
            const ny = y + dy;

            if (
              nx >= 0 &&
              nx < maze[0].length &&
              ny >= 0 &&
              ny < maze.length &&
              maze[ny][nx] !== "wall" &&
              !visited.has(`${nx},${ny}`)
            ) {
              visited.add(`${nx},${ny}`);
              queue.push({
                x: nx,
                y: ny,
                path: [...path, `${nx},${ny}`],
              });
            }
          }
        }

        // 如果找到了特殊格子，使用它的路徑，否則使用到終點的路徑
        if (foundSpecialCell) {
          setHintPath(specialCellPath);
        } else {
          // 如果沒有找到特殊格子，則尋找到終點的路徑
          const endQueue: { x: number; y: number; path: string[] }[] = [
            { x: playerPosition.x, y: playerPosition.y, path: [] },
          ];
          const endVisited = new Set<string>();
          endVisited.add(`${playerPosition.x},${playerPosition.y}`);

          while (endQueue.length > 0) {
            const { x, y, path } = endQueue.shift()!;

            if (x === endPosition.x && y === endPosition.y) {
              // 找到路徑
              const pathSet = new Set<string>();
              path.forEach((pos) => pathSet.add(pos));
              setHintPath(pathSet);
              break;
            }

            for (const [dx, dy] of directions) {
              const nx = x + dx;
              const ny = y + dy;

              if (
                nx >= 0 &&
                nx < maze[0].length &&
                ny >= 0 &&
                ny < maze.length &&
                maze[ny][nx] !== "wall" &&
                !endVisited.has(`${nx},${ny}`)
              ) {
                endVisited.add(`${nx},${ny}`);
                endQueue.push({
                  x: nx,
                  y: ny,
                  path: [...path, `${nx},${ny}`],
                });
              }
            }
          }
        }
      } else {
        setHintPath(new Set());
      }
    }, [showHint, maze, playerPosition, endPosition]);

    return (
      <div
        className="maze"
        style={{
          willChange: "transform",
          transform: "translateZ(0)",
          backfaceVisibility: "hidden",
          perspective: "1000px",
        }}
      >
        {maze.map((row, y) => (
          <div key={y} className="maze-row">
            {row.map((cell, x) => {
              const isPlayer = x === playerPosition.x && y === playerPosition.y;
              // 移除發光效果
              // const isGlowing = glowingCells[`${x},${y}`];
              const isHint = showHint && hintPath.has(`${x},${y}`);

              return (
                <div
                  key={`${x}-${y}`}
                  className={`maze-cell ${cell} ${isPlayer ? "player" : ""} ${
                    // isGlowing ? "glowing" : ""
                    ""
                  } ${isHint ? "hint" : ""}`}
                  aria-label={`${cell} at row ${y + 1}, column ${x + 1}`}
                  style={{
                    width: `var(--cell-size)`,
                    height: `var(--cell-size)`,
                    minWidth: `var(--cell-size)`,
                    minHeight: `var(--cell-size)`,
                    willChange: "transform",
                    transform: "translateZ(0)",
                    backfaceVisibility: "hidden",
                  }}
                >
                  {cell === "question" && "?"}
                  {cell === "obstacle" && "!"}
                  {cell === "start" && "S"}
                  {cell === "end" && "E"}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    );
  }
);

// 添加顯示名稱，有助於調試
Maze.displayName = "Maze";

export default Maze;
