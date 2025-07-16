import React, { useEffect, useRef, useState, useCallback } from "react";
import type { GameState, Particle, Brick, CollisionType } from "../types/game";
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  PADDLE_WIDTH,
  PADDLE_HEIGHT,
  BALL_RADIUS,
  BRICK_ROWS,
  BRICK_COLS,
  BRICK_WIDTH,
  BRICK_HEIGHT,
  BRICK_PADDING,
  BALL_SPEED,
  BRICK_COLORS,
} from "../constants";
import { Play, Pause, RotateCcw } from "lucide-react";
import {
  collision,
  drawCanvas,
  frameUpdate,
  initBricks,
  mouseMovementHandler,
  particle,
  resetGameState,
  touchMovementHandler,
} from "../lib/utils";
import "../index.css";
import Instructions from "./Instructions";
// Ensure Tailwind CSS is imported

const BrickBreaker: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(
    null
  ) as React.RefObject<HTMLCanvasElement>;
  const animationRef = useRef<number | null>(null);
  const keysRef = useRef<{ [key: string]: boolean }>({});

  // Load high score from localStorage
  const getHighScore = () => {
    try {
      return parseInt(localStorage.getItem("brickBreaker_highScore") || "0");
    } catch {
      return 0;
    }
  };

  const [gameState, setGameState] = useState<GameState>(() => ({
    ball: {
      x: CANVAS_WIDTH / 2,
      y: CANVAS_HEIGHT - 120,
      dx: 0,
      dy: 0,
      radius: BALL_RADIUS,
      launched: false,
    },
    paddle: {
      x: CANVAS_WIDTH / 2 - PADDLE_WIDTH / 2,
      y: CANVAS_HEIGHT - 100,
      width: PADDLE_WIDTH,
      height: PADDLE_HEIGHT,
    },
    bricks: [],
    score: 0,
    lives: 3,
    gameStatus: "START",
    highScore: getHighScore(),
    particles: [],
  }));

  // Initialize bricks when component mounts

  const initializeBricks = useCallback((): Brick[] => {
    return initBricks({
      CANVAS_WIDTH,
      BRICK_COLS,
      BRICK_ROWS,
      BRICK_WIDTH,
      BRICK_HEIGHT,
      BRICK_PADDING,
      BRICK_COLORS,
    });
  }, []);

  // Create particles for brick destruction
  const createParticles = useCallback(
    (x: number, y: number, color: string): Particle[] => {
      return particle(x, y, color);
    },
    []
  );
  const launchBall = useCallback(() => {
    setGameState((prevState) => {
      if (prevState.gameStatus === "START" || !prevState.ball.launched) {
        return {
          ...prevState,
          ball: {
            ...prevState.ball,
            dx: BALL_SPEED * (Math.random() > 0.5 ? 1 : -1) * 0.7,
            dy: -BALL_SPEED,
            launched: true,
          },
          gameStatus: "PLAYING",
        };
      }
      return prevState;
    });
  }, []);

  // Detect collision between ball and brick
  const detectCollision = useCallback((ball: CollisionType, brick: Brick) => {
    return collision(ball, brick);
  }, []);

  //  Update game state on each animation frame
  const updateGame = useCallback(() => {
    setGameState((prevState) => {
      const newState = { ...prevState };
      return frameUpdate(
        newState,
        CANVAS_WIDTH,
        CANVAS_HEIGHT,
        BALL_RADIUS,
        detectCollision,
        createParticles
      );
    });
  }, [detectCollision, createParticles]);

  // Draw the canvas
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    drawCanvas(canvas, gameState, CANVAS_WIDTH, CANVAS_HEIGHT);
  }, [gameState]);

  // Game loop to update and draw the game
  const gameLoop = useCallback(() => {
    updateGame();
    draw();
    if (gameState.gameStatus === "PLAYING") {
      animationRef.current = requestAnimationFrame(gameLoop);
    }
  }, [updateGame, draw, gameState.gameStatus]);

  // Mouse Movement
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      mouseMovementHandler(
        gameState.gameStatus,
        setGameState,
        canvasRef,
        CANVAS_WIDTH,
        PADDLE_WIDTH,
        e
      );
    },
    [gameState.gameStatus]
  );

  // handle touch movement for mobile
  const handleTouchMove = useCallback(
    (e: React.TouchEvent<HTMLCanvasElement>) => {
      touchMovementHandler(
        gameState.gameStatus,
        setGameState,
        canvasRef,
        CANVAS_WIDTH,
        PADDLE_WIDTH,
        e
      );
    },
    [gameState.gameStatus]
  );

  // Toggle game status between playing and paused
  const toggleGame = () => {
    setGameState((prevState) => {
      if (prevState.gameStatus === "PLAYING") {
        return { ...prevState, gameStatus: "PAUSED" };
      } else if (prevState.gameStatus === "PAUSED") {
        return { ...prevState, gameStatus: "PLAYING" };
      }
      return prevState;
    });
  };

  // statrt the game
  const startGame = () => {
    if (gameState.gameStatus === "START") {
      launchBall();
    } else {
      toggleGame();
    }
  };
  // Keyboard event handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current[e.key] = true;

      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        if (gameState.gameStatus === "START" || !gameState.ball.launched) {
          launchBall();
        }
      }

      if (e.key === "p" || e.key === "P") {
        e.preventDefault();
        toggleGame();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.key] = false;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [gameState.gameStatus, gameState.ball.launched, launchBall]);

  // Handle paddle movement with keyboard
  useEffect(() => {
    const movePaddle = () => {
      if (
        gameState.gameStatus === "GAME_OVER" ||
        gameState.gameStatus === "WIN"
      )
        return;

      setGameState((prevState) => {
        let newX = prevState.paddle.x;

        if (
          keysRef.current["ArrowLeft"] ||
          keysRef.current["a"] ||
          keysRef.current["A"]
        ) {
          newX -= 8;
        }
        if (
          keysRef.current["ArrowRight"] ||
          keysRef.current["d"] ||
          keysRef.current["D"]
        ) {
          newX += 8;
        }

        newX = Math.max(0, Math.min(newX, CANVAS_WIDTH - PADDLE_WIDTH));

        return {
          ...prevState,
          paddle: {
            ...prevState.paddle,
            x: newX,
          },
        };
      });
    };

    const interval = setInterval(movePaddle, 16); // ~60fps
    return () => clearInterval(interval);
  }, [gameState.gameStatus]);

  // Initialize bricks on mount
  useEffect(() => {
    if (gameState.bricks.length === 0) {
      setGameState((prevState) => ({
        ...prevState,
        bricks: initializeBricks(),
      }));
    }
  }, [gameState.bricks.length, initializeBricks]);

  // Game loop effect
  useEffect(() => {
    if (gameState.gameStatus === "PLAYING") {
      animationRef.current = requestAnimationFrame(gameLoop);
    } else {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [gameState.gameStatus, gameLoop]);

  // Draw effect
  useEffect(() => {
    draw();
  }, [draw]);

  const getStatusMessage = () => {
    switch (gameState.gameStatus) {
      case "START":
        return "Press SPACE or click START to launch the ball!";
      case "PAUSED":
        return "Game Paused - Press SPACE to continue";
      case "WIN":
        return "🎉 CONGRATULATIONS! You cleared all bricks! 🎉";
      case "GAME_OVER":
        return "💥 GAME OVER - Try again!";
      default:
        return "Use mouse/arrows to move paddle, SPACE to launch ball";
    }
  };
  const resetGame = useCallback(() => {
    resetGameState(
      setGameState,
      CANVAS_WIDTH,
      CANVAS_HEIGHT,
      BALL_RADIUS,
      PADDLE_WIDTH,
      PADDLE_HEIGHT,
      initializeBricks
    );
  }, [initializeBricks]);

  return (
    <div className="flex flex-col items-center gap-6 p-4 min-h-screen bg-background">
      {/* Game Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold text-primary mb-2 animate-pulse-neon">
          BRICK BREAKER
        </h1>
      </div>

      {/* Game Canvas */}
      <div className="p-4 bg-card border border-primary rounded-lg shadow-sm">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          onMouseMove={handleMouseMove}
          onTouchMove={handleTouchMove}
          className="border-2 border-primary rounded-lg shadow-2xl cursor-none max-w-full h-auto"
          style={{ aspectRatio: `${CANVAS_WIDTH}/${CANVAS_HEIGHT}` }}
        />
      </div>

      {/* Game Status */}
      <div className="text-center">
        <p className="text-lg text-muted-foreground mb-4">
          {getStatusMessage()}
        </p>
      </div>

      {/* Game Controls */}
      <div className="flex gap-4 flex-wrap justify-center">
        <button
          className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 bg-primary text-primary-foreground hover:bg-primary/90 h-11 rounded-md px-8"
          onClick={startGame}
          disabled={
            gameState.gameStatus === "GAME_OVER" ||
            gameState.gameStatus === "WIN"
          }
        >
          {gameState.gameStatus === "START" ? (
            <>
              <Play className="mr-2 h-4 w-4" />
              Start Game
            </>
          ) : gameState.gameStatus === "PLAYING" ? (
            <>
              <Pause className="mr-2 h-4 w-4" />
              Pause
            </>
          ) : (
            <>
              <Play className="mr-2 h-4 w-4" />
              Resume
            </>
          )}
        </button>

        <button
          className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 bg-secondary text-primary-foreground hover:bg-secondary/90 h-11 rounded-md px-8"
          onClick={resetGame}
        >
          <RotateCcw className="mr-2 h-4 w-4" />
          New Game
        </button>
      </div>

      {/* Instructions */}
      <Instructions />
    </div>
  );
};

export default BrickBreaker;
