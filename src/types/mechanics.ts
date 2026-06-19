export type BattleType =
  | 'standard'
  | 'objective_queen_hunt'
  | 'objective_pawn_march'
  | 'objective_royal_shield'
  | 'elite'

export type BattleModifier =
  | 'reinforced_pawns'
  | 'golden_zone'
  | 'weak_flank'
  | 'no_castling'
  | 'open_board'
  | 'berserk_knight'
  | 'double_knights'
  | 'berserk_queen'
  | 'closed_board'

export type AISpecialUpgrade = 'vortex' | 'ricochet'

export type AISpecialUpgradeConfig = {
  type: AISpecialUpgrade
  square: string
  piece: 'n' | 'b'
  usedThisTurn: boolean
}

export type BattleNode = {
  type: BattleType
  elo: number
  modifiers?: BattleModifier[]
  aiSpecialUpgrades?: AISpecialUpgrade[]
  isChoice?: boolean
}

export type ActConfig = {
  act: number
  startGold: number
  bossElo?: number
  nodes: BattleNode[]
}

export type ProgressNode = {
  icon: string
  label: string
  type: BattleType | 'shop' | 'event' | 'boss'
}
