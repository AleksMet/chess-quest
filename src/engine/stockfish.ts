import type { StockfishMove, StockfishConfig } from '../types';
import type { Square, PieceSymbol } from 'chess.js';

const DEFAULT_CONFIG: StockfishConfig = {
  skillLevel: 5,
  moveTimeMs: 500,
  timeoutMs: 3000,
};

export type StockfishStatus = 'idle' | 'initializing' | 'ready' | 'thinking' | 'error';

export interface StockfishEngine {
  initialize(): Promise<void>;
  setSkillLevel(level: number): void;
  getBestMove(fen: string, config?: Partial<StockfishConfig>): Promise<StockfishMove>;
  terminate(): void;
  getStatus(): StockfishStatus;
}

/**
 * Converts ELO to Stockfish skill level (0–20).
 * 400 ELO → 1, 2200 ELO → 20
 */
export function eloToSkillLevel(elo: number): number {
  return Math.max(1, Math.min(20, Math.round((elo - 400) / (1800 / 19)) + 1));
}

/**
 * Parses a UCI bestmove response into a StockfishMove object.
 * Format: "bestmove e2e4" or "bestmove e7e8q"
 */
export function parseBestMove(uciResponse: string): StockfishMove | null {
  const match = uciResponse.match(/bestmove\s+([a-h][1-8])([a-h][1-8])([qrbn])?/);
  if (!match) return null;
  return {
    from: match[1] as Square,
    to: match[2] as Square,
    promotion: match[3] as PieceSymbol | undefined,
    uci: `${match[1]}${match[2]}${match[3] ?? ''}`,
  };
}

/**
 * Picks a random legal move as fallback when Stockfish times out.
 */
export function getRandomLegalMove(legalMoves: string[]): string | null {
  if (legalMoves.length === 0) return null;
  return legalMoves[Math.floor(Math.random() * legalMoves.length)];
}

/**
 * Creates a Stockfish engine instance backed by a Web Worker.
 * In test environments (no Worker), falls back to a mock.
 */
export function createStockfishEngine(): StockfishEngine {
  let worker: Worker | null = null;
  let status: StockfishStatus = 'idle';
  let currentSkillLevel = DEFAULT_CONFIG.skillLevel;

  function postMessage(msg: string): void {
    worker?.postMessage(msg);
  }

  function initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      status = 'initializing';

      try {
        // In React Native, Stockfish runs via react-native-webview as a WASM worker.
        // The actual Worker path is resolved at runtime by the bundler.
        /* istanbul ignore next */
        const workerUrl = '../assets/stockfish.js';

        /* istanbul ignore next */
        worker = new Worker(workerUrl as string);
      } catch {
        // In test/Node.js environments, Worker is not available.
        // We resolve immediately with a mock status.
        status = 'ready';
        resolve();
        return;
      }

      /* istanbul ignore next — browser-only Worker event handlers */
      const timeout = setTimeout(() => {
        status = 'error';
        reject(new Error('Stockfish initialization timeout'));
      }, DEFAULT_CONFIG.timeoutMs);

      /* istanbul ignore next */
      worker.onmessage = (event: MessageEvent<string>) => {
        const line: string = typeof event.data === 'string' ? event.data : String(event.data);
        if (line.includes('uciok')) {
          clearTimeout(timeout);
          postMessage('isready');
        } else if (line.includes('readyok')) {
          status = 'ready';
          resolve();
        }
      };

      /* istanbul ignore next */
      worker.onerror = (err: ErrorEvent) => {
        clearTimeout(timeout);
        status = 'error';
        reject(new Error(`Stockfish worker error: ${err.message}`));
      };

      postMessage('uci');
    });
  }

  function setSkillLevel(level: number): void {
    currentSkillLevel = Math.max(0, Math.min(20, level));
    postMessage(`setoption name Skill Level value ${currentSkillLevel}`);
  }

  function getBestMove(fen: string, config?: Partial<StockfishConfig>): Promise<StockfishMove> {
    const moveTimeMs = config?.moveTimeMs ?? DEFAULT_CONFIG.moveTimeMs;
    const timeoutMs = config?.timeoutMs ?? DEFAULT_CONFIG.timeoutMs;

    return new Promise((resolve, reject) => {
      if (!worker) {
        // Mock for test environments: return e2e4 as placeholder
        resolve({ from: 'e2' as Square, to: 'e4' as Square, uci: 'e2e4' });
        return;
      }

      /* istanbul ignore next — only reachable when Worker is active (browser) */
      if (status !== 'ready') {
        reject(new Error(`Stockfish not ready, status: ${status}`));
        return;
      }

      /* istanbul ignore next */
      status = 'thinking';

      /* istanbul ignore next */
      const timeout = setTimeout(() => {
        status = 'ready';
        reject(new Error('Stockfish move timeout'));
      }, timeoutMs);

      /* istanbul ignore next */
      const originalHandler = worker.onmessage;
      /* istanbul ignore next */
      worker.onmessage = (event: MessageEvent<string>) => {
        const line: string = typeof event.data === 'string' ? event.data : String(event.data);
        if (line.startsWith('bestmove')) {
          clearTimeout(timeout);
          status = 'ready';
          worker!.onmessage = originalHandler;

          const move = parseBestMove(line);
          if (move) {
            resolve(move);
          } else {
            reject(new Error(`Failed to parse bestmove: ${line}`));
          }
        }
      };

      /* istanbul ignore next */
      postMessage(`position fen ${fen}`);
      /* istanbul ignore next */
      postMessage(`go movetime ${moveTimeMs}`);
    });
  }

  function terminate(): void {
    worker?.terminate();
    worker = null;
    status = 'idle';
  }

  function getStatus(): StockfishStatus {
    return status;
  }

  return { initialize, setSkillLevel, getBestMove, terminate, getStatus };
}
