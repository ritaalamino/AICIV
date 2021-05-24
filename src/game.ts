import { Socket } from "socket.io"
import { promisify } from 'util';
import { sign, Secret, SignOptions, verify } from 'jsonwebtoken';
import { Mutex } from "async-mutex";
import cron from 'node-cron'

import { GamePlayer, Match, MatchSnapshot, Point } from './contracts/Match'
import { Player, PlayerState } from "./contracts/Player"
import { randomCode } from './util/code'
import { decode, generate } from './util/token'
import { JWT_SECRET, JWT_LIFETIME } from './configs/constants'
import ms from "ms";

interface GameProps {
	maxMatchs: number;
}

type TokenPayload = {
	player: {
		fingerprint: string;
		matchId: string;
		type: 'host' | 'player';
	}
}

export class Game {
	private static instance: Game
	private options: GameProps
	private players: Player[] = []
	private matchs: Match[] = []
	// private matchsObservers: CallableFunction[]
	// private playersObservers: CallableFunction[]
	private matchsMutex: Mutex
	private playersMutex: Mutex

	static getInstance() {
		if (Game.instance) {
			return Game.instance
		}

		return new Game({
			maxMatchs: 100
		})
	}


	constructor(props: GameProps) {
		if (!Game.instance) {
			Game.instance = this
		}
		this.options = props

		// cria as travas pra manter a consistencia do jogo

		this.matchsMutex = new Mutex()
		this.playersMutex = new Mutex()


		// inicia os jobs em segundo plano como o garbage collector

		this.initAsyncJobs()
	}


	initAsyncJobs() {
		// * * * * * *
		// | | | | | |
		// | | | | | day of week
		// | | | | month
		// | | | day of month
		// | | hour
		// | minute
		// second ( optional )


		// garbage collector
		console.log('Iniciando Funções Autonomas: Coletor de Lixo, ....')
		cron.schedule("*/5 * * * * *", async function () {
			this.gc()
		}.bind(this));
	}


	async createMatch(host: Player, numPlayers = 10): Promise<[string, any]> {
		const release = await this.matchsMutex.acquire()
		try {
			if (this.matchs.filter(m => m.state !== 'finished').length + 1 > this.options.maxMatchs) {
				throw Error('Numero máximo de partidas simultaneas alcançadas')
			}

			const id = randomCode(5)

			const payload: TokenPayload = {
				player: {
					fingerprint: host.fingerprint,
					matchId: id,
					type: 'host'
				},
			};

			const token = await promisify<TokenPayload, Secret, SignOptions>(
				sign,
			)(payload, JWT_SECRET, {
				expiresIn: JWT_LIFETIME,
			});


			const match: Match = {
				id,
				host: host.fingerprint,
				players: [],
				grantedTokens: [token],
				state: 'lobby',
				numPlayers,
			}

			this.matchs.push(match)

			return [id, token]
		} finally {
			release()
		}

	}

	matchIsPlayable(matchId: string): boolean {
		// precisa modificar
		const match = this.matchs.find(m => m.id === matchId)
		if (!match) throw Error("O jogo não existe")
		return match.state === "lobby" && match.players.length + 1 < match.numPlayers
	}

	async grantAccessMatch(matchId: string, player: Player): Promise<any> {
		// verificar também a quantidade de tokens e ver quais ja venceram e a relação dele com os jogadores que estão na lista.
		if (this.matchIsPlayable(matchId)) {
			const match = this.matchs.find(m => m.id === matchId)

			const payload: TokenPayload = {
				player: {
					fingerprint: player.fingerprint,
					matchId: matchId,
					type: 'player'
				},
			};

			const token = await promisify<TokenPayload, Secret, SignOptions>(
				sign,
			)(payload, JWT_SECRET, {
				expiresIn: JWT_LIFETIME,
			});


			match.grantedTokens = [...match.grantedTokens, token]

			this.matchs = [...this.matchs.filter(e => e.id !== matchId), match]
			return token
		}
	}

	async syncPlayer(fingerprint: string, username: string, socket: Socket, state?: PlayerState) {
		const release = await this.playersMutex.acquire()

		try {
			const playerExist = this.players.find(p => p.fingerprint === fingerprint)
			if (playerExist) {
				this.players = [...this.players.filter(p => p.fingerprint !== fingerprint), {
					username,
					socket,
					fingerprint,
					state,
					lastPool: new Date()
				}]

				const playerInMatch = this.getMatchByPlayer(playerExist)
				if (playerInMatch) {
					this.sendSnapshot(playerInMatch)
				}

			} else {
				const player: Player = {
					username,
					socket,
					fingerprint,
					state,
					lastPool: new Date()
				}
				this.players.push(player)
			}
		} finally {
			release()
		}
	}

