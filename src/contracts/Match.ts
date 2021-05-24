import { Player } from "./Player";


export interface Point {
	x: number;
	y: number;
}

interface Body {
	point: Point;
	radius: number;
}

export interface GamePlayer extends Body {
	fingerprint: string;
	alive?: boolean;
}

export interface Game {
	catcher: GamePlayer;
	fugitives: GamePlayer[];
	grantedTokens: any[];
}

export interface GameSnapShot {
	catcher: GamePlayer;
	fugitives: GamePlayer[];
}

export interface Match {
	id: string;
	host: string;
	players: string[];
	grantedTokens: any[];
	numPlayers: number;
	state: 'lobby' | 'in-game' | 'finished';
	game?: Game;
}


export type PlayerSnapShot = {
	fingerprint: string;
	username: string;
	state: string;
}

export interface MatchSnapshot {
	id: string;
	host: PlayerSnapShot;
	players: PlayerSnapShot[];
	state: 'lobby' | 'in-game' | 'finished';
	numPlayers: number;
	game?: GameSnapShot;
}