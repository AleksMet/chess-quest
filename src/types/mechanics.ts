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

export type BattleNode = {
  type: BattleType
  elo: number
  modifiers?: BattleModifier[]
  isChoice?: boolean
}

export type ActConfig = {
  act: number
  startGold: number
  nodes: BattleNode[]
}

export type ProgressNode = {
  icon: string
  label: string
  type: BattleType | 'shop' | 'event' | 'boss'
}
