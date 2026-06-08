import type { Href } from 'expo-router';

export interface ChaosNodeDef {
  icon: string;
  label: string;
  route: Href;
}

// Порядок узлов снизу вверх = порядок прохождения (currentFloor 0..5)
export const CHAOS_TOWER_NODES: ChaosNodeDef[] = [
  { icon: '🏪', label: 'Магазин 1', route: '/chaos-shop' },
  { icon: '⚔️', label: 'Бой 1',     route: '/chaos-battle' },
  { icon: '💎', label: 'Сокровище', route: '/chaos-treasure' },
  { icon: '⚔️', label: 'Бой 2',     route: '/chaos-battle' },
  { icon: '🏪', label: 'Магазин 2', route: '/chaos-shop' },
  { icon: '👑', label: 'Босс',      route: '/chaos-boss-intro' },
];
