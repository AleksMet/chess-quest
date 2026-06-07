import { CLOCK_POSITIONS } from '../data/battlePositions';

// TODO: классический режим — временно отключён (заменён режимом ХАОС), движок не используется в навигации
// Режим «Часы»: партия с общим лимитом времени на ходы игрока
export const CLOCK_ELO = 1100;
export const CLOCK_TIME_LIMIT_SECONDS = 90;
export const CLOCK_MATE_BONUS = 200;

export function selectClockPosition(): string {
  const entropy = (Date.now() + Math.random() * 1e9) >>> 0;
  const idx = entropy % CLOCK_POSITIONS.length;
  return CLOCK_POSITIONS[idx];
}

// По истечении времени побеждает тот, у кого больше взято материала; иначе — ничья
export function resolveClockTimeout(playerCaptureValue: number, aiCaptureValue: number): 'win' | 'draw' {
  return playerCaptureValue > aiCaptureValue ? 'win' : 'draw';
}
