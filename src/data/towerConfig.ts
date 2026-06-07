// TODO: пересмотреть — режимы sniper/survival/flag/quick_battle/boss временно отключены
// (старая последовательность из 5 этажей заменена новой башней из 4 этажей)
// TODO: классический режим — временно отключён (заменён режимом ХАОС, см. chaosModeStore)
export type FloorType = 'handicap' | 'clock' | 'advantage' | 'free';

export interface FloorDef {
  type: FloorType;
  icon: string;
  label: string;
}

export const FLOOR_DEFS: Record<FloorType, FloorDef> = {
  handicap:  { type: 'handicap',  icon: '⚖️', label: 'Гандикап' },
  clock:     { type: 'clock',     icon: '⏱️', label: 'Часы' },
  advantage: { type: 'advantage', icon: '⚔️', label: 'Форы' },
  free:      { type: 'free',      icon: '🏆', label: 'Свободный бой' },
};

// Фиксированная последовательность — без рандома, одна и та же каждый забег
export const FIXED_TOWER_SEQUENCE: FloorType[] = [
  'handicap',  // этаж 1 (index 0)
  'clock',     // этаж 2 (index 1)
  'advantage', // этаж 3 (index 2)
  'free',      // этаж 4 (index 3) — фигуры переходят к итогам забега
];
