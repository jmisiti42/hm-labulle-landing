const config 				= require('../config/production.json');
const mongoose 				= require('mongoose');
const User 					= mongoose.model('User');
const hasha 				= require('hasha');
const ipAddress 			= new Array();

const BoController = function () {
	this.showView = (req, res, params) => {
		if (!params || typeof params == 'function')
			params = {};
		if (req.session && req.session.user)
			params.user = req.session.user;
		if (req && req.session && req.session.user && req.session.user.admin == true)
			res.render('dashboard', params);
		else
			res.render('index', params);
	};
}

module.exports = new BoController();
