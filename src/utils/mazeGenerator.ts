import { CellType } from "../components/Game";

// 生成迷宮
export const generateMaze = (
  width: number = 15,
  height: number = 15,
  questionCount: number = 5,
  obstacleCount: number = 3
): CellType[][] => {
  // 確保寬度和高度是奇數
  width = width % 2 === 0 ? width + 1 : width;
  height = height % 2 === 0 ? height + 1 : height;

  // 初始化迷宮，全部填充為牆
  const maze: CellType[][] = Array(height)
    .fill(null)
    .map(() => Array(width).fill("wall"));

  // 使用深度優先搜索生成迷宮
  const startX = 1;
  const startY = 1;
  maze[startY][startX] = "empty";

  const stack: [number, number][] = [[startX, startY]];
  const visited = new Set<string>();
  visited.add(`${startX},${startY}`);

  const directions = [
    [0, -2], // 上
    [2, 0], // 右
    [0, 2], // 下
    [-2, 0], // 左
  ];

  while (stack.length > 0) {
    const [x, y] = stack[stack.length - 1];
    const neighbors: [number, number][] = [];

    // 檢查四個方向的鄰居
    for (const [dx, dy] of directions) {
      const nx = x + dx;
      const ny = y + dy;
      if (
        nx > 0 &&
        nx < width - 1 &&
        ny > 0 &&
        ny < height - 1 &&
        !visited.has(`${nx},${ny}`)
      ) {
        neighbors.push([nx, ny]);
      }
    }

    if (neighbors.length > 0) {
      // 隨機選擇一個未訪問的鄰居
      const [nx, ny] = neighbors[Math.floor(Math.random() * neighbors.length)];
      // 打通牆壁
      maze[y + (ny - y) / 2][x + (nx - x) / 2] = "empty";
      maze[ny][nx] = "empty";
      visited.add(`${nx},${ny}`);
      stack.push([nx, ny]);
    } else {
      // 回溯
      stack.pop();
    }
  }

  // 設置起點和終點
  maze[startY][startX] = "start";

  // 找到一個遠離起點的位置作為終點
  let endX = width - 2;
  let endY = height - 2;

  // 確保終點是空的
  while (maze[endY][endX] !== "empty") {
    endX = Math.max(1, Math.floor(Math.random() * (width - 2)));
    endY = Math.max(1, Math.floor(Math.random() * (height - 2)));
  }

  maze[endY][endX] = "end";

  // 隨機放置問題和障礙
  const emptyCells: [number, number][] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (maze[y][x] === "empty") {
        emptyCells.push([x, y]);
      }
    }
  }

  // 打亂空單元格
  shuffleArray(emptyCells);

  // 放置問題
  for (let i = 0; i < Math.min(questionCount, emptyCells.length); i++) {
    const [x, y] = emptyCells[i];
    maze[y][x] = "question";
  }

  // 放置障礙
  for (
    let i = questionCount;
    i < Math.min(questionCount + obstacleCount, emptyCells.length);
    i++
  ) {
    const [x, y] = emptyCells[i];
    maze[y][x] = "obstacle";
  }

  return maze;
};

// 打亂數組
const shuffleArray = <T>(array: T[]): T[] => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};
