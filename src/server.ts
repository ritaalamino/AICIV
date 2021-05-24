import express from 'express';
import http from 'http';
import cors from 'cors'
import { connection } from './handle';
import { Game } from './game';

const socketIo = require('socket.io');


const app = express();
const server = http.createServer(app);
const sockets = socketIo(server, {
	cors: {
		origin: '*'
	}
});

app.use(cors())

const game = new Game({
	maxMatchs: 100
})


sockets.on('connection', connection)


server.listen(5000, () => {
	console.log(`Iniciando Servidor: Ouvindo requisições na porta 5000`)
})




