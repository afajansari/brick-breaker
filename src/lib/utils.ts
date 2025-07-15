import { clsx, type ClassValue } from "clsx";

import { twMerge } from "tailwind-merge";
import type { Brick, Particle, GameState, CollisionType, GameStatus } from "../types/game";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function initBricks({ ...args }): Brick[] {
    const { CANVAS_WIDTH, BRICK_COLS, BRICK_ROWS, BRICK_WIDTH, BRICK_HEIGHT, BRICK_PADDING, BRICK_COLORS } = args;
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
}


export function particle(x: number, y: number, color: string): Particle[] {
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
        })
    }
    return particles;
}

export function collision(ball: CollisionType, brick: Brick): boolean {
    return (
        ball.x + ball.radius > brick.x &&
        ball.x - ball.radius < brick.x + brick.width &&
        ball.y + ball.radius > brick.y &&
        ball.y - ball.radius < brick.y + brick.height
    );
}


export function frameUpdate(state: GameState, CANVAS_WIDTH: number, CANVAS_HEIGHT: number, BALL_SPEED: number, collision: (ball: CollisionType, brick: Brick) => boolean, particle: (x: number, y: number, color: string) => Particle[]): GameState {
    if (state.gameStatus !== "PLAYING") {
        return state;
    }
    const { ball, paddle, bricks, particles } = state;

    // Update particles immutably
    const newParticles = particles
        .map(p => ({ ...p, x: p.x + p.dx, y: p.y + p.dy, life: p.life - 1, dx: p.dx * 0.98, dy: p.dy * 0.98 }))
        .filter(p => p.life > 0);

    let newBall = { ...ball };
    let newPaddle = { ...paddle };
    let newBricks = bricks.map(b => ({ ...b }));
    let newScore = state.score;
    let newLives = state.lives;
    let newGameStatus: GameStatus = state.gameStatus;
    let newHighScore = state.highScore;

    // Move ball only if launched
    if (newBall.launched) {
        newBall.x += newBall.dx;
        newBall.y += newBall.dy;

        // Ball collision with walls
        if (newBall.x + newBall.radius >= CANVAS_WIDTH || newBall.x - newBall.radius <= 0) {
            newBall.dx = -newBall.dx;
        }
        if (newBall.y - newBall.radius <= 0) {
            newBall.dy = -newBall.dy;
        }

        // Ball collision with paddle
        if (
            newBall.y + newBall.radius >= newPaddle.y &&
            newBall.x >= newPaddle.x &&
            newBall.x <= newPaddle.x + newPaddle.width &&
            newBall.dy > 0
        ) {
            newBall.dy = -Math.abs(newBall.dy);
            // Add spin based on where ball hits paddle
            const hitPos = (newBall.x - newPaddle.x) / newPaddle.width;
            newBall.dx = BALL_SPEED * (hitPos - 0.5) * 2;
        }

        // Ball collision with bricks
        for (let i = 0; i < newBricks.length; i++) {
            const brick = newBricks[i];
            if (brick.visible && collision(newBall, brick)) {
                brick.visible = false;
                newBall.dy = -newBall.dy;
                newScore += brick.points;

                // Create particles
                newParticles.push(
                    ...particle(
                        brick.x + brick.width / 2,
                        brick.y + brick.height / 2,
                        brick.color
                    )
                );
                break;
            }
        }

        // Check if ball is below paddle (lost life)
        if (newBall.y > paddle.y + newBall.radius * 2) {
            console.log("Ball lost, lives remaining:", newLives - 1);
            console.log(newBall.y > CANVAS_HEIGHT - (20 + newBall.radius + paddle.height/2 + paddle.y/2), "Ball Y:", newBall.y, "Canvas Height:", CANVAS_HEIGHT,  paddle.y) ;
            newLives--;
            if (newLives <= 0) {
                newGameStatus = 'GAME_OVER';
                // Update high score
                if (newScore > newHighScore) {
                    newHighScore = newScore;
                    try {
                        localStorage.setItem('brickBreaker_highScore', newScore.toString());
                    } catch { }
                }
            } else {
                // Reset ball position
                newBall = {
                    ...newBall,
                    x: CANVAS_WIDTH / 2,
                    y: CANVAS_HEIGHT - 120,
                    dx: 0,
                    dy: 0,
                    launched: false,
                };
            }
        }
    } else {
        // Ball follows paddle when not launched
        newBall.x = newPaddle.x + newPaddle.width / 2;
    }

    // Check win condition
    const visibleBricks = newBricks.filter(brick => brick.visible);
    if (visibleBricks.length === 0) {
        newGameStatus = 'WIN';
        // Update high score
        if (newScore > newHighScore) {
            newHighScore = newScore;
            try {
                localStorage.setItem('brickBreaker_highScore', newScore.toString());
            } catch { }
        }
    }

    return {
        ...state,
        ball: newBall,
        paddle: newPaddle,
        bricks: newBricks,
        particles: newParticles,
        score: newScore,
        lives: newLives,
        gameStatus: newGameStatus,
        highScore: newHighScore,
    };
}


