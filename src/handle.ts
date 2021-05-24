import { Socket } from "socket.io";
import { Game } from "./game";
// import { Store } from "./store";

type MatchIsAvailableEvent = {
	matchId: string;
	fingerprint: string;
}

type CreateMatchEvent = {
	fingerprint: string;
}

type PlayerSyncEvent = {
	fingerprint: string;
	username: string;
}

type EnterMatchEvent = {
	fingerprint: string;
	token: string;
	matchID: string;
}

type CloseMatchEvent = {
	fingerprint: string;
	matchID: string;
}

type MakeHostEvent = {
	matchId: string;
	hostId: string;
	newHostId: string
}

type BanPlayerMatch = {
	matchId: string;
	hostId: string;
	playerId: string
}

type StartMatchEvent = {
	matchId: string;
	fingerprint: string;
}

type CommandEvent = {
	payload: any;
	command: string;
	fingerprint: string;
	matchId: string;
}



export const connection = (socket: Socket) => {

	const game = Game.getInstance()

	console.log('conectado', socket.id)

	socket.on('grantAccessMatch', async ({ fingerprint, matchId }: MatchIsAvailableEvent) => {
		const player = await game.retrivePlayer(fingerprint)
		const validUsername = player.username.trim().replace(/[\|&;\$%@"<>\(\)\+,]/g, '')
		if (!validUsername) {
			socket.emit('grantAccessMatch', {
				err: "Nome de usuário inválido.\n Vá até as configurações e mude.",
			})
		} else {
			try {
				const token = await game.grantAccessMatch(matchId, player)
				socket.emit('grantAccessMatch', {
					token,
				})
			} catch (err) {
				socket.emit('grantAccessMatch', {
					err: err.message,
				})
			}
		}
	})

	socket.on('createMatch', async ({ fingerprint }: CreateMatchEvent) => {
		const player = await game.retrivePlayer(fingerprint)
		try {
			const [id, token] = await game.createMatch(player, 2)
			socket.emit('createMatch', {
				token,
				id,
			})
		} catch (err) {
			socket.emit('createMatch', {
				err: err.message,
			})
		}
	})

	socket.on('syncPlayer', ({ fingerprint, username }: PlayerSyncEvent) => {
		game.syncPlayer(
			fingerprint, username, socket
		)
	})

	socket.on('enterMatch', async ({ fingerprint, matchID, token }: EnterMatchEvent) => {
		try {
			const snapshot = await game.enterMatch(fingerprint, matchID, token);
			socket.emit('enterMatch', {
				snapshot,
			})
			game.notifyAllInMatch(matchID, `lobby.snapshot.${matchID}`, snapshot)
		} catch (e) {
			socket.emit('enterMatch', {
				err: e.message || 'Erro ao entrar na partida :/',
			})
		}
	})

	socket.on('closeMatch', async ({ fingerprint, matchID }: CloseMatchEvent) => {
		await game.closeMatch(fingerprint, matchID);
	})

	socket.on('makeHost', ({ matchId, hostId, newHostId }: MakeHostEvent) => {
		try {
			game.makeHost(matchId, hostId, newHostId)
		} catch (e) {
			socket.emit('makeHost', {
				err: e.message || 'Erro ao mudar o host da partida :/',
			})
		}
	})


	socket.on('banPlayerMatch', ({ matchId, hostId, playerId }: BanPlayerMatch) => {
		try {
			game.banPlayerMatch(matchId, hostId, playerId)
		} catch (e) {
			socket.emit('banPlayerMatch', {
				err: e.message || 'Erro ao banir o jogador da partida :/',
			})
		}
	})
	socket.on('startMatch', ({ matchId, fingerprint }: StartMatchEvent) => {
		try {
			game.startMatch(matchId, fingerprint)
		} catch (e) {
			socket.emit('startMatch', {
				err: e.message || 'Erro ao iniciar a partida :/',
			})
		}
	})


	socket.on('enterGame', async ({ fingerprint, matchID, token }: EnterMatchEvent) => {
		try {
			const snapshot = await game.enterGame(fingerprint, matchID, token);
			socket.emit('enterGame', {
				snapshot,
			})
			game.notifyAllInMatch(matchID, `in-game.snapshot.${matchID}`, snapshot)
		} catch (e) {
			socket.emit('enterGame', {
				err: e.message || 'Erro ao entrar na partida :/',
			})
		}
	})

	socket.on('command', async ({ command, payload, fingerprint, matchId }: CommandEvent) => {
		try {
			await game.execCommand(command, payload, fingerprint, matchId);
		} catch (e) {
			console.log(e)
			socket.emit('command', {
				err: e.message || 'Erro ao executar comando :/',
			})
		}
	})

	socket.on('disconnect', () => {
		try {
			const player = game.getPlayerBySocket(socket)
			game.putPlayerState(player.fingerprint, 'disconected')
		} catch (e) {
			console.log("Erro ao sincronizar player disconectado.")
		}
	})
}