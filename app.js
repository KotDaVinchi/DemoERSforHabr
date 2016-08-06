'use strict';
require('sugar');
process.env.NODE_PATH = __dirname;

var app = {
	requireTree: require('require-tree'),
	events     : new (require('events')).EventEmitter(),
	projectRoot: __dirname + '/',
	config     : require('nconf'),
	co         : require('co'),
};
app.config.file({file: app.projectRoot + "config.json"});

require('./server/0.tools.js')(app);

console.log('Loading...');

app.runAsync(function*() {
	app.events.setMaxListeners(50);

	yield app.iterate(app.requireTree('server', {filter: /^(?!frontend$).*/}), function*(fn, name) {
		if (name === '0.tools') return;
		console.log('> ' + name.split('.').slice(1).join('.'), 'loading...');
		yield app.co.wrap(fn)(app, name).catch(function (e) {
			console.log('Fatal error!');
			console.log(e);
			throw new app.extError(e).setFatal();
		});
		console.log('> ' + name.split('.').slice(1).join('.'), 'load');
	});
	console.log('Loaded');

	app.events.emit('loaded');
});