import { useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import type { WebView as WebViewType } from 'react-native-webview';
import type { WebViewErrorEvent, WebViewHttpErrorEvent } from 'react-native-webview/lib/WebViewTypes';

// ─── Inline UCI engine ────────────────────────────────────────────────────────
//
// The WebView runs a lightweight UCI-compatible JS engine.
// Move generation is done by React Native (chess.js) — RN sends the list of
// legal moves alongside each "position" command so the engine never needs to
// parse FEN or validate rules. The WebView only picks the best move from the
// supplied candidates, which keeps the HTML tiny and dependency-free.
//
// Custom UCI extension:
//   position fen <FEN> legal <uci1> <uci2> ...
//   go movetime <ms>
//   → bestmove <uci>

const ENGINE_HTML = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body>
<script>
(function () {
  var legalMoves = [];
  var skillLevel = 5;

  // Piece value table for greedy move selection
  var PIECE_VALUES = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

  // Square → index helpers
  function fileOf(sq) { return sq.charCodeAt(0) - 97; }
  function rankOf(sq) { return parseInt(sq[1], 10) - 1; }

  // Score a UCI move string based on the FEN board snapshot sent by RN.
  // The FEN board is stored so we can check what piece is on the target square.
  var boardRows = [];

  function pieceAt(file, rank) {
    if (boardRows.length === 0) return null;
    var row = boardRows[7 - rank];
    if (!row) return null;
    var col = 0;
    for (var i = 0; i < row.length; i++) {
      var ch = row[i];
      if (ch >= '1' && ch <= '8') {
        col += parseInt(ch, 10);
      } else {
        if (col === file) return ch;
        col++;
      }
    }
    return null;
  }

  function scoreMove(uci) {
    var toSq = uci.substring(2, 4);
    var target = pieceAt(fileOf(toSq), rankOf(toSq));
    var captureValue = target ? (PIECE_VALUES[target.toLowerCase()] || 0) : 0;

    // Promotion bonus
    var isPromotion = uci.length === 5 ? 4 : 0;

    // Noise decreases with skill level (higher skill → more deterministic)
    var noise = (21 - skillLevel) * Math.random();

    return captureValue * 10 + isPromotion * 5 + noise;
  }

  function pickBestMove() {
    if (legalMoves.length === 0) return '0000';
    var best = legalMoves[0];
    var bestScore = -Infinity;
    for (var i = 0; i < legalMoves.length; i++) {
      var s = scoreMove(legalMoves[i]);
      if (s > bestScore) { bestScore = s; best = legalMoves[i]; }
    }
    return best;
  }

  function processCommand(cmd) {
    cmd = cmd.trim();
    if (cmd === 'uci') {
      post('id name ChessQuestEngine 1.0');
      post('id author ChessQuest');
      post('option name Skill Level type spin default 5 min 0 max 20');
      post('uciok');
    } else if (cmd === 'isready') {
      post('readyok');
    } else if (cmd === 'ucinewgame') {
      legalMoves = [];
    } else if (cmd.startsWith('setoption name Skill Level value ')) {
      skillLevel = Math.max(0, Math.min(20, parseInt(cmd.split(' ').pop(), 10) || 5));
    } else if (cmd.startsWith('position fen ')) {
      // Custom format: "position fen <FEN> legal <m1> <m2> ..."
      var legalIdx = cmd.indexOf(' legal ');
      var fenPart = legalIdx >= 0 ? cmd.substring('position fen '.length, legalIdx) : cmd.substring('position fen '.length);
      boardRows = fenPart.split(' ')[0].split('/');
      if (legalIdx >= 0) {
        legalMoves = cmd.substring(legalIdx + ' legal '.length).split(' ').filter(Boolean);
      } else {
        legalMoves = [];
      }
    } else if (cmd.startsWith('go')) {
      // Simulate brief "thinking" time, then respond
      setTimeout(function () {
        post('bestmove ' + pickBestMove());
      }, 50);
    }
  }

  function post(line) {
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(line);
    }
  }

  // Receive messages from React Native
  document.addEventListener('message', function (e) { processCommand(e.data); });
  window.addEventListener('message', function (e) { processCommand(e.data); });
})();
<\/script>
</body>
</html>`;

// ─── Component ────────────────────────────────────────────────────────────────

export type BridgeMessageHandler = (line: string) => void;

export interface StockfishBridgeRef {
  send: (cmd: string) => void;
}

interface Props {
  onMessage: BridgeMessageHandler;
  onReady: () => void;
  onCrash?: (error: string) => void;
}

export const StockfishBridgeView = forwardRef<StockfishBridgeRef, Props>(
  function StockfishBridgeView({ onMessage, onReady, onCrash }, ref) {
    const webViewRef = useRef<WebViewType>(null);
    const readyRef = useRef(false);

    const send = useCallback((cmd: string) => {
      try {
        webViewRef.current?.injectJavaScript(
          `(function(){ try{ processCommand(${JSON.stringify(cmd)}); } catch(e){} })(); true;`,
        );
      } catch (error) {
        console.error('StockfishBridgeView: injectJavaScript failed:', error);
        onCrash?.(`injectJavaScript failed: ${String(error)}`);
      }
    }, [onCrash]);

    useImperativeHandle(ref, () => ({ send }), [send]);

    const handleMessage = useCallback(
      (event: { nativeEvent: { data: string } }) => {
        const line = event.nativeEvent.data;

        if (!readyRef.current) {
          if (line === 'readyok') {
            readyRef.current = true;
            onReady();
          }
        }
        onMessage(line);
      },
      [onMessage, onReady],
    );

    const handleLoad = useCallback(() => {
      try {
        send('uci');
        send('isready');
      } catch (error) {
        console.error('StockfishBridgeView: initialization failed:', error);
        onCrash?.(`Initialization failed: ${String(error)}`);
      }
    }, [send, onCrash]);

    const handleError = useCallback((e: WebViewErrorEvent) => {
      console.error('WebView error:', e.nativeEvent);
      onCrash?.(`WebView error: ${e.nativeEvent.description}`);
    }, [onCrash]);

    const handleHttpError = useCallback((e: WebViewHttpErrorEvent) => {
      console.error('WebView HTTP error:', e.nativeEvent);
      onCrash?.(`WebView HTTP error: ${e.nativeEvent.statusCode}`);
    }, [onCrash]);

    return (
      <View style={styles.hidden}>
        <WebView
          ref={webViewRef}
          source={{ html: ENGINE_HTML }}
          onMessage={handleMessage}
          onLoad={handleLoad}
          onError={handleError}
          onHttpError={handleHttpError}
          javaScriptEnabled={true}
          originWhitelist={['*']}
        />
      </View>
    );
  },
);

const styles = StyleSheet.create({
  // Zero-size hidden view — present in tree but invisible
  // pointerEvents in style (not as prop) is required for Fabric / new architecture
  hidden: { width: 0, height: 0, overflow: 'hidden', pointerEvents: 'none' },
});
