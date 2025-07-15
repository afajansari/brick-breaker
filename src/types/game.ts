type GameStatus = 'START' | 'PLAYING' | 'PAUSED' | 'WIN' | 'GAME_OVER';

interface GameState {
  ball: { x: number; y: number; dx: number; dy: number; radius: number; launched: boolean };
  paddle: { x: number; y: number; width: number; height: number };
  bricks: Brick[];
  score: number;
  lives: number;
  gameStatus: GameStatus;
  highScore: number;
  particles: Particle[];
}

interface Particle {
  x: number;
  y: number;
  dx: number;
  dy: number;
  life: number;
  maxLife: number;
  color: string;
}

interface Brick {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  visible: boolean;
  points: number;
}

type CollisionType = Pick<GameState['ball'], 'x' | 'y' | 'radius'>;

export type { GameState, Particle, Brick, GameStatus, CollisionType };