	async retrivePlayer(fingerprint: string) {
		const release = await this.playersMutex.acquire()
		try {
			return this.players.find(p => p.fingerprint === fingerprint)
		} finally {
			release()
		}
	}

	async retriveMatch(matchId: string) {
		const release = await this.matchsMutex.acquire()
		try {
			return this.matchs.find(p => p.id === matchId)
		} finally {
			release()
		}
	}

	async putPlayerState(fingerprint: string, status: PlayerState) {
		const { username, socket } = await this.retrivePlayer(fingerprint)
		this.syncPlayer(fingerprint, username, socket, status)
	}

	async matchSnapshot(match: Match): Promise<MatchSnapshot> {
		const host = await this.retrivePlayer(match.host);

		const snapshot: MatchSnapshot = {
			id: match.id,
			players: await Promise.all(match.players.map(async (pid) => {
				const player = await this.retrivePlayer(pid);
				return {
					fingerprint: pid,
					username: player.username,
					state: player.state
				}
			})),
			host: {
				fingerprint: match.host,
				username: host.username,
				state: host.state
			},
			numPlayers: match.numPlayers,
			state: match.state,
			game: match.state === "in-game" ? ({
				fugitives: match.game.fugitives,
				catcher: match.game.catcher
			}) : undefined
		}
		return snapshot
	}

	async enterMatch(fingerprint: string, matchId: string, token: string) {
		const releaseMatchs = await this.matchsMutex.acquire()
		const releasePlayers = await this.playersMutex.acquire()
		try {
			const decodedToken = verify(token, JWT_SECRET) as TokenPayload;
			const match = this.matchs.find(m => m.id === matchId);
			if (!match) throw Error("Jogo invalido");
			if (!match.grantedTokens.find(t => t === token)) throw Error("Token não pertence a essa partida")
			if (decodedToken.player.type === 'player') {
				match.players = [...match.players.filter(pid => pid !== fingerprint), fingerprint]
				this.putPlayerState(fingerprint, 'lobby')
				this.matchs = [...this.matchs.filter(m => m.id !== matchId), match]
			}
			releasePlayers()
			releaseMatchs()
			return await this.matchSnapshot(match)
		} finally {
			if (this.matchsMutex.isLocked()) releaseMatchs()
			if (this.playersMutex.isLocked()) releasePlayers()
		}
	}

	async enterGame(fingerprint: string, matchId: string, token: string) {
		const releaseMatchs = await this.matchsMutex.acquire()
		const releasePlayers = await this.playersMutex.acquire()
		try {
			const decodedToken = verify(token, JWT_SECRET) as TokenPayload;
			const match = this.matchs.find(m => m.id === matchId);
			if (!match) throw Error("Jogo invalido");
			if (!match.game.grantedTokens.find(t => t === token)) throw Error("Token não pertence a essa partida")
			if (decodedToken.player.fingerprint !== fingerprint) throw Error("Essa chave de acesso não pertece ao remetente")
			if (match.state !== "in-game") throw Error("Essa partida ainda não iniciou.")
			if (decodedToken.player.type === 'player') {
				match.players = [...match.players.filter(pid => pid !== fingerprint), fingerprint]
				this.putPlayerState(fingerprint, 'in-game')
				this.matchs = [...this.matchs.filter(m => m.id !== matchId), match]
			}
			releasePlayers()
			releaseMatchs()
			return await this.matchSnapshot(match)
		} finally {
			if (this.matchsMutex.isLocked()) releaseMatchs()
			if (this.playersMutex.isLocked()) releasePlayers()
		}
	}

	async notifyAllInMatch(matchId: string, event: string, data: Object) {
		const match = this.matchs.find(m => m.id === matchId)
		if (!match) throw Error('Partida não encontrada.')
		const sockets = await Promise.all([match.host, ...match.players].map(async pid => (await this.retrivePlayer(pid))?.socket))
		sockets.forEach(socket => socket?.emit(event, data))
	}

	notifyPlayer(playerId: string, event: string, data: Object) {
		const player = this.players.find(p => p.fingerprint === playerId)
		if (!player) throw Error('Jogador não encontrado.')
		if (player.socket)
			player.socket.emit(event, data)
	}


	getPlayerBySocket(socket: Socket) {
		return this.players.find(p => p.socket === socket)
	}

	getMatchByPlayer(player: Player) {
		return this.matchs.find(m => m.players.find(pid => pid === player.fingerprint))
	}

	async sendSnapshot(match: Match) {
		const snapshot = await this.matchSnapshot(match)
		this.notifyAllInMatch(match.id, `${match.state}.snapshot.${match.id}`, snapshot)
	}

	retriveToken(match: Match, playerId: string) {

	}

