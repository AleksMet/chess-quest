import { Chess } from 'chess.js';
import type { Square, Color } from 'chess.js';
import { ARTIFACTS } from '../../src/data/artifacts';
import { processMove } from '../../src/engine/rewardEngine';
import type { BattleContext, Hero } from '../../src/types';

const mockHero: Hero = {
  id: 'timmy_pawn',
  name: 'Test Hero',
  description: '',
  figure: 'p',
  unlocked: true,
  auraDescription: '',
  applyAura: (r) => r,
};

function makeCtx(
  chess: Chess,
  from: string,
  to: string,
  opts: { promotion?: string; playerColor?: Color; kingCheckedThisGame?: boolean } = {}
): BattleContext {
  const fenBefore = chess.fen();
  const move = chess.move({
    from: from as Square,
    to: to as Square,
    ...(opts.promotion ? { promotion: opts.promotion as 'q' | 'r' | 'b' | 'n' } : {}),
  });
  return {
    chess,
    move: move!,
    positionFenBefore: fenBefore,
    goldBalance: 0,
    artifacts: [],
    hero: mockHero,
    moveNumber: 1,
    playerColor: opts.playerColor ?? (move!.color as Color),
    kingCheckedThisGame: opts.kingCheckedThisGame ?? false,
  };
}

function artifact(id: string) {
  const a = ARTIFACTS.find(x => x.id === id);
  if (!a) throw new Error(`Artifact not found: ${id}`);
  return a;
}

describe('Artifact effects', () => {
  it('Пешечный Марш — promotion gives +50 gold', () => {
    // WP on a7, WK h1, BK a1
    const chess = new Chess('8/P7/8/8/8/8/8/k6K w - - 0 1');
    const ctx = makeCtx(chess, 'a7', 'a8', { promotion: 'q', playerColor: 'w' });
    expect(artifact('pawn_march').effect(ctx).gold).toBe(50);
  });

  it('Защитник Центра — pawn to e4 gives +5 gold', () => {
    const chess = new Chess();
    const ctx = makeCtx(chess, 'e2', 'e4', { playerColor: 'w' });
    expect(artifact('center_defender').effect(ctx).gold).toBe(5);
  });

  it('Школа Коней — knight capture gives +20 gold', () => {
    // WN c3, BR d5, WK h1, BK a8
    const chess = new Chess('k7/8/8/3r4/8/2N5/8/7K w - - 0 1');
    const ctx = makeCtx(chess, 'c3', 'd5', { playerColor: 'w' });
    expect(artifact('knight_school').effect(ctx).gold).toBe(20);
  });

  it('Мастер Вилок — knight fork gives +60 gold', () => {
    // WN d3 → e5, BQ d7, BR g6, WK h1, BK a8
    const chess = new Chess('k7/3q4/6r1/8/8/3N4/8/7K w - - 0 1');
    const ctx = makeCtx(chess, 'd3', 'e5', { playerColor: 'w' });
    expect(artifact('fork_master').effect(ctx).gold).toBe(60);
  });

  it('Диагональный Маг — bishop move gives +5 per controlled square', () => {
    // WB d4 → e5, WK h1, BK a8 (no blocking pieces)
    const chess = new Chess('k7/8/8/8/3B4/8/8/7K w - - 0 1');
    const ctx = makeCtx(chess, 'd4', 'e5', { playerColor: 'w' });
    const result = artifact('diagonal_mage').effect(ctx);
    // From e5: NE=3, NW=3, SW=4(d4,c3,b2,a1), SE=3 → 13 squares × 5 = 65
    expect(result.gold).toBe(65);
    expect(result.triggeredArtifactIds).toContain('diagonal_mage');
  });

  it('Мастер Связок — bishop pin gives +80 gold', () => {
    // WB b3 → c4, BN d5, BK g8, WK h1
    const chess = new Chess('6k1/8/8/3n4/8/1B6/8/7K w - - 0 1');
    const ctx = makeCtx(chess, 'b3', 'c4', { playerColor: 'w' });
    expect(artifact('pin_master').effect(ctx).gold).toBe(80);
  });

  it('Башенная Крепость — castling gives +80 gold', () => {
    // Position ready for white kingside castling
    const chess = new Chess('r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1');
    const ctx = makeCtx(chess, 'e1', 'g1', { playerColor: 'w' });
    expect(artifact('castle_fortress').effect(ctx).gold).toBe(80);
  });

  it('Владыка Линий — rook on open file gives +10 gold', () => {
    // WR a1, no pawns on a-file, WK h1, BK a8
    const chess = new Chess('k7/8/8/8/8/8/8/R6K w - - 0 1');
    const ctx = makeCtx(chess, 'a1', 'a5', { playerColor: 'w' });
    expect(artifact('line_lord').effect(ctx).gold).toBe(10);
  });

  it('Охотник на Ферзей — checkmate with queen alive gives +200 gold', () => {
    // WK c1, WQ g2, BK a1 → Qg2-b2 is checkmate
    const chess = new Chess('8/8/8/8/8/8/6Q1/k1K5 w - - 0 1');
    const ctx = makeCtx(chess, 'g2', 'b2', { playerColor: 'w' });
    expect(artifact('queen_hunter').effect(ctx).gold).toBe(200);
  });

  it('Железный Трон — checkmate without king check gives +150 gold', () => {
    // Same checkmate, king was never checked
    const chess = new Chess('8/8/8/8/8/8/6Q1/k1K5 w - - 0 1');
    const ctx = makeCtx(chess, 'g2', 'b2', { playerColor: 'w', kingCheckedThisGame: false });
    expect(artifact('iron_throne').effect(ctx).gold).toBe(150);
  });
});

describe('processMove', () => {
  it('returns zero gold when no artifacts', () => {
    const chess = new Chess();
    const ctx = makeCtx(chess, 'e2', 'e4');
    const result = processMove(ctx);
    expect(result.gold).toBe(0);
  });

  it('accumulates gold from multiple artifacts', () => {
    const chess = new Chess();
    const ctx = makeCtx(chess, 'e2', 'e4', { playerColor: 'w' });
    ctx.artifacts = [artifact('center_defender'), artifact('center_defender')];
    const result = processMove(ctx);
    expect(result.gold).toBe(10); // 5 + 5
  });

  it('applies hero aura on top of artifact rewards', () => {
    // WP a7→a8=Q: pawn_march +50, Timmy aura +25% → total 62 (50 * 1.25 rounded)
    const chess = new Chess('8/P7/8/8/8/8/8/k6K w - - 0 1');
    const ctx = makeCtx(chess, 'a7', 'a8', { promotion: 'q', playerColor: 'w' });
    ctx.artifacts = [artifact('pawn_march')];
    ctx.hero = {
      id: 'timmy_pawn',
      name: 'Тимми',
      description: '',
      figure: 'p',
      unlocked: true,
      auraDescription: '+25% за превращения',
      applyAura: (r, c) => {
        if (r.gold === 0 || c.move.flags.indexOf('p') === -1) return r;
        const bonus = Math.round(r.gold * 0.25);
        return { ...r, gold: r.gold + bonus };
      },
    };
    const result = processMove(ctx);
    expect(result.gold).toBe(63); // 50 + round(50*0.25)=13 → 63
  });
});
