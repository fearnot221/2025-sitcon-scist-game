import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { LeaderboardEntry } from "../../../../components/Leaderboard";

// 排行榜檔案路徑
const leaderboardPath = path.join(
  process.cwd(),
  "src/data",
  "leaderboard.json"
);

// 讀取排行榜
const readLeaderboard = (): LeaderboardEntry[] => {
  try {
    if (fs.existsSync(leaderboardPath)) {
      const data = fs.readFileSync(leaderboardPath, "utf8");
      return JSON.parse(data);
    }
    return [];
  } catch (error) {
    console.error("讀取排行榜失敗:", error);
    return [];
  }
};

// 檢查名字是否存在
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const name = searchParams.get("name")?.trim();

    if (!name) {
      return NextResponse.json({ error: "缺少名稱參數" }, { status: 400 });
    }

    const leaderboard = readLeaderboard();
    // 不區分大小寫比對名字
    const exists = leaderboard.some(
      (entry) => entry.name.toLowerCase() === name.toLowerCase()
    );

    return NextResponse.json({ exists });
  } catch (error) {
    console.error("檢查名稱失敗:", error);
    return NextResponse.json({ error: "處理請求失敗" }, { status: 500 });
  }
}
