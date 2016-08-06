module.exports = function *(app) {
	app.events.on('io connect', (socket)=> {
		app.iterate(app.apis, (apiFn, apiName)=> {
			socket.on(apiName, ()=> {
				app.runAsync(apiFn)
					.catch((err)=> {
						throw new app.extError(err).addClueData('api', {
							name: apiName,
							handshake: socket.handshake
						})
					})

			});
		})
	})
};