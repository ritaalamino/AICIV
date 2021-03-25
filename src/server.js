const express = require('express');
const http = require('http');
const path = require('path');
const socketio = require('socket.io');
const exphbs = require('express-handlebars');


const app = express();
const server = http.createServer(app);
const sockets = socketio(server);


// app.use(express.static('public'))
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));
app.engine('hbs', exphbs({ defaultLayout: 'main', extname: '.hbs', layoutsDir: __dirname + '/views/layouts' }));
app.use(express.static('public'))


app.get('/home', function (req, res, next) {
	res.render('home', {
		name: 'teste',
	});
});




server.listen(3000, () => {
	console.log(`> Server listening on port: 3000`)
})




