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
import { Play, Pause, RotateCcw, Gamepad2 } from "lucide-react";
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
    const bricks: Brick[] = [];
    const startX = (CANVAS_WIDTH - (BRICK_COLS * (BRICK_WIDTH + BRICK_PADDING) - BRICK_PADDING)) / 2;
    
    for (let row = 0; row < BRICK_ROWS; row++) {
      for (let col = 0; col < BRICK_COLS; col++) {
        bricks.push({
          x: startX + col * (BRICK_WIDTH + BRICK_PADDING),
          y: 80 + row * (BRICK_HEIGHT + BRICK_PADDING),
          width: BRICK_WIDTH,
          height: BRICK_HEIGHT,
          color: BRICK_COLORS[row],
          visible: true,
          points: (BRICK_ROWS - row) * 10,
        });
      }
    }
    return bricks;
  }, []);

  const createParticles = useCallback((x: number, y: number, color: string): Particle[] => {
    const particles: Particle[] = [];
    for (let i = 0; i < 8; i++) {
      particles.push({
        x,
        y,
        dx: (Math.random() - 0.5) * 8,
        dy: (Math.random() - 0.5) * 8,
        life: 30,
        maxLife: 30,
        color,
      });
    }
    return particles;
  }, []);

  const resetGame = useCallback(() => {
    setGameState(prevState => ({
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
      bricks: initializeBricks(),
      score: 0,
      lives: 3,
      gameStatus: 'START',
      highScore: prevState.highScore,
      particles: [],
    }));
  }, [initializeBricks]);

  const launchBall = useCallback(() => {
    setGameState(prevState => {
      if (prevState.gameStatus === 'START' || !prevState.ball.launched) {
        return {
          ...prevState,
          ball: {
            ...prevState.ball,
            dx: BALL_SPEED * (Math.random() > 0.5 ? 1 : -1) * 0.7,
            dy: -BALL_SPEED,
            launched: true,
          },
          gameStatus: 'PLAYING',
        };
      }
      return prevState;
    });
  }, []);

  const detectCollision = useCallback((ball: any, brick: Brick) => {
    return (
      ball.x + ball.radius > brick.x &&
      ball.x - ball.radius < brick.x + brick.width &&
      ball.y + ball.radius > brick.y &&
      ball.y - ball.radius < brick.y + brick.height
    );
  }, []);

  const updateGame = useCallback(() => {
    setGameState(prevState => {
      if (prevState.gameStatus !== 'PLAYING') {
        return prevState;
      }

      const newState = { ...prevState };
      const { ball, paddle, bricks, particles } = newState;

      // Update particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const particle = particles[i];
        particle.x += particle.dx;
        particle.y += particle.dy;
        particle.life--;
        particle.dx *= 0.98;
        particle.dy *= 0.98;
        
        if (particle.life <= 0) {
          particles.splice(i, 1);
        }
      }

      // Move ball only if launched
      if (ball.launched) {
        ball.x += ball.dx;
        ball.y += ball.dy;

        // Ball collision with walls
        if (ball.x + ball.radius >= CANVAS_WIDTH || ball.x - ball.radius <= 0) {
          ball.dx = -ball.dx;
        }
        if (ball.y - ball.radius <= 0) {
          ball.dy = -ball.dy;
        }

        // Ball collision with paddle
        if (
          ball.y + ball.radius >= paddle.y &&
          ball.x >= paddle.x &&
          ball.x <= paddle.x + paddle.width &&
          ball.dy > 0
        ) {
          ball.dy = -Math.abs(ball.dy);
          // Add spin based on where ball hits paddle
          const hitPos = (ball.x - paddle.x) / paddle.width;
          ball.dx = BALL_SPEED * (hitPos - 0.5) * 2;
        }

        // Ball collision with bricks
        for (let i = 0; i < bricks.length; i++) {
          const brick = bricks[i];
          if (brick.visible && detectCollision(ball, brick)) {
            brick.visible = false;
            ball.dy = -ball.dy;
            newState.score += brick.points;
            
            // Create particles
            newState.particles.push(
              ...createParticles(
                brick.x + brick.width / 2,
                brick.y + brick.height / 2,
                brick.color
              )
            );
            break;
          }
        }

        // Check if ball is below paddle (lost life)
        if (ball.y > CANVAS_HEIGHT) {
          newState.lives--;
          if (newState.lives <= 0) {
            newState.gameStatus = 'GAME_OVER';
            // Update high score
            if (newState.score > newState.highScore) {
              newState.highScore = newState.score;
              try {
                localStorage.setItem('brickBreaker_highScore', newState.score.toString());
              } catch {}
            }
          } else {
            // Reset ball position
            ball.x = CANVAS_WIDTH / 2;
            ball.y = CANVAS_HEIGHT - 120;
            ball.dx = 0;
            ball.dy = 0;
            ball.launched = false;
          }
        }
      } else {
        // Ball follows paddle when not launched
        ball.x = paddle.x + paddle.width / 2;
      }

      // Check win condition
      const visibleBricks = bricks.filter(brick => brick.visible);
      if (visibleBricks.length === 0) {
        newState.gameStatus = 'WIN';
        // Update high score
        if (newState.score > newState.highScore) {
          newState.highScore = newState.score;
          try {
            localStorage.setItem('brickBreaker_highScore', newState.score.toString());
          } catch {}
        }
      }

      return newState;
    });
  }, [detectCollision, createParticles]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas with gradient background
    const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    gradient.addColorStop(0, 'hsl(235, 39%, 4%)');
    gradient.addColorStop(1, 'hsl(235, 39%, 8%)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    const { ball, paddle, bricks, particles } = gameState;

    // Draw particles
    particles.forEach(particle => {
      const alpha = particle.life / particle.maxLife;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = particle.color;
      ctx.fillRect(particle.x - 2, particle.y - 2, 4, 4);
    });
    ctx.globalAlpha = 1;

    // Draw bricks with glow effect
    bricks.forEach(brick => {
      if (brick.visible) {
        ctx.fillStyle = brick.color;
        ctx.shadowColor = brick.color;
        ctx.shadowBlur = 15;
        ctx.fillRect(brick.x, brick.y, brick.width, brick.height);
        
        // Inner highlight
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fillRect(brick.x + 2, brick.y + 2, brick.width - 4, 4);
      }
    });
    ctx.shadowBlur = 0;

    // Draw paddle with glow
    ctx.fillStyle = 'hsl(195, 100%, 50%)';
    ctx.shadowColor = 'hsl(195, 100%, 50%)';
    ctx.shadowBlur = 15;
    ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);
    ctx.shadowBlur = 0;

    // Draw ball with glow
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 15;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Draw launch indicator
    if (!ball.launched && gameState.gameStatus === 'START') {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(ball.x, ball.y);
      ctx.lineTo(ball.x, ball.y - 50);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw UI elements inside canvas
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px Arial';
    
    // Score in bottom left
    ctx.fillText(`Score: ${gameState.score}`, 20, CANVAS_HEIGHT - 60);
    
    // High Score in bottom left (below score)
    ctx.font = 'bold 18px Arial';
    ctx.fillText(`High Score: ${gameState.highScore}`, 20, CANVAS_HEIGHT - 30);
    
    // Lives as hearts in bottom right
    const heartSize = 16;
    const heartSpacing = 25;
    const startX = CANVAS_WIDTH - (gameState.lives * heartSpacing) - 20;
    
    ctx.fillStyle = '#ff4757';
    for (let i = 0; i < gameState.lives; i++) {
      const x = startX + (i * heartSpacing);
      const y = CANVAS_HEIGHT - 40;
      
      // Draw proper heart shape using bezier curves
      ctx.beginPath();
      ctx.moveTo(x, y + heartSize/4);
      
      // Left curve
      ctx.bezierCurveTo(x, y, x - heartSize/2, y, x - heartSize/2, y + heartSize/4);
      ctx.bezierCurveTo(x - heartSize/2, y + heartSize/2, x, y + heartSize/2, x, y + heartSize);
      
      // Right curve  
      ctx.bezierCurveTo(x, y + heartSize/2, x + heartSize/2, y + heartSize/2, x + heartSize/2, y + heartSize/4);
      ctx.bezierCurveTo(x + heartSize/2, y, x, y, x, y + heartSize/4);
      
      ctx.fill();
    }
  }, [gameState]);

  const gameLoop = useCallback(() => {
    updateGame();
    draw();
    if (gameState.gameStatus === 'PLAYING') {
      animationRef.current = requestAnimationFrame(gameLoop);
    }
  }, [updateGame, draw, gameState.gameStatus]);

  // Handle mouse movement
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (gameState.gameStatus === 'GAME_OVER' || gameState.gameStatus === 'WIN') return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const x = (e.clientX - rect.left) * scaleX;

    setGameState(prevState => ({
      ...prevState,
      paddle: {
        ...prevState.paddle,
        x: Math.max(0, Math.min(x - PADDLE_WIDTH / 2, CANVAS_WIDTH - PADDLE_WIDTH)),
      },
    }));
  }, [gameState.gameStatus]);

  // Handle touch movement for mobile
  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (gameState.gameStatus === 'GAME_OVER' || gameState.gameStatus === 'WIN') return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const x = (e.touches[0].clientX - rect.left) * scaleX;

    setGameState(prevState => ({
      ...prevState,
      paddle: {
        ...prevState.paddle,
        x: Math.max(0, Math.min(x - PADDLE_WIDTH / 2, CANVAS_WIDTH - PADDLE_WIDTH)),
      },
    }));
  }, [gameState.gameStatus]);

  const toggleGame = () => {
    setGameState(prevState => {
      if (prevState.gameStatus === 'PLAYING') {
        return { ...prevState, gameStatus: 'PAUSED' };
      } else if (prevState.gameStatus === 'PAUSED') {
        return { ...prevState, gameStatus: 'PLAYING' };
      }
      return prevState;
    });
  };

  const startGame = () => {
    if (gameState.gameStatus === 'START') {
      launchBall();
    } else {
      toggleGame();
    }
  };

  // Keyboard event handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current[e.key] = true;
      
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        if (gameState.gameStatus === 'START' || !gameState.ball.launched) {
          launchBall();
        }
      }
      
      if (e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        toggleGame();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.key] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState.gameStatus, gameState.ball.launched, launchBall]);

  // Handle paddle movement with keyboard
  useEffect(() => {
    const movePaddle = () => {
      if (gameState.gameStatus === 'GAME_OVER' || gameState.gameStatus === 'WIN') return;
      
      setGameState(prevState => {
        let newX = prevState.paddle.x;
        
        if (keysRef.current['ArrowLeft'] || keysRef.current['a'] || keysRef.current['A']) {
          newX -= 8;
        }
        if (keysRef.current['ArrowRight'] || keysRef.current['d'] || keysRef.current['D']) {
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
      setGameState(prevState => ({
        ...prevState,
        bricks: initializeBricks(),
      }));
    }
  }, [gameState.bricks.length, initializeBricks]);

  // Game loop effect
  useEffect(() => {
    if (gameState.gameStatus === 'PLAYING') {
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
