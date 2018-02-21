const UserController = function () {
	this.checkAuth = (req, res, next) => {
		if (!req.session || !req.session.authenticated) {
			res.send('oops');
		} else {
			res.send('gg');
		}
		next();
	}
}

module.exports = new UserController();
