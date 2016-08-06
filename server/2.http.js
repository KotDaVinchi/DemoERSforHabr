module.exports = function *(app) {
	app.Express = require('express');
	app.express = app.Express();
	app.http = require('http').Server(app.express);
	app.express.use(app.Express.static(__dirname + '/../public'));
	app.express.use(app.Express.static(__dirname + '/frontend'));

	yield new Promise(function (resolve) {
		app.http.listen(app.config.get('server:port'), app.config.get('server:host'), function () {
			resolve();
		});
	});

	app.io = require('socket.io')(app.http);
	app.io.on('connection', (socket)=> {
		app.events.emit('io connect', socket);
	});

	if (process.argv[2] == 'error') throw new app.extError('Test inLoad error').setFatal();

	app.apis = {};
	app.addApi = function (name, fn) {
		app.apis[name] = fn;
	}
};