module.exports = function *(app) {
	app.addApi('api make error', ()=> {
		throw new app.extError('Demo backend error');
	})
}
