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

// The 3 randomisable battle types for floors 0-5
const BATTLE_TYPES: FloorType[] = ['sniper', 'survival', 'flag', 'quick_battle'];

// Fisher-Yates shuffle
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Generate a randomised 7-floor sequence:
// floors 0-5: 6 battle floors (shuffle 4 types, repeat 2 of them randomly)
// floor 6: always boss
export function generateFloorTypes(): FloorType[] {
  const shuffled = shuffle(BATTLE_TYPES);
  // Pick 2 extras from the same pool to fill 6 slots
  const extras = shuffle(BATTLE_TYPES).slice(0, 2);
  const battles = shuffle([...shuffled, ...extras]);
  return [...battles, 'boss'];
}
