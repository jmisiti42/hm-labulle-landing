require("../models/User");

const config				= require('../config/production.json');
const mongoose = require('mongoose');
const User = mongoose.model('User');
mongoose.connect(config.uri);

const UserController = function () {
	this.isLoggedIn = (req, res, next) => {
		if (!req.session) {
			res.send('You need to login before access this page !');
		} else {
			res.send('Welcome !');
		}
		next();
	};

	this.signup = (req, res, next) => {
		if (req.session) {
			res.send('Already logged in !');
		} else if (req.body) {
			let errors = verifyFields(req);
			if (errors.length > 0) {
				res.json({ "errors": errors });
			} else {
				let user = new User();
				user.save((error) => {
					console.log('saved');
				});
				res.send("account created !");
			}
		} else {
			res.send('An error occured');
		}
		next();
	};

	this.signin = (req, res, next) => {
		if (req.session) {
			res.send('Already logged in !');
		} else if (req.body) {
			if (req.body.password && req.body.mail && validateEmail(req.body.mail)) {

			}
		} else {
			res.send('An error occured');
		}
		next();
	};
}

module.exports = new UserController();

const validateEmail = (email) => {
	const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
	return re.test(email);
}

const verifyFields = (req) => {
	let errors = new Array();
	if (!req.body.mail || !validateEmail(req.body.mail))
		errors.push('Veuillez entrer une addresse e-mail valide.');
	if (!req.body.password)
		errors.push('Veuillez renseigner votre mot de passe.');
	if (!req.body.repassword)
		errors.push('Veuillez confirmer votre mot de passe.');
	if (req.body.password != req.body.repassword)
		errors.push('Vos mots de passes ne correspondent pas.');
	if (req.body.childs && req.body.childs.length > 0) {
		for (var i = 0; i != req.body.childs.length; i++) {
			if (req.body.childs[i].length <= 0 || isNaN(req.body.childs[i]))
				errors.push('Enfant ' + i + " mal formaté");
		}
	}
	return errors;
}
