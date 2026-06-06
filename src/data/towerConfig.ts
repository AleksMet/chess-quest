export type FloorType = 'sniper' | 'survival' | 'flag' | 'quick_battle' | 'boss';

export interface FloorDef {
  type: FloorType;
  icon: string;
  label: string;
}

export const FLOOR_DEFS: Record<FloorType, FloorDef> = {
  sniper:      { type: 'sniper',      icon: '🎯', label: 'Снайпер' },
  survival:    { type: 'survival',    icon: '🛡️', label: 'Выживание' },
  flag:        { type: 'flag',        icon: '🚩', label: 'Флаг' },
  quick_battle:{ type: 'quick_battle',icon: '⚔️', label: 'Быстрый бой' },
  boss:        { type: 'boss',        icon: '👑', label: 'Босс' },
};

// Фиксированная последовательность — без рандома, одна и та же каждый забег
export const FIXED_TOWER_SEQUENCE: FloorType[] = [
  'sniper',       // этаж 1 (index 0)
  'flag',         // этаж 2 (index 1)
  'survival',     // этаж 3 (index 2)
  'quick_battle', // этаж 4 (index 3) — фигуры переходят к боссу
  'boss',         // этаж 5 (index 4)
];
