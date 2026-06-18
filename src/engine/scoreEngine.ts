export function calcMateScore(movesUsed: number, movesLimit: number): number {
  return 500 + Math.max(0, (movesLimit - movesUsed) * 20);
}

export function calcCaptureScore(pieceType: string): number {
  const table: Record<string, number> = { p: 15, n: 30, b: 30, r: 50, q: 85, k: 0 };
  return table[pieceType.toLowerCase()] ?? 0;
}

export function calcFlagHoldScore(holdMoves: number): number {
  return holdMoves * 40;
}

export function calcSurvivalScore(survivedMoves: number): number {
  return survivedMoves * 15;
}

export function calcChapterStars(totalScore: number): 1 | 2 | 3 {
  if (totalScore > 3000) return 3;
  if (totalScore > 1500) return 2;
  return 1;
}
