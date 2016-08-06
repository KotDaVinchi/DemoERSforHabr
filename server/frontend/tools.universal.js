(function (module) {
	var injectTools = function (app) {

		app.testConstructor = function (constrName, val) {
			return !app.isUndefined(val) && !app.isNull(val) && val.constructor && val.constructor.name == constrName;
		};
		app.isFunction = function (val) {
			return app.testConstructor("Function", val) || app.isGeneratorFunction(val);
		};
		app.isGeneratorFunction = app.testConstructor.bind(undefined, "GeneratorFunction");
		app.isUndefined = function (val) { return typeof val === "undefined" };
		app.isArray = app.testConstructor.bind(undefined, "Array");
		app.isObject = app.testConstructor.bind(undefined, "Object");
		app.isString = app.testConstructor.bind(undefined, "String");
		app.isNull = function (val) {
			return Object.prototype.toString.call(val) === "[object Null]";
		};
		app.isBoolean = function isNull(val) {
			return Object.prototype.toString.call(val) === "[object Boolean]";
		};
		app.isNumber = Number.isFinite;
		app.isInteger = Number.isSafeInteger;
		app.nop = function () {};
		app.nop$ = function *(chain) {return chain};
		app.now = function () { return new Date().getTime() };

		/**
		 * Универсальная функция перебора
		 * @param what {Array|Object} массив или объект, который нужно перебрать
		 * @param {iterateKeysCallback} callback {function|function*} функция перебора
		 * @returns {Array|Object|Promise} возвращает массив/обьект после перебора,
		 * или promise, если функция перебора генераторная
		 */
		app.iterateKeys = function (what, callback) {//универсальная функция итерации, коллбек(имя/номер, имя)
			if (app.isGeneratorFunction(callback)) {
				return app.runAsync(function*() {
					return yield app.iterate(what, function*(row, key) {
						return yield callback(key, row)
					});
				});
			} else {
				app.iterate(what, function (row, key) { return callback(key, row) });
			}
		};
		/**
		 * @callback iterateKeysCallback
		 * @param {*} valueName - имя/номер элемента
		 * @param {*} value - значение элемента
		 */

		/**
		 * Универсальная функция перебора
		 * @param what {Array|Object} массив или объект, который нужно перебрать
		 * @param {iterateCallback} callback {function|function*} функция перебора
		 * @returns {Array|Object|Promise} возвращает массив/обьект после перебора,
		 * или promise, если функция перебора генераторная
		 */
		app.iterate = function (what, callback) {//универсальная функция итерации, коллбек(значение, имя/номер)
			if (app.isGeneratorFunction(callback)) {
				return app.runAsync(function*() {
					if (app.isArray(what)) {
						for (var idx = 0; idx < what.length; ++idx) {
							var ret = yield app.runAsync(callback, what[idx], idx);
							if (!app.isUndefined(ret)) { what[idx] = ret }
						}
						return what;
					}
					if (app.isObject(what)) {
						return yield app.iterate(Object.keys(what), function *(index) {
							var ret = yield app.runAsync(callback, what[index], index);
							if (!app.isUndefined(ret)) { what[index] = ret }
							return what;
						});
					}
					return false;
				});
			} else {
				if (app.isArray(what)) {
					for (var idx = 0; idx < what.length; ++idx) {
						var ret = callback(what[idx], idx);
						if (!app.isUndefined(ret)) { what[idx] = ret }
					}
					return what;
				}
				if (app.isObject(what)) {
					Object.keys(what).forEach(function (idx) {
						var ret = callback(what[idx], idx);
						if (!app.isUndefined(ret)) {
							what[idx] = ret;
						}
					});
					return what;
				}
				return false;
			}
		};
		/**
		 * @callback iterateCallback
		 * @param {*} value - значение элемента
		 * @param {*} valueName - имя/номер элемента
		 */

		/**
		 * расширеный класс ошибки
		 * @public
		 * @constructor
		 * @arguments Animal
		 * @param {Error|String} error - ошибка или имя ошибки
		 * @param {function} lastFn - функция, до которой считать стэк(только v8)
		 * @extends Error
		 */
		app.extError = function extError(error, lastFn) {
			if (error && error.name && error.message && error.stack) {
				this.name = error.name;
				this.message = error.message;
				this.stack = error.stack;
				this.clueData = error.clueData || [];
				this._alarmLvl = error._alarmLvl || 'trivial';
				this._side = error._side || (module ? "backend" : "frontend");
				return;
			}
			if (!app.isString(error)) error = 'unknown error';
			this.name = 'Error';
			this.message = error;
			this._alarmLvl = 'trivial';
			this._side = module ? "backend" : "frontend";
			this.clueData = [];

			if (Error.captureStackTrace) {
				Error.captureStackTrace(this, app.isFunction(lastFn) ? lastFn : this.constructor);
			} else {
				this.stack = (new Error()).stack.split('\n').removeAt(1).join();
			}

		};
		app.extError.prototype = Object.create(Error.prototype);
		app.extError.prototype.constructor = app.extError;
		/**
		 * Установить уровень тревоги ошибки как 'fatal'
		 * @returns {app.extError}
		 */
		app.extError.prototype.setFatal = function () {
			this._alarmLvl = 'fatal';
			return this;
		};
		/**
		 * Установить уровень тревоги ошибки как 'trivial'
		 * @returns {app.extError}
		 */
		app.extError.prototype.setTrivial = function () {
			this._alarmLvl = 'trivial';
			return this;
		};
		/**
		 * Установить уровень тревоги ошибки как 'warning'
		 * @returns {app.extError}
		 */
		app.extError.prototype.setWarning = function () {
			this._alarmLvl = 'warning';
			return this;
		};
		/**
		 * Получить уровень тревоги ошибки
		 * @returns {String} - уровень тревоги
		 */
		app.extError.prototype.getAlarmLevel = function () {
			return this._alarmLvl;
		};
		/**
		 * Добавляет отладочные данные
		 * @param {String} name - индентификатор данных
		 * @param {Object} data - отладочные данные
		 * @returns {app.extError}
		 */
		app.extError.prototype.addClueData = function (name, data) {
			var dataObj = {};
			dataObj[name] = data;
			this.clueData.push(dataObj);
			return this;
		};
	};

	if (module) { module.exports = injectTools } else { injectTools(app) }
})(typeof module !== 'undefined' ? module : false);