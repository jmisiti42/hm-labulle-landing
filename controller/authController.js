require("../models/User");
require("../models/Song");
require("../models/Category");
const config 				= require('../config/production.json');
const mongoose 				= require('mongoose');
const nodemailer			= require('nodemailer');
const User 					= mongoose.model('User');
const Song 					= mongoose.model('Song');
const Category 				= mongoose.model('Category');
const mailchimpInstance		= config.mailchimp.instance;
const mailchimpApiKey		= config.mailchimp.key;
const inscritsId			= config.mailchimp.inscritsId;
const Mailchimp 			= require('mailchimp-api-v3');
const mailchimp 			= new Mailchimp(mailchimpApiKey);
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
		params.toMinutes = (time) => {
			let minutes = time / 60;
			let minutesSeconds = minutes.toString().split('.');
			let m = minutesSeconds[0];
			let s = minutesSeconds[1].charAt(0) + minutesSeconds[1].charAt(1);
			return `${m}'${(s / 100 * 60).toString().substring(0, 2)}`;
		}
		Category.find().exec((err, categories) => {
		    var promises = categories.map( category =>
		        Song.find({ category: category.name })
		            .then( songs => ({
		                songs: songs,
						name: category.name,
						image: category.image,
						description: category.description
		            }))
		    );
		    Promise.all(promises)
		        .then( result => {
					params.categories = result;
					if (req.session && req.session.user) {
						User.findOne({ _id: req.session.user._id }).exec((err, _usr) => {
							if (err) { console.log(err); }
							else if (!_usr) { return res.render('index', params); }
							else {
								params.user = _usr;
								res.render('index', params);
							}

						});
					} else {
						return res.render('index', params);
					}
		        })
		        .catch( err => {
					return res.render('index', { msg: [err.message]});
		        })
		});
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
				if (req.body.password !==  req.body.repassword)
					return o.showView(req, res, { msg: ["Vos mots de passes doivent correspondre."] });
				let pwd = hasha(req.body.password, { algorithm: 'whirlpool'});
				req.body.password = pwd;
				User.findOne({ mail: req.body.mail }).exec((err, usr) => {
					if (err) { o.showView(req, res, { msg: [err.message] }); }
					else if (usr) { o.showView(req, res, { msg: ["Un compte utilise déjà cette addresse mail !"] }); }
					else {
						new User(req.body).save((error, userSaved) => {
							if (error) { o.showView(req, res, { msg: [error.message] }); }
							else {
								mailchimp.post('/lists/' + inscritsId + '/members', {
									email_address : userSaved.mail,
									status : 'subscribed'
								}).then(function(results) {
									console.log('New mailchimp user added successfully !');
								}).catch(function (err) {
									if (err.title == "Member Exists")
										console.log('Mailchimp member already exist !');
									else if (err.title == "Invalid Resource")
										console.log('Mailchimp error, wait before sending mail');
									else {
										console.log('mailchimp error : ', err.detail);
									}
								});
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
	return errors;
}
