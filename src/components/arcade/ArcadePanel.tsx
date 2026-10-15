import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { GameEngine, MiniGame, SwitchReflexGame, ChordDefusalGame, MatrixSnakeGame } from '../../engine/arcade';
import { VirtualKeyboard } from '../VirtualKeyboard';
import { AnimationEngine } from '../../engine/animator';
import { KeyFrameColor } from '../../types/keyboard';
import { hardwareService } from '../../services/hardware';
import { Gamepad2, Trophy, Zap, Bomb, Play, Square, RotateCcw } from 'lucide-react';

type GameId = 'switch_reflex' | 'chord_defusal' | 'matrix_snake';

interface GameMeta {
  id: GameId;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  factory: () => MiniGame;
}

const GAME_CATALOG: GameMeta[] = [
  {
    id: 'switch_reflex',
    name: 'Switch Reflex',
    description: 'Hit the glowing key before time runs out! Speed increases over time.',
    icon: <Zap size={20} />,
    color: '#00FF78',
    factory: () => new SwitchReflexGame(),
  },
  {
    id: 'chord_defusal',
    name: 'Chord Defusal',
    description: 'Press all glowing keys simultaneously to defuse the bomb!',
    icon: <Bomb size={20} />,
    color: '#FF4466',
    factory: () => new ChordDefusalGame(),
  },
  {
    id: 'matrix_snake',
    name: 'Matrix Snake',
    description: 'Classic snake on your keyboard. Use WASD to steer!',
    icon: <span style={{ fontSize: 18 }}>🐍</span>,
    color: '#22DD88',
    factory: () => new MatrixSnakeGame(),
  },
];

interface ArcadePanelProps {
  engine: AnimationEngine | null;
}

