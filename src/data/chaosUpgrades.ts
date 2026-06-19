import type { ChaosUpgradeDefinition } from '../types/chaos';
import type { UpgradeRarity } from '../types/mechanics';

export const UPGRADE_DEFINITIONS: ChaosUpgradeDefinition[] = [
  // ── БЕРСЕРК (атака) ─────────────────────────────────────────────────────────
  {
    type: 'berserk', category: 'attack', rarity: 'common', price: 80, bonusGold: 30,
    name: 'Берсерк I',
    description: 'Фигура обязана атаковать если может. Серия взятий подряд приносит всё больше золота.',
  },
  {
    type: 'berserk_2', category: 'attack', rarity: 'uncommon', price: 130, bonusGold: 50,
    name: 'Берсерк II',
    description: 'Усиленный берсерк. Серия взятий приносит заметно больше золота.',
  },
  {
    type: 'berserk_3', category: 'attack', rarity: 'rare', price: 200, bonusGold: 75,
    name: 'Берсерк III',
    description: 'Берсерк-мастер. Максимальный бонус за непрерывную серию взятий.',
  },

  // ── СТРАЖ (защита) ──────────────────────────────────────────────────────────
  {
    type: 'guard', category: 'defense', rarity: 'common', price: 50, bonusGold: 15,
    name: 'Страж I',
    description: 'Награда за выживание. Фигура выжила 5 ходов — получай золото. Береги её.',
  },
  {
    type: 'guard_2', category: 'defense', rarity: 'uncommon', price: 85, bonusGold: 28,
    name: 'Страж II',
    description: 'Опытный страж. Золото каждые 4 хода выживания вместо 5.',
  },
  {
    type: 'guard_3', category: 'defense', rarity: 'rare', price: 130, bonusGold: 45,
    name: 'Страж III',
    description: 'Бессмертный страж. Щедрое золото каждые 3 хода выживания.',
  },

  // ── ФОРТИФИКАТОР (защита) ───────────────────────────────────────────────────
  {
    type: 'fortifier', category: 'defense', rarity: 'common', price: 55, bonusGold: 20,
    name: 'Фортификатор I',
    description: 'Фигура стоит в центре — каждый ход контроля приносит золото.',
  },
  {
    type: 'fortifier_2', category: 'defense', rarity: 'uncommon', price: 90, bonusGold: 35,
    name: 'Фортификатор II',
    description: 'Улучшенный фортификатор. Больший бонус за удержание центра.',
  },
  {
    type: 'fortifier_3', category: 'defense', rarity: 'rare', price: 140, bonusGold: 55,
    name: 'Фортификатор III',
    description: 'Несокрушимый фортификатор. Центр приносит максимальное золото.',
  },

  // ── ИНИЦИАТОР (атака) ───────────────────────────────────────────────────────
  {
    type: 'initiator', category: 'attack', rarity: 'common', price: 65, bonusGold: 25,
    name: 'Инициатор I',
    description: 'Первое взятие партии приносит бонусное золото. Начинай агрессивно.',
  },
  {
    type: 'initiator_2', category: 'attack', rarity: 'uncommon', price: 105, bonusGold: 42,
    name: 'Инициатор II',
    description: 'Опытный инициатор. Первые два взятия приносят золото.',
  },
  {
    type: 'initiator_3', category: 'attack', rarity: 'rare', price: 160, bonusGold: 65,
    name: 'Инициатор III',
    description: 'Мастер первого удара. Максимальный бонус за ранние взятия.',
  },

  // ── СНАЙПЕР (атака) ─────────────────────────────────────────────────────────
  {
    type: 'sniper', category: 'attack', rarity: 'uncommon', price: 70, bonusGold: 50,
    name: 'Снайпер I',
    description: 'Огромная награда за уничтожение более ценной фигуры противника.',
  },
  {
    type: 'sniper_2', category: 'attack', rarity: 'rare', price: 115, bonusGold: 80,
    name: 'Снайпер II',
    description: 'Меткий стрелок. Ещё больше золота за снос старших фигур врага.',
  },
  {
    type: 'sniper_3', category: 'attack', rarity: 'epic', price: 180, bonusGold: 120,
    name: 'Снайпер III',
    description: 'Легендарный снайпер. Колоссальная награда за уничтожение ценных фигур.',
  },

  // ── ОПЕКУН (защита) ─────────────────────────────────────────────────────────
  {
    type: 'caretaker', category: 'defense', rarity: 'uncommon', price: 75, bonusGold: 35,
    name: 'Опекун I',
    description: 'Фигура рядом с союзником — каждый ход защиты приносит золото.',
  },
  {
    type: 'caretaker_2', category: 'defense', rarity: 'rare', price: 120, bonusGold: 58,
    name: 'Опекун II',
    description: 'Верный опекун. Повышенный бонус за прикрытие союзных фигур.',
  },
  {
    type: 'caretaker_3', category: 'defense', rarity: 'epic', price: 185, bonusGold: 90,
    name: 'Опекун III',
    description: 'Непробиваемый щит. Максимальный бонус за защиту каждого союзника.',
  },

  // ── МАРОДЁР (атака) ─────────────────────────────────────────────────────────
  {
    type: 'marauder', category: 'attack', rarity: 'uncommon', price: 85, bonusGold: 40,
    name: 'Мародёр I',
    description: 'Взял две и более фигур за бой — получай бонус. Охоться стаей.',
  },
  {
    type: 'marauder_2', category: 'attack', rarity: 'rare', price: 135, bonusGold: 65,
    name: 'Мародёр II',
    description: 'Опытный мародёр. Выше бонус за серийные взятия в одном бою.',
  },
  {
    type: 'marauder_3', category: 'attack', rarity: 'epic', price: 210, bonusGold: 100,
    name: 'Мародёр III',
    description: 'Безжалостный мародёр. Максимальная добыча за уничтожение армии.',
  },

  // ── РАЗВЕДЧИК (атака) ───────────────────────────────────────────────────────
  {
    type: 'scout', category: 'attack', rarity: 'rare', price: 100, bonusGold: 60,
    name: 'Разведчик I',
    description: 'Фигура вышла на вражескую половину доски — получай золото.',
  },
  {
    type: 'scout_2', category: 'attack', rarity: 'epic', price: 165, bonusGold: 95,
    name: 'Разведчик II',
    description: 'Опытный разведчик. Высокий бонус за глубокое проникновение.',
  },
  {
    type: 'scout_3', category: 'attack', rarity: 'legendary', price: 260, bonusGold: 140,
    name: 'Разведчик III',
    description: 'Тень за линиями врага. Легендарный бонус за контроль вражеских рядов.',
  },

  // ── ЛЕГЕНДА (атака) ─────────────────────────────────────────────────────────
  {
    type: 'legend', category: 'attack', rarity: 'epic', price: 210, bonusGold: 110,
    name: 'Легенда I',
    description: 'Двойной бонус за любое взятие. Эта фигура — легенда поля боя.',
  },
  {
    type: 'legend_2', category: 'attack', rarity: 'legendary', price: 340, bonusGold: 165,
    name: 'Легенда II',
    description: 'Живая легенда. Огромный бонус за каждое взятие, любой фигурой.',
  },
  {
    type: 'legend_3', category: 'attack', rarity: 'legendary', price: 500, bonusGold: 240,
    name: 'Легенда III',
    description: 'Бессмертная легенда. Максимально возможная добыча за каждый захват.',
  },

  // ── Устаревшие типы (обратная совместимость) ────────────────────────────────
  {
    type: 'provocateur', category: 'attack', rarity: 'uncommon', price: 60, bonusGold: 25,
    name: 'Провокатор',
    description: 'Стоит под атакой противника и не взята — получай золото.',
  },
  {
    type: 'ambush', category: 'defense', rarity: 'uncommon', price: 65, bonusGold: 0,
    name: 'Засада',
    description: 'Фигура стоит на месте 3+ хода — следующее взятие даёт ×2 золота.',
  },
];

