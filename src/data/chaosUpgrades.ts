import type { ChaosUpgradeDefinition } from '../types/chaos';

export const UPGRADE_DEFINITIONS: ChaosUpgradeDefinition[] = [
  {
    type: 'greedy',
    category: 'attack',
    name: 'Жадный',
    description: 'Каждое взятие этой фигурой приносит дополнительное золото',
    price: 60,
    bonusGold: 20,
  },
  {
    type: 'berserk',
    category: 'attack',
    name: 'Берсерк',
    description: 'Фигура атакует при первой возможности и приносит больше золота. Осторожно — она может зайти в ловушку!',
    price: 80,
    bonusGold: 30,
  },
  {
    type: 'sniper',
    category: 'attack',
    name: 'Снайпер',
    description: 'Огромная награда за уничтожение более ценной фигуры противника',
    price: 70,
    bonusGold: 50,
  },
  {
    type: 'guard',
    category: 'defense',
    name: 'Страж',
    description: 'Награда за выживание. Береги эту фигуру и получай золото',
    price: 50,
    bonusGold: 15,
  },
  {
    type: 'fortress',
    category: 'defense',
    name: 'Крепость',
    description: 'Фигура зарабатывает золото удерживая позицию. Не двигай её без необходимости',
    price: 50,
    bonusGold: 10,
  },
];
