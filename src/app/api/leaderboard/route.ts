import { promises as fs } from "fs";
import { NextRequest, NextResponse } from "next/server";
import path from "path";

// 定義排行榜項目的介面
export interface LeaderboardEntry {
  name: string;
  time: number;
  date: string;
  score?: number;
  moveCount?: number;
  correctAnswers?: number;
  wrongAnswers?: number;
}

// 排行榜檔案路徑
const leaderboardPath = path.join(
  process.cwd(),
  "src/data",
  "leaderboard.json"
);

// 確保資料目錄存在
const ensureDataDir = async () => {
  const dataDir = path.join(process.cwd(), "src/data");
  try {
    await fs.access(dataDir);
  } catch {
    await fs.mkdir(dataDir, { recursive: true });
  }
};

// 讀取排行榜資料
const readLeaderboard = async (): Promise<LeaderboardEntry[]> => {
  ensureDataDir();

  try {
    await fs.access(leaderboardPath);
  } catch {
    // 如果檔案不存在，建立空的排行榜
    await fs.writeFile(leaderboardPath, JSON.stringify([]));
    return [];
  }

  try {
    const data = await fs.readFile(leaderboardPath, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    console.error("讀取排行榜失敗:", error);
    return [];
  }
};

// GET 請求處理 - 獲取排行榜
export async function GET() {
  try {
    const data = await fs.readFile(leaderboardPath, "utf8");
    return NextResponse.json(JSON.parse(data));
  } catch (error: unknown) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(
      { error: "Unknown error occurred" },
      { status: 500 }
    );
  }
}

// POST 請求處理 - 新增排行榜項目
export async function POST(request: NextRequest) {
  try {
    const newScore = await request.json();
    const name = newScore.name?.trim();

    if (!name) {
      return NextResponse.json({ error: "名稱不能為空" }, { status: 400 });
    }

    // 讀取現有排行榜
    const leaderboard = await readLeaderboard();

    // 檢查名字是否已存在（不區分大小寫）
    const nameExists = leaderboard.some(
      (entry) => entry.name.toLowerCase() === name.toLowerCase()
    );

    if (nameExists) {
      return NextResponse.json({ error: "此名稱已被使用" }, { status: 400 });
    }

    // 檢查是否已經有相同的記錄
    const isDuplicate = leaderboard.some(
      (entry) =>
        Math.abs(entry.time - newScore.time) < 1 && // 允許1秒內的誤差
        entry.score === newScore.score &&
        entry.moveCount === newScore.moveCount &&
        entry.correctAnswers === newScore.correctAnswers &&
        entry.wrongAnswers === newScore.wrongAnswers
    );

    if (isDuplicate) {
      return NextResponse.json(
        { error: "此成績已經登錄過了" },
        { status: 400 }
      );
    }

    // 添加新成績並按分數排序
    leaderboard.push(newScore);
    leaderboard.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

    // 寫入檔案
    await fs.writeFile(leaderboardPath, JSON.stringify(leaderboard, null, 2));

    return NextResponse.json({ success: true, leaderboard });
  } catch (error) {
    console.error("Error saving score:", error);
    return NextResponse.json({ error: "無法保存成績" }, { status: 500 });
  }
}
