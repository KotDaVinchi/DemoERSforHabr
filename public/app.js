app.events.on('socket.io ready', ()=> {
	document.getElementById('backend').onclick = ()=> {app.io.emit('api make error')};
	document.getElementById('frontend').onclick = ()=> {throw new app.extError('Demo frontend error')};
	document.getElementById('frontendConsErr').onclick = ()=> {console.error('Demo', 'console.error')};
	app.events.emit('client ready');
});