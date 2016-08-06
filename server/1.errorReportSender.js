"use strict";
module.exports = function* (app) {

	/**
	 * Пример драйвера ошибки
	 * @constructor
	 */
	function ConsoleDriver() {
		this.start = function (param) {//функция инициализации драйвера
		};
		this.handler = function (err) {//обработчик ошибки
			console.log(`> Driver 'console' catch '${err.message}' error`);
			console.log('>> ' + err.stack.replace(/\n/g, '\n>> '));
			console.log(`>> Side: ${err._side}`);
			console.log(`>> Alarm level: ${err.getAlarmLevel()}`);
			console.log('>> Clue data:', err.clueData);
			if (err.getAlarmLevel() == 'fatal' && err._side == 'backend') process.exit();
		}
	}

	app.errorDrivers = {//набор драйверов
		console: ConsoleDriver
	};

	var errorConfig = app.config.get('errorReportSender') || {drivers: []};//загрузка из конфига

	var errorOfDrivers = [];
	var resolveDrivers = [];

	var stackDepth = 0;
	var maxStackDepth = 1;

	function sendErrorsOfDrivers() {//отправка ошибок в работе драйверов
		++stackDepth;
		while (errorOfDrivers.length && stackDepth < maxStackDepth) {
			if (toDriver(errorOfDrivers.shift()) === false) break;
		}
		--stackDepth;
	}

	function toDriver(error) {//обработка ошибок
		app.runAsync(function*() {
			var done = false;
			for (let i = 0; i < resolveDrivers.length; i++) {//перебираем все пакеты драйверов ошибок
				Object.any(yield Object.map(resolveDrivers[i], (driverName, driver)=> {
					return app.runAsync(function*() {
						if (driver.status === 'not started') {
							yield* startDriver(driverName, driver)
						}
						if (driver.status === 'bad') return false;
						yield app.runAsync(driver.handler, error);
					}).catch((e)=> {
						driver.status = 'bad';
						//записываем ошибку драйвера в массив, для последующей отправки
						errorOfDrivers.push(
							new app.extError(e)
								.setTrivial()
								.addClueData('driver of error', {
										message: 'Bad handle driver of error',
										driverName
									}
								));
						return false;
					})
				}), (_, elem)=> {return elem !== false}) && (done = true);
				/*
				 * если хотя бы один драйвер из набора завершился успешно
				 * выходим из цикла перебора
				 */
				if (done)break;
			}
			if (!done) {//если ни один из драйверов не сработал
				console.error('Failed to handle the error');
				console.log(`Error message: ${error.message}'`);
				console.log(error.stack);
				sendErrorsOfDrivers();
				return false;//выбрасываем исключение в глобальную область
			}
			sendErrorsOfDrivers();
		})

	}

	//Сопоставляем драйвера из конфига с имеющимися
	app.iterate(errorConfig.drivers, (driversPack)=> {
		var resolveDriversPack = {};
		app.iterateKeys(driversPack, (driverName, parameters)=> {
			if (!app.errorDrivers[driverName]) {
				errorOfDrivers.push(
					new app.extError(`Unresolve driver of errors '${driverName}'`)
						.setTrivial()
						.addClueData('driver of error',
							{
								message: 'Bad start driver of error',
								driverName
							}
						));
				return;
			}
			var resolveDriver = new app.errorDrivers[driverName]();
			resolveDriver.config = parameters;
			resolveDriver.status = 'not started';
			resolveDriversPack[driverName] = resolveDriver;
		});
		resolveDrivers.push(resolveDriversPack);
	});

	function* startDriver(driverName, driver) {//Функция запуска драйвера
		console.log(`> ${driverName} driver starting`);
		yield app.runAsync(driver.start, driver.config).then(()=> {
			driver.status = 'started';
			console.log(`> ${driverName} driver starting successfully`);
		}).catch((err)=> {
			driver.status = 'bad';
			errorOfDrivers.push(
				new app.extError(err)
					.setTrivial()
					.addClueData('driver of error', {
							message: 'Bad start driver of error',
							driverName
						}
					));
			console.log(`> ${driverName} driver starting fail`);
			return false;
		});
	}

	app.startErrorDrivers = function* () {
		var done = false;
		for (var i = 0; i < resolveDrivers.length; i++) {
			Object.any(yield Object.map(resolveDrivers[i], startDriver)
				, (_, elem)=> {return elem !== false}) && (done = true);
			/*
			 * если хотя бы один драйвер из набора инициализировался успешно
			 * выходим из цикла перебора
			 */
			if (done) {break}
		}
		if (done) {
			sendErrorsOfDrivers();//add send error of driver
		} else {
			console.error(`Failed to start drivers of error`);
		}

		//Ловим ошибки из глобальной области
		process.on('uncaughtException', toDriver);
		process.on('unhandledRejection', toDriver);
		app.events.on('io connect', function (socket) {
			//Получаем ошибки с frontend
			socket.on('server error send', function (param) {
				toDriver(new app.extError(param).addClueData('connection', {
					handshake: socket.handshake
				}));
			})
		})
	};
	yield* app.startErrorDrivers();
};