export const ArcadePanel: React.FC<ArcadePanelProps> = ({ engine }) => {
  const [selectedGame, setSelectedGame] = useState<GameId | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [score, setScore] = useState(0);
  const [gameState, setGameState] = useState<Record<string, unknown>>({});
  const [arcadeFrame, setArcadeFrame] = useState<KeyFrameColor>({});
  const [highScores, setHighScores] = useState<Record<GameId, number>>({
    switch_reflex: 0,
    chord_defusal: 0,
    matrix_snake: 0,
  });

  const gameEngineRef = useRef<GameEngine | null>(null);
  const frameUnsubRef = useRef<(() => void) | null>(null);
  const statePollerRef = useRef<number | null>(null);

  // Load high scores from localStorage
  useEffect(() => {
    try {
      setHighScores({
        switch_reflex: parseInt(localStorage.getItem('vargb_arcade_switch_reflex') || '0', 10),
        chord_defusal: parseInt(localStorage.getItem('vargb_arcade_chord_defusal') || '0', 10),
        matrix_snake: parseInt(localStorage.getItem('vargb_arcade_matrix_snake') || '0', 10),
      });
    } catch {}
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopGame();
    };
  }, []);

  const stopGame = useCallback(() => {
    if (statePollerRef.current !== null) {
      clearInterval(statePollerRef.current);
      statePollerRef.current = null;
    }
    if (frameUnsubRef.current) {
      frameUnsubRef.current();
      frameUnsubRef.current = null;
    }
    if (gameEngineRef.current) {
      gameEngineRef.current.stop();
      gameEngineRef.current = null;
    }
    setIsPlaying(false);
    setArcadeFrame({});

    // Resume the main lighting engine if it was paused
    if (engine) {
      engine.resume();
    }
  }, [engine]);

  const startGame = useCallback((gameId: GameId) => {
    stopGame();

    const meta = GAME_CATALOG.find(g => g.id === gameId);
    if (!meta) return;

    // Pause the main lighting engine so arcade takes over the keyboard
    if (engine) {
      engine.pause();
    }

    const gameEngine = new GameEngine();
    gameEngineRef.current = gameEngine;

    // Subscribe to frame updates and stream to both UI and physical keyboard hardware
    frameUnsubRef.current = gameEngine.onFrame((frame) => {
      setArcadeFrame({ ...frame });
      hardwareService.pushFrame(frame);
    });

    const game = meta.factory();
    gameEngine.start(game);
    setIsPlaying(true);
    setSelectedGame(gameId);
    setScore(0);
    setGameState({});

    // Poll game state for UI display
    statePollerRef.current = window.setInterval(() => {
      if (gameEngine) {
        const currentGame = (gameEngine as any).activeGame as MiniGame | null;
        if (currentGame) {
          setScore(currentGame.getScore());
          setGameState(currentGame.getState());

          // Refresh high scores
          try {
            setHighScores({
              switch_reflex: parseInt(localStorage.getItem('vargb_arcade_switch_reflex') || '0', 10),
              chord_defusal: parseInt(localStorage.getItem('vargb_arcade_chord_defusal') || '0', 10),
              matrix_snake: parseInt(localStorage.getItem('vargb_arcade_matrix_snake') || '0', 10),
            });
          } catch {}
        }
      }
    }, 100);
  }, [engine, stopGame]);

  const restartGame = useCallback(() => {
    if (selectedGame) {
      startGame(selectedGame);
    }
  }, [selectedGame, startGame]);

  const currentMeta = useMemo(() =>
    GAME_CATALOG.find(g => g.id === selectedGame),
    [selectedGame]
  );

  const isGameOver = gameState.isGameOver === true;

  return (
    <div className="modern-lighting-workspace arcade-workspace">
      {/* Preview Section with Keyboard */}
      <div className="workspace-preview-section">
        <div className="preview-section-label">
          <Gamepad2 size={14} style={{ marginRight: 6 }} />
          {isPlaying && currentMeta
            ? `${currentMeta.name} — Score: ${score}`
            : 'ARCADE MODE'}
        </div>
        <div className="preview-keyboard-wrapper">
          <VirtualKeyboard
            engine={isPlaying ? null : engine}
            effectType={isPlaying ? (selectedGame || 'arcade') : 'arcade'}
            currentFrame={isPlaying ? arcadeFrame : undefined}
            isPixelArtMode={false}
            selectedKeyIds={new Set()}
            onKeyClick={() => {}}
            hideHeader={true}
          />
        </div>
      </div>

      {/* Controls Section */}
      <div className="workspace-controls-section arcade-controls">
        {/* Game status bar */}
        {isPlaying && currentMeta && (
          <div className="arcade-status-bar" style={{ borderColor: currentMeta.color + '40' }}>
            <div className="arcade-status-left">
              <span className="arcade-status-icon" style={{ color: currentMeta.color }}>
                {currentMeta.icon}
              </span>
              <div className="arcade-status-info">
                <span className="arcade-status-game">{currentMeta.name}</span>
                <span className="arcade-status-detail">
                  {gameState.isGameOver
                    ? 'GAME OVER'
                    : selectedGame === 'switch_reflex'
                      ? `Level ${gameState.level || 1} • Streak: ${gameState.streak || 0} • Lives: ${gameState.lives || 0}`
                      : selectedGame === 'chord_defusal'
                        ? `Round ${gameState.round || 1} • Chord: ${gameState.pressedCount || 0}/${gameState.targetCount || 0} • Lives: ${gameState.lives || 0}`
                        : `Length: ${gameState.length || 0} • Speed: ${gameState.speed || '4.0'}`
                  }
                </span>
              </div>
            </div>
            <div className="arcade-status-right">
              <div className="arcade-score-display">
                <span className="arcade-score-label">SCORE</span>
                <span className="arcade-score-value" style={{ color: currentMeta.color }}>{score}</span>
              </div>
              <div className="arcade-btn-group">
                <button className="arcade-action-btn" onClick={restartGame} title="Restart">
                  <RotateCcw size={14} />
                </button>
                <button className="arcade-action-btn stop" onClick={stopGame} title="Stop">
                  <Square size={14} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Game Over overlay */}
        {isPlaying && isGameOver && (
          <div className="arcade-game-over">
            <div className="arcade-game-over-content">
              <h3>GAME OVER</h3>
              <p className="arcade-final-score">Score: <strong>{score}</strong></p>
              {selectedGame && highScores[selectedGame] > 0 && (
                <p className="arcade-best-score">
                  <Trophy size={14} /> Best: {highScores[selectedGame]}
                </p>
              )}
              <div className="arcade-game-over-actions">
                <button className="arcade-play-btn" onClick={restartGame}>
                  <RotateCcw size={14} /> Play Again
                </button>
                <button className="arcade-back-btn" onClick={stopGame}>
                  Back to Menu
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Game Catalog */}
        <div className="arcade-catalog">
          <div className="arcade-catalog-header">
            <h3>Minigames</h3>
            <span className="arcade-catalog-count">{GAME_CATALOG.length} games</span>
          </div>

          <div className="arcade-game-grid">
            {GAME_CATALOG.map((game) => {
              const isActive = selectedGame === game.id && isPlaying;
              const bestScore = highScores[game.id];

              return (
                <div
                  key={game.id}
                  className={`arcade-game-card ${isActive ? 'active' : ''}`}
                  style={{ '--game-color': game.color } as React.CSSProperties}
                >
                  <div className="arcade-game-card-icon" style={{ color: game.color }}>
                    {game.icon}
                  </div>
                  <div className="arcade-game-card-info">
                    <h4>{game.name}</h4>
                    <p>{game.description}</p>
                    {bestScore > 0 && (
                      <div className="arcade-game-best">
                        <Trophy size={11} /> {bestScore}
                      </div>
                    )}
                  </div>
                  <button
                    className="arcade-game-play-btn"
                    onClick={() => startGame(game.id)}
                    style={{ background: game.color + '20', borderColor: game.color + '50' }}
                  >
                    <Play size={14} />
                    {isActive ? 'Restart' : 'Play'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* High Scores */}
        <div className="arcade-high-scores">
          <div className="arcade-high-scores-header">
            <Trophy size={14} />
            <h3>High Scores</h3>
          </div>
          <div className="arcade-scores-list">
            {GAME_CATALOG.map((game) => (
              <div key={game.id} className="arcade-score-row">
                <span className="arcade-score-icon" style={{ color: game.color }}>
                  {game.icon}
                </span>
                <span className="arcade-score-name">{game.name}</span>
                <span className="arcade-score-val">{highScores[game.id] || '—'}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
