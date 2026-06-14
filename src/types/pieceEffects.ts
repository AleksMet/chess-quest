// Универсальная система эффектов фигур режима ХАОС — объединяет постоянные
// улучшения (pieceUpgrades) и временные дебаффы (например, Проклятие) в единую модель для HUD.

export type EffectCategory = 'attack' | 'defense' | 'debuff';

export interface PieceEffect {
  id: string;                 // уникальный id эффекта
  pieceId: string;            // id фигуры к которой привязан эффект — '${pieceType}_${pieceIndex}'
  pieceType: string;          // 'P','N','B','R','Q','K'
  pieceColor: 'w' | 'b';      // цвет фигуры
  effectType: string;         // 'berserk','sniper','guard','ambush','provocateur','curse'
  category: EffectCategory;   // attack / defense / debuff
  label: string;              // человекочитаемое название
  description: string;        // описание эффекта
  isTemporary: boolean;       // дебаффы временные, улучшения постоянные
  turnsRemaining?: number;     // для временных эффектов
}