// ── Пул редкостей по акту ──────────────────────────────────────────────────────

function getUpgradePool(act: number, isLargeShop: boolean = false): UpgradeRarity[] {
  switch (act) {
    case 1: return isLargeShop
      ? ['common', 'uncommon', 'rare']
      : ['common', 'uncommon']
    case 2: return ['common', 'uncommon', 'rare', 'epic']
    case 3: return ['uncommon', 'rare', 'epic', 'legendary']
    default: return ['common', 'uncommon']
  }
}

function getShopWeights(act: number, isLargeShop: boolean): Partial<Record<UpgradeRarity, number>> {
  if (act === 1) {
    return isLargeShop
      ? { common: 40, uncommon: 45, rare: 15 }
      : { common: 70, uncommon: 30 }
  }
  if (act === 2) return { common: 20, uncommon: 35, rare: 30, epic: 15 }
  if (act === 3) return { uncommon: 20, rare: 30, epic: 35, legendary: 15 }
  return { common: 70, uncommon: 30 }
}

function weightedRarity(weights: Partial<Record<UpgradeRarity, number>>): UpgradeRarity {
  const entries = Object.entries(weights) as [UpgradeRarity, number][]
  const total = entries.reduce((s, [, w]) => s + w, 0)
  let r = Math.random() * total
  for (const [rarity, w] of entries) {
    r -= w
    if (r <= 0) return rarity
  }
  return entries[entries.length - 1][0]
}

export function getShopUpgrades(act: number, isLargeShop: boolean): ChaosUpgradeDefinition[] {
  const count = isLargeShop ? 6 : 4
  const pool = getUpgradePool(act, isLargeShop)
  const weights = getShopWeights(act, isLargeShop)
  const available = UPGRADE_DEFINITIONS.filter(d => pool.includes(d.rarity))
  const remaining = [...available]
  const selected: ChaosUpgradeDefinition[] = []

  while (selected.length < count && remaining.length > 0) {
    const rarity = weightedRarity(weights)
    const candidates = remaining.filter(d => d.rarity === rarity)
    const source = candidates.length > 0 ? candidates : remaining
    const pick = source[Math.floor(Math.random() * source.length)]
    selected.push(pick)
    remaining.splice(remaining.indexOf(pick), 1)
  }

  return selected
}
