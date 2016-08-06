app.events = new EventEmitter();

function wrapConsole(name, action) {
	console['$' + name] = console[name];//сохраняем исходный метод
	console[name] = function () {
		console['$' + name](...arguments);//вызываем исходный метод
		app.sendError(
			new app.extError(`From console.${name}: ` + [].join.call(arguments, ''),//запишем в сообщение ошибки всё, что будет выведено в консоль
				console[name])//Сократим стек до вызова этой функции(будет работать только в v8)
				.addClueData('console', {//добавим данные о имени консоли и исходных аргументах
					consoleMethod: name,
					arg          : Array.create(arguments)
				})[action]());//вызовем соответствующий уровню сеттер
	};
}
wrapConsole('error', 'setTrivial');
wrapConsole('warn', 'setWarning');
wrapConsole('info', 'setWarning');

app.errorForSending = [];
app.sendError = function (error) {//Функция отправки ошибки на сервер
	app.io.emit('server error send', new app.extError(error));
};

window.onerror = function (message, source, lineno, colno, error) {//Перехватываем ошибку из глобальной области
	app.errorForSending.push(//Записываем в массив для ошибок.
		new app.extError(error)
			.setFatal());//Сразу присваиваем высокий уровень тревоги, ведь ошибка произошла во время загрузки
};
app.events.on('socket.io ready', ()=> {//После готовности транспортной библиотеки
	window.onerror = function (message, source, lineno, colno, error) {//Перезаписываем коллбек
		app.sendError(new app.extError(error).setFatal());
	};

	app.errorForSending.forEach((error)=> {//Отправляем все ошибки, собранные ранее
		app.sendError(error);
	});
	delete app.errorForSending;
});
app.events.on('client ready', ()=> {//после загрузки записываем окончательную версию обработчика
	window.onerror = function (message, source, lineno, colno, error) {
		app.sendError(error);
	};
});

window.onload = ()=> {
	app.io = io();
	app.io.once('connect', ()=> {
		app.events.emit('socket.io ready');
	});
};
