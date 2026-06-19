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
    type: 'guard', category: 'defense', rarity: 'common', price: 50, bonusGold: 14,
    name: 'Страж I',
    description: '+14 золота каждый ход рядом с королём (радиус 2, макс 5 раз).',
  },
  {
    type: 'guard_2', category: 'defense', rarity: 'uncommon', price: 85, bonusGold: 18,
    name: 'Страж II',
    description: '+18 золота каждый ход рядом с королём (радиус 2, макс 5 раз).',
  },
  {
    type: 'guard_3', category: 'defense', rarity: 'rare', price: 130, bonusGold: 25,
    name: 'Страж III',
    description: '+25 золота каждый ход рядом с королём (радиус 2, макс 5 раз).',
  },

  // ── ФОРТИФИКАТОР (защита) ───────────────────────────────────────────────────
  {
    type: 'fortifier', category: 'defense', rarity: 'common', price: 55, bonusGold: 20,
    name: 'Фортификатор I',
    description: '+20 золота каждый ход пока эта пешка стоит на 6-7 горизонтали.',
  },
  {
    type: 'fortifier_2', category: 'defense', rarity: 'uncommon', price: 90, bonusGold: 25,
    name: 'Фортификатор II',
    description: '+25 золота каждый ход пока эта пешка стоит на 6-7 горизонтали.',
  },
  {
    type: 'fortifier_3', category: 'defense', rarity: 'rare', price: 140, bonusGold: 28,
    name: 'Фортификатор III',
    description: '+28 золота каждый ход пока эта пешка стоит на 6-7 горизонтали.',
  },

  // ── ИНИЦИАТОР (атака) ───────────────────────────────────────────────────────
  {
    type: 'initiator', category: 'attack', rarity: 'common', price: 65, bonusGold: 65,
    name: 'Инициатор I',
    description: '+65 золота за первое взятие в бою этой фигурой.',
  },
  {
    type: 'initiator_2', category: 'attack', rarity: 'uncommon', price: 105, bonusGold: 85,
    name: 'Инициатор II',
    description: '+85 золота за первые 2 взятия в бою этой фигурой.',
  },
  {
    type: 'initiator_3', category: 'attack', rarity: 'rare', price: 160, bonusGold: 100,
    name: 'Инициатор III',
    description: '+100 золота за первые 3 взятия в бою этой фигурой.',
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
    type: 'caretaker', category: 'defense', rarity: 'uncommon', price: 75, bonusGold: 12,
    name: 'Опекун I',
    description: '+12 золота каждый ход пока фигура защищает хотя бы одного союзника.',
  },
  {
    type: 'caretaker_2', category: 'defense', rarity: 'rare', price: 120, bonusGold: 16,
    name: 'Опекун II',
    description: '+16 золота каждый ход пока фигура защищает союзника.',
  },
  {
    type: 'caretaker_3', category: 'defense', rarity: 'epic', price: 185, bonusGold: 20,
    name: 'Опекун III',
    description: '+20 золота каждый ход пока фигура защищает союзника.',
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
    type: 'scout', category: 'attack', rarity: 'rare', price: 100, bonusGold: 18,
    name: 'Разведчик I',
    description: '+18 золота за вилку (атака 2+ фигур противника одновременно).',
  },
  {
    type: 'scout_2', category: 'attack', rarity: 'epic', price: 165, bonusGold: 22,
    name: 'Разведчик II',
    description: '+22 золота за вилку или тихий ход с угрозой двум фигурам.',
  },
  {
    type: 'scout_3', category: 'attack', rarity: 'legendary', price: 260, bonusGold: 30,
    name: 'Разведчик III',
    description: '+30 золота за тройную вилку (атака 3+ фигур одновременно).',
  },

  // ── ЛЕГЕНДА (атака) ─────────────────────────────────────────────────────────
  {
    type: 'legend', category: 'attack', rarity: 'epic', price: 210, bonusGold: 0,
    name: 'Легенда I',
    description: '+8% золота за захват за каждый пережитый бой (макс +40%).',
  },
  {
    type: 'legend_2', category: 'attack', rarity: 'legendary', price: 340, bonusGold: 0,
    name: 'Легенда II',
    description: '+12% золота за захват за каждый пережитый бой (макс +48%).',
  },
  {
    type: 'legend_3', category: 'attack', rarity: 'legendary', price: 500, bonusGold: 0,
    name: 'Легенда III',
    description: '+15% золота за захват за каждый пережитый бой (макс +60%).',
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
