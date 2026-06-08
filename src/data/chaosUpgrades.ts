import type { ChaosUpgradeDefinition } from '../types/chaos';

export const UPGRADE_DEFINITIONS: ChaosUpgradeDefinition[] = [
  {
    type: 'berserk',
    category: 'attack',
    name: 'Берсерк',
    description: 'Фигура обязана атаковать если может. Серия взятий подряд приносит всё больше золота.',
    price: 80,
    bonusGold: 30,
  },
  {
    type: 'sniper',
    category: 'attack',
    name: 'Снайпер',
    description: 'Огромная награда за уничтожение более ценной фигуры противника.',
    price: 70,
    bonusGold: 50,
  },
  {
    type: 'provocateur',
    category: 'attack',
    name: 'Провокатор',
    description: 'Стоит под атакой противника и не взята — получай золото. Используй как приманку.',
    price: 60,
    bonusGold: 25,
  },
  {
    type: 'guard',
    category: 'defense',
    name: 'Страж',
    description: 'Награда за выживание. Фигура выжила 5 ходов — получай золото. Береги её.',
    price: 50,
    bonusGold: 15,
  },
  {
    type: 'ambush',
    category: 'defense',
    name: 'Засада',
    description: 'Фигура стоит на месте 2+ хода и берёт оттуда — огромная награда. Терпи и жди.',
    price: 65,
    bonusGold: 35,
  },
];