	async makeHost(matchId: string, hostId: string, newHostId: string) {
		const release = await this.matchsMutex.acquire()
		try {
			const match = this.matchs.find(m => m.id === matchId)

			// modificar os tokens [ok]
			// mudar a strutura dos matchs [ok]

			const newHostToken = await generate<TokenPayload>({
				player: {
					fingerprint: newHostId,
					matchId,
					type: "host"
				}
			});
			const newPlayerToken = await generate<TokenPayload>({
				player: {
					fingerprint: hostId,
					matchId,
					type: "player"
				}
			});

			const gameTokens = match.grantedTokens.map(token => ({ token, decoded: decode<TokenPayload>(token) }))
			const filteredGameTokens =
				gameTokens.filter(({ token, decoded }) => decoded.player.fingerprint !== hostId ||
					decoded.player.fingerprint !== newHostId).map(({ token }) => token)


			const newMatch: Match = {
				...match,
				host: newHostId,
				players: [...match.players.filter(p => p !== newHostId), hostId],
				grantedTokens: [...filteredGameTokens, newHostToken, newPlayerToken]
			}

			this.matchs = [...this.matchs.filter(m => m.id !== matchId), newMatch]

			this.notifyPlayer(newHostId, 'hostChange', {
				token: newHostToken
			})

			this.notifyPlayer(hostId, 'hostChange', {
				token: newPlayerToken
			})

			this.sendSnapshot(newMatch)
		} finally {
			release()
		}

	}

	async banPlayerMatch(matchId: string, hostId: string, playerId: string) {
		const release = await this.matchsMutex.acquire()
		try {

			const banedPlayer = await this.retrivePlayer(playerId)
			if (!banedPlayer) throw Error("Jogador invalido.")
			const match = this.matchs.find(m => m.id === matchId)
			const gameTokens = match.grantedTokens.map(token => ({ token, decoded: decode<TokenPayload>(token) }))
			const filteredGameTokens =
				gameTokens.filter(({ token, decoded }) => decoded.player.fingerprint !== playerId).map(({ token }) => token)


			const newMatch: Match = {
				...match,
				host: hostId,
				players: match.players.filter(p => p !== playerId),
				grantedTokens: filteredGameTokens
			}

			this.matchs = [...this.matchs.filter(m => m.id !== matchId), newMatch]


			this.notifyPlayer(banedPlayer.fingerprint, 'ban', {
				message: "Você foi banido pelo host."
			})

			this.sendSnapshot(newMatch)
		} finally {
			release()
		}

	}

	async closeMatch(host: string, matchId: string) {
		const match = await this.retriveMatch(matchId)
		if (match.host !== host) throw Error("Permisões insuficientes!")
		const players = await Promise.all(match.players.map(async p => await this.retrivePlayer(p)))
		players.forEach(p => p.socket.emit('gameClosedByHost', {}))
		const release = await this.matchsMutex.acquire()
		try {
			this.matchs = this.matchs.filter(m => m.id !== match.id)
			console.log(this.matchs)
		}
		finally {
			release()
		}
	}

	async startMatch(matchId: string, fingerprint: string) {
		const host = await this.retrivePlayer(fingerprint);
		const match = await this.retriveMatch(matchId);
		if (!host) throw Error("Host não encontrado.")
		if (!match) throw Error("Pardida invalida.")

		const randIndex = Math.floor(Math.random() * (match.numPlayers - 1))

		const catcherIsHost = randIndex === 0;
		const release = await this.matchsMutex.acquire()
		try {
			// geram os novos tokens de acesso ao game
			const grantedTokens =
				await Promise.all([match.host, ...match.players].map(async (fingerprint, index) => (await await generate<TokenPayload>({
					player: {
						fingerprint,
						matchId,
						type: randIndex === index ? "host" : "player"
					}
				}))))

			const newMatch: Match = {
				...match,
				state: "in-game",
				game: {
					grantedTokens,
					catcher: {
						point:
							{ x: 50, y: 50 },
						fingerprint: catcherIsHost ? match.host : match.players[randIndex - 1],
						radius: 50,
						alive: true,
					},
					fugitives: [match.host, ...match.players].filter((_, index) => index !== randIndex).map(finger => ({
						point:
							{ x: 100, y: 100 },
						fingerprint: finger,
						radius: 32,
						alive: true,
					}))
				}
			}
			this.matchs = [...this.matchs.filter(m => m.id !== matchId), newMatch];
			[match.host, ...match.players].forEach(async (fingerprint, index) => {
				const player = await this.retrivePlayer(fingerprint)
				const token = grantedTokens[index]
				player.socket.emit('accessGame', {
					token,
				})
			});
		} finally {
			release()
		}
	}

