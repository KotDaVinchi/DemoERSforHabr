module.exports = function (app) {
	require('./frontend/tools.universal')(app);
	/**
	 * универсальная функция для запуска других функций асинхронно, возвращает promise
	 * @param fn функция к
	 * @returns {*}
	 */
	app.runAsync = function () {
		var args = [];
		for (var index = 0; index < arguments.length; ++index) { args.push(arguments[index]); }
		if (args.length === 0) return false;
		var runFunction = args[0];
		if (!app.isFunction(runFunction)) return false;
		var result = app.isGeneratorFunction(runFunction) ? app.co.wrap(runFunction).apply(this, args.slice(1))
				: new Promise(function (resolve, reject) {
			try { var res = runFunction.apply(this, args.slice(1)) } catch (e) { reject(e); }
			resolve(res);
		});
		return result;
	};

	//Patch event emitter on function for generatior-function support
	app.events.oldOn = app.events.on;
	app.events.on = function (name, cb) {
		app.events.oldOn(name, function (res) {
			app.runAsync(cb, res);
		});
	};
};