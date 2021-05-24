import { Socket } from "socket.io";

export type PlayerState = 'online' | 'lobby' | 'in-game' | 'disconected';
export interface Player {
	socket: Socket;
	fingerprint: string;
	username: string;
	state?: PlayerState;
	lastPool?: Date;
}