	async execCommand(command: string, payload: any, fingerprint: string, matchId: string) {
		// função core do mvp
		const match = await this.retriveMatch(matchId)
		const player = await this.retrivePlayer(fingerprint)
		if (match.host !== player.fingerprint && !match.players.find(p => p === fingerprint)) throw Error("Ação não permitida, deve fazer parte da partida para executar um comando.")
		switch (command) {
			case "move":
				return await this.handleMove(match, player, payload)
			case "catch":
				return await this.handleCatch(match, player)
			// outras funcionalidades do jogo, futuramente implementadas
		}
	}

	async handleMove(match: Match, player: Player, payload: any) {
		const { dx, dy } = payload;
		const isCatcher =
			match.game.catcher.fingerprint === player.fingerprint
		const playerGame = isCatcher ? match.game.catcher : match.game.fugitives.find(fugitive => fugitive.fingerprint === player.fingerprint)
		if (!player) throw Error("Erro inesperado, estado player não encontrado.")
		const { point: { x, y }, radius } = playerGame

		// chegar as bounds
		const speed = isCatcher ? 55 : 37;
		// const canGo = x + (dx * speed) >= 0 && x + dx * speed <= 800 && y + dx * speed >= 0 && y + dy * speed <= 600;
		const canGo = true; // apenas pra testes do mvp pode se movimentar por tudo, não existe paredes
		if (canGo) {
			const release = await this.matchsMutex.acquire()
			try {
				const newPlayer: GamePlayer = {
					...playerGame,
					point: {
						x: x + dx * speed,
						y: y + dy * speed
					}
				}
				const newMatch: Match = {
					...match,
					game: {
						...match.game,
						catcher: isCatcher ? newPlayer : match.game.catcher,
						fugitives: !isCatcher ? [
							...match.game.fugitives.filter(f => f.fingerprint !== player.fingerprint), newPlayer
						] : match.game.fugitives,
					}
				}
				this.matchs = [...this.matchs.filter(m => m.id !== match.id), newMatch]

				this.sendSnapshot(newMatch)
			} finally {
				release()
			}

		} else {
			throw Error("Movimentação invalida. Passou dos limites.")
		}
	}

	async handleCatch(match: Match, player: Player,) {
		const isCatcher =
			match.game.catcher.fingerprint === player.fingerprint
		if (!isCatcher) return;
		const { point: cPoint, radius } = match.game.catcher
		const release = await this.matchsMutex.acquire()
		const sqdist = (point1: Point, point2: Point) => Math.sqrt((point2.x - point1.x) ** 2 + (point2.y - point1.y) ** 2)
		try {
			const playersToCatch = match.game.fugitives.filter(({ point, alive }) => alive && sqdist(point, cPoint) <= radius)
			const newMatch: Match = {
				...match,
				game: {
					...match.game,
					fugitives: [...match.game.fugitives.filter(p => !playersToCatch.find(pp => pp.fingerprint === p.fingerprint)),
					...playersToCatch.map(p => ({
						...p, alive: false,
					}))
					]
				}
			}

			this.matchs = [...this.matchs.filter(m => m.id !== match.id), newMatch]

			this.sendSnapshot(newMatch)
		} finally {
			release()
		}
	}


	async gc() {
		// console.log("Ação -> coletor de lixo [Em progresso]")
		// simples garbage collector pro jogo

		// limpar os players que tem o estado desconectado e não fazem um handshake a 10 segundos.
		const releasePlayers = await this.playersMutex.acquire()
		const releaseMatchs = await this.matchsMutex.acquire()

		try {
			// remove os clientes que a ultima sincronização aconteceu a 15s ou socket esta desconectado.
			const playersToRemove = this.players.filter(p => ((new Date().getTime() - p.lastPool.getTime()) > ms('20s') ||
				!p.socket.connected))
			// notifica os clientes a sincronizar os dados quando a ultima sincronização ocorreu a 5s.
			this.players.filter(p => ((new Date().getTime() - p.lastPool.getTime()) > ms('5s') &&
				p.socket.connected)).forEach(player => player.socket.emit('syncRequest', { payload: true }))

			const matchs = playersToRemove.map(p => ({
				player: p,
				match: this.getMatchByPlayer(p)
			})).filter(({ match }) => match)
				.map(({ player, match }) => ({ ...match, players: [...match.players.filter(pid => pid !== player.fingerprint)] }))

			// atualiza os matchs
			// precisa adicionar mais coisas nesse gc conforme o jogo for evoluindo
			this.matchs = [
				...this.matchs.filter(m => !matchs.find(match => match.id === m.id)),
				...matchs
			]
			this.matchs.forEach(m => this.sendSnapshot(m))

			// console.log("Ação -> coletor de lixo [Finalizada]")
		} catch (e) {
			console.log("Ação -> coletor de lixo [Erro]:\n", e.message || e)
		}
		finally {
			releasePlayers()
			releaseMatchs()
		}

	}

}