export function drawCanvas(canvas: HTMLCanvasElement | null, state: GameState, CANVAS_WIDTH: number, CANVAS_HEIGHT: number): void {

    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Ensure CANVAS_HEIGHT is a finite number
    const safeCanvasHeight = Number.isFinite(CANVAS_HEIGHT) ? CANVAS_HEIGHT : 600;

    // Clear canvas with gradient background
    const gradient = ctx.createLinearGradient(0, 0, 0, safeCanvasHeight);
    gradient.addColorStop(0, 'hsl(235, 39%, 4%)');
    gradient.addColorStop(1, 'hsl(235, 39%, 8%)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, safeCanvasHeight);

    const { ball, paddle, bricks, particles } = state;

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
    if (!ball.launched && state.gameStatus === 'START') {
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
    ctx.fillText(`Score: ${state.score}`, 20, CANVAS_HEIGHT - 60);

    // High Score in bottom left (below score)
    ctx.font = 'bold 18px Arial';
    ctx.fillText(`High Score: ${state.highScore}`, 20, CANVAS_HEIGHT - 30);

    // Lives as hearts in bottom right
    const heartSize = 16;
    const heartSpacing = 25;
    const startX = CANVAS_WIDTH - (state.lives * heartSpacing) - 20;

    ctx.fillStyle = '#ff4757';
    for (let i = 0; i < state.lives; i++) {
        const x = startX + (i * heartSpacing);
        const y = CANVAS_HEIGHT - 40;

        // Draw proper heart shape using bezier curves
        ctx.beginPath();
        ctx.moveTo(x, y + heartSize / 4);

        // Left curve
        ctx.bezierCurveTo(x, y, x - heartSize / 2, y, x - heartSize / 2, y + heartSize / 4);
        ctx.bezierCurveTo(x - heartSize / 2, y + heartSize / 2, x, y + heartSize / 2, x, y + heartSize);

        // Right curve  
        ctx.bezierCurveTo(x, y + heartSize / 2, x + heartSize / 2, y + heartSize / 2, x + heartSize / 2, y + heartSize / 4);
        ctx.bezierCurveTo(x + heartSize / 2, y, x, y, x, y + heartSize / 4);

        ctx.fill();
    }
}


// Handle mouse movement
export function mouseMovementHandler(status: GameStatus, setGameState: React.Dispatch<React.SetStateAction<GameState>>, canvasRef: React.RefObject<HTMLCanvasElement>, widthCanvas: number, widthPaddle: number, e: React.MouseEvent<HTMLCanvasElement>): void {
    if (status === 'GAME_OVER' || status === 'WIN') return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = widthCanvas / rect.width;
    const x = (e.clientX - rect.left) * scaleX;

    setGameState(prevState => ({
        ...prevState,
        paddle: {
            ...prevState.paddle,
            x: Math.max(0, Math.min(x - widthPaddle / 2, widthCanvas - widthPaddle)),
        },
    }));
}

// Handle touch movement for mobile

export function touchMovementHandler(status: GameStatus, setGameState: React.Dispatch<React.SetStateAction<GameState>>, canvasRef: React.RefObject<HTMLCanvasElement>, widthCanvas: number, widthPaddle: number, e: React.TouchEvent<HTMLCanvasElement>): void {
    e.preventDefault();
    if (status === 'GAME_OVER' || status === 'WIN') return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = widthCanvas / rect.width;
    const x = (e.touches[0].clientX - rect.left) * scaleX;

    setGameState(prevState => ({
        ...prevState,
        paddle: {
            ...prevState.paddle,
            x: Math.max(0, Math.min(x - widthPaddle / 2, widthCanvas - widthPaddle)),
        },
    }));

}

//   reset the game state
export function resetGameState(setGameState: React.Dispatch<React.SetStateAction<GameState>>, widthCanvas: number, heightCanvas: number, radiusBall: number, widthPaddle: number, heightPaddle: number, initBricks: Function): void {

    setGameState(prevState => ({
        ball: {
            x: widthCanvas / 2,
            y: heightCanvas - 120,
            dx: 0,
            dy: 0,
            radius: radiusBall,
            launched: false,
        },
        paddle: {
            x: widthCanvas / 2 - widthPaddle / 2,
            y: heightCanvas - 100,
            width: widthPaddle,
            height: heightPaddle,
        },
        bricks: initBricks(),
        score: 0,
        lives: 3,
        gameStatus: 'START',
        highScore: prevState.highScore,
        particles: [],
    }));
}
