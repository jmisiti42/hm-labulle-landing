require("../models/User");
const config 				= require('../config/production.json');
const mongoose 				= require('mongoose');
const nodemailer			= require('nodemailer');
const User 					= mongoose.model('User');
const hasha 				= require('hasha');
const generatePwd			= require('password-generator');
const ipAddress 			= new Array();
const uuid					= require('uuid/v1');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: config.gmail.user,
    pass: config.gmail.pass
  }
});

const AuthController = function () {
	let o = this;

	this.isAdmin = (req, res, next) => {
		if (req.session.user.admin == true)
			return next();
		else
			return o.showView(req, res, { msg: ["Vous devez être admin pour accéder à cette page !"] });
	};

	this.isLoggedIn = (req, res, next) => {
		if (req.session && req.session.user)
			return next();
		else
			return o.showView(req, res, { msg: ["Vous devez être connecté pour accéder à cette page !"] });
	};

	this.showView = (req, res, params) => {
		if (!params || typeof params == 'function')
			params = {};
		if (req.session && req.session.user)
			params.user = req.session.user;
		res.render('index', params);
	};

	this.logout = (req, res, next) => {
		req.session.destroy((err) => {
			next();
		});
	};

	this.editPassword = (req, res, next) => {
		if (req.body.password && req.body.oldPassword) {
			User.findOne({ mail: req.session.user.mail, password: hasha(req.body.oldPassword, { algorithm: "whirlpool" }) }).exec((err, usr) => {
				if (err) return o.showView(req, res, { msg: [err.message] });
				if (!usr) return o.showView(req, res, { msg: ["Veuillez entrer votre ancien mot de passe"] });
				usr.password = hasha(req.body.password, { algorithm: "whirlpool" });
				usr.save((err) => {
					req.session.destroy((err) => {
						return o.showView(req, res, { msgOk: ["Votre mot de passe a bien été modifié !"] });
					});
				});
			});
		} else {
			o.showView(req, res, { msg: ["Veuillez renseigner votre ancien mot de passe et votre nouveau mot de passe."] });
		}
	};

	this.editMail = (req, res, next) => {
		if (req.body.mail && validateEmail(req.body.mail)) {
			User.findOne({ mail: req.session.user.mail }).exec((err, usr) => {
				if (err) return o.showView(req, res, { msg: [err.message] });
				if (!usr) return o.showView(req, res, { msg: ["Veuillez vous déconnecter et vous reconnecter."] });
				if (usr.mail == req.body.mail) return o.showView(req, res, { msg: ["Votre nouveau mail est identique à l'ancien."] });
				usr.mail = req.body.mail;
				usr.save((err) => {
					req.session.destroy((err) => {
						return o.showView(req, res, { msgOk: ["Votre addresse mail a bien été modifié !"] });
					});
				});
			});
		} else {
			o.showView(req, res, { msg: ["Veuillez renseigner une nouvelle addresse mail valide."] });
		}
	};

	this.resetPassword = (req, res, next) => {
		if (req.params && req.params.token) {
			User.findOne({ resetToken: req.params.token }).exec((err, usr) => {
				if (err) o.showView(req, res, { msg: [err.message] });
				if (!usr) o.showView(req, res, { msg: ["Token invalide."] });
				else {
					let newpwd = generatePwd();
					usr.password = hasha(newpwd, { algorithm: "whirlpool"});
					usr.save((errors, _usr) => {
						if (errors) o.showView(req, res, { msg: [errors.message] });
						else {
							const mailOptions = {
							  from: 'recovery@hellomarcel.fr',
							  to: _usr.mail,
							  subject: 'Votre mot de passe labulle.hellomarcel.fr ',
							  text: `Suite à votre demande de mot de passe. Voici votre nouveau mot de passe : ${newpwd}`
							};
							transporter.sendMail(mailOptions, function(error, info){
								if (error) {
									console.log(error);
									o.showView(req, res, { msg: ['Une erreur est survenue lors de l\'envoi de votre mail. Veuillez essayer à nouveau dans quelques minutes.'] });
								} else {
									o.showView(req, res, { msgOk: ['Votre nouveau mot de passe vous a été envoyé par mail.'] });
								}
							});
						}
					});
				}
			});
		} else {
			o.showView(req, res, { msg: ["Aucun token !"] });
		}
	};

	this.getPassword = (req, res, next) => {
		if (req.body.mail && validateEmail(req.body.mail)) {
			const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
			if (ipAddress[ip])
				res.json({ error: "Veuillez attendre avant d'envoyer un nouveau message." });
			else {
				User.findOne({ mail: req.body.mail }).exec((err, usr) => {
					if (err) res.json({error : err.message});
					if (!usr) res.json({ error: "Aucun compte ne possède cette addresse mail."});
					else {
						ipAddress[ip] = setTimeout(() => { ipAddress[ip] = null; }, 120 * 1000 * 60);
						code = ip.charAt(0) + uuid();
						usr.resetToken = code;
						usr.save((err) => {
							if (err) res.json({ error: errors.message});
						 	else {
								const mailOptions = {
								  from: 'recovery@hellomarcel.fr',
								  to: req.body.mail,
								  subject: 'Votre mot de passe labulle.hellomarcel.fr ',
								  text: `Suite à votre demande de mot de passe. Voici un lien pour récupérer votre mot de passe : https://labulle.hellomarcel.fr/reset/${code}`
								};
								transporter.sendMail(mailOptions, function(error, info){
									if (error) {
										console.log(error);
										res.json({ error: 'Une erreur est survenue lors de l\'envoi de votre mail. Veuillez essayer à nouveau dans quelques minutes.' });
									} else {
										res.json({ status: 'OK' });
									}
								});
							}
						});
					}
				});
			}
		}
	};

	this.signup = (req, res, next) => {
		if (req.session && req.session.user) {
			o.showView(req, res, { msg: ["Vous êtes déjà connecté !"] });
		} else if (req.body) {
			let errors = verifyFields(req);
			if (errors.length > 0) {
				o.showView(req, res, { msg: errors });
			} else {
				let pwd = hasha(req.body.password, { algorithm: 'whirlpool'});
				req.body.password = pwd;
				User.findOne({ mail: req.body.mail }).exec((err, usr) => {
					if (err) { o.showView(req, res, { msg: [err.message] }); }
					else if (usr) { o.showView(req, res, { msg: ["Un compte utilise déjà cette addresse mail !"] }); }
					else {
						new User(req.body).save((error, userSaved) => {
							if (error) { o.showView(req, res, { msg: [error.message] }); }
							else {
								req.session.user = userSaved;
								req.session.save((err) => {
									res.redirect('/');
								});
							}
						});
					}
				});
			}
		} else {
			o.showView(req, res, { msg: ["Une erreur est survenue, veuillez réessayer dans quelques minutes."] });
		}
	};

	this.signin = (req, res, next) => {
		if (req.session && req.session.user) {
			o.showView(req, res, { msg: ["Vous êtes déjà connecté !"] });
		} else if (req.body) {
			if (req.body.password && req.body.mail && validateEmail(req.body.mail)) {
				let pwd = hasha(req.body.password, { algorithm: 'whirlpool'});
				User.findOne({ mail: req.body.mail, password: pwd }).exec((err, usr) => {
					if (err) { o.showView(req, res, { msg: [err.message] }); }
					if (usr) {
						req.session.user = usr;
						req.session.save((err) => {
							res.redirect('/');
						});
					}
					else o.showView(req, res, { msg: ["Veuillez essayer avec d'autres identifiants."] });
				});
			} else {
				o.showView(req, res, { msg: ["Veuillez renseigner tous les champs."] });
			}
		} else {
			o.showView(req, res, { msg: ["Une erreur est survenue, veuillez réessayer dans quelques minutes."] });
		}
	};
}

module.exports = new AuthController();

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
	if (req.body.childs && req.body.childs.length > 0) {
		for (var i = 0; i != req.body.childs.length; i++) {
			if (req.body.childs[i].length <= 0 || isNaN(req.body.childs[i]))
				errors.push('Enfant ' + i + " mal formaté");
		}
	}
	return errors;
}
