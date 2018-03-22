require("../models/Song");
require("../models/User");
require("../models/Device");
require("../models/Category");
const fs 					= require('fs');
const config 				= require('../config/production.json');
const mongoose 				= require('mongoose');
const path					= require('path');
const formidable			= require('formidable');
const mp3Duration			= require('mp3-duration');
const hasha 				= require('hasha');
const mailchimpInstance		= config.mailchimp.instance;
const mailchimpApiKey		= config.mailchimp.key;
const concentrationId		= config.mailchimp.concentrationId;
const autonomieId			= config.mailchimp.autonomieId;
const Mailchimp 			= require('mailchimp-api-v3');
const mailchimp 			= new Mailchimp(mailchimpApiKey);
const User 					= mongoose.model('User');
const Song 					= mongoose.model('Song');
const Device 				= mongoose.model('Device');
const Category 				= mongoose.model('Category');

const AudioController = function () {
	let o = this;

	this.showView = (req, res, params) => {
		if (!params || typeof params == 'function')
			params = {};
		if (req.session && req.session.user)
			params.user = req.session.user;
		params.toMinutes = (time) => {
			let minutes = time / 60;
			let minutesSeconds = minutes.toString().split('.');
			let m = minutesSeconds[0];
			let s = minutesSeconds[1].charAt(0) + minutesSeconds[1].charAt(1);
			return `${m}min ${(s / 100 * 60).toString().substring(0, 2)}`;
		}
		if (req && req.session && req.session.user && req.session.user.admin == true) {
			Song.find().sort({ liked: -1 }).exec((err, songs) => {
				params.songs = songs;
				res.render('songs', params);
			});
		}
		else
			res.render('index', params);
	};

	const addToList = (code, usrMail) => {
		if (code == 0) {
			mailchimp.post('/lists/' + concentrationId + '/members', {
				email_address : usrMail,
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
		} else if (code == 1) {
			mailchimp.post('/lists/' + autonomieId + '/members', {
				email_address : usrMail,
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
		}
	};

	this.lastRead = (req, res) => {
		let sid = req.body.id;
		Song.findOne({ _id: sid }, { category: 1, last: 1 }).exec((err, s) => {
			if (s && s.last == true) {
				if (req.session.user.likes.findIndex((elem) => { return elem.name ==  s.fileName.replace(/\s/g,'').split('.')[0] }) > -1) {
					return res.json("Ok");
				}
				if (s.category == "Développer la concentration") {
					addToList(0, req.session.user.mail);
				} else if (s.category == "Développer l'autonomie") {
					addToList(1, req.session.user.mail);
				}
				res.json("Ok");
			} else {
				res.json("Error");
			}
		});
	};

	this.addCountToPdf = (req, res) => {
		Song.findOneAndUpdate({ _id : req.body.id }, { $inc : { 'pdfViewed' : 1 } }).exec((err, result) => {
			if (err) return res.json(err);
			return res.json(result);
		});
	};

	this.updateTime = (req, res) => {
		User.findOne({ _id: req.session.user._id }).exec((err, _user) => {
			if (err) return res.json({ "error": true });
			if (!_user) return res.json({ "error": "no user"});
			Device.find({ userId: req.session.user._id }).exec((err, devices) => {
				if (req.ip && devices.findIndex((elem) => { return elem.ipHash == hasha(req.ip, { algorithm: "whirlpool" }) }) > -1) {
					if (devices.findIndex((elem) => { return elem.device == req.device.type }) == -1) {
						let device = new Device();
						device.device = req.device.type;
						device.ipHash = hasha(req.ip, { algorithm: "whirlpool" });
						device.userId = req.session.user._id;
						device.save();
					}
				} else {
					let device = new Device();
					device.device = req.device.type;
					device.ipHash = hasha(req.ip, { algorithm: "whirlpool" });
					device.userId = req.session.user._id;
					device.save();
				}
			});
			_user.updateOrCreate(req.session.user._id, req.body.name, req.body.time, req.body.duration, (usr) => {
				req.session.user = usr;
				req.session.save((err) => {
					return res.json(usr);
				});
			});
		});
	};

	this.removeSong = (req, res) => {
		if (!req.params.id) return o.showView(req, res, { msg: ["Podcast non trouvée."] });
		Song.findOneAndRemove({ _id: req.params.id }).exec((err, song) => {
			if (err) return o.showView(req, res, { msg: [err.message] });
			if (!song) return o.showView(req, res, { msg: ["Podcast non trouvée."] });
			return o.showView(req, res, { msgOk: [`Podcast supprimé avec succès !`] });
		});
	};

	this.showFormSong = (req, res) => {
		let params = { categorys: {}, song: {} };
		let id = req.params.id ? req.params.id : null;
		Category.find().exec((err, categorys) => {
			if (id) {
				Song.findOne({ _id: id }).exec((err, song) => {
					params.song = song ? song : {};
					params.categorys = categorys;
					res.render('formSong', params);
				});
			} else {
				params.categorys = categorys;
				res.render('formSong', params);
			}
		});
	};

	this.createSong = (req, res) => {
		if (!req.files.file) return o.showView(req, res, { msg: ["Fichier audio non trouvé."] });
		if (!req.files.filePdf) return o.showView(req, res, { msg: ["Fichier pdf non trouvé."] });
		if (!req.body.name) return o.showView(req, res, { msg: ["Veuillez renseigner le nom du podcast."] });
		if (req.files.file.mimetype.split('/')[1] != "mp3") return o.showView(req, res, { msg: ["Mauvais format de fichier mp3."] });
		if (req.files.filePdf.mimetype.split('/')[1] != "pdf") return o.showView(req, res, { msg: ["Mauvais format de fichier pdf."] });
		if (!req.body.category) return o.showView(req, res, { msg: ["Veuillez renseigner la categorie du podcast."] });
		let file = req.files.file;
		let filePdf = req.files.filePdf;
		let fileName = file.name;
		file.mv(`${__dirname}/../public/audios/${fileName}`, (err) => {
			if (err) return o.showView(req, res, { msg: [err.message] });
			else {
				filePdf.mv(`${__dirname}/../public/pdfs/${filePdf.name}`, (err) => {
					if (err) return o.showView(req, res, { msg: [err.message] });
					else {
						mp3Duration(`${__dirname}/../public/audios/${fileName}`, function (err, duration) {
							if (err) return o.showView(req, res, { msg: [err.message] });
							let song = new Song();
							song.category = req.body.category;
							song.name = req.body.name;
							song.duration = duration;
							song.last = req.body.last == 'true' ? true : false;
							song.fileName = fileName;
							song.pdfName = filePdf.name;
							song.save((err) => {
								if (err) return o.showView(req, res, { msg: [err.message] });
								else return o.showView(req, res, { msgOk: [`${req.body.name}.mp3 enregistré avec succès !`] });
							});
						});
					}
				});
			}
		});
	};

	this.editSong = (req, res) => {
		if (!req.body.name) return o.showView(req, res, { msg: ["Veuillez renseigner le nom du podcast."] });
		if (!req.body.category) return o.showView(req, res, { msg: ["Veuillez renseigner la categorie du podcast."] });
		let saved = req.files.file ? false : true;
		let savedPdf = req.files.filePdf ? false : true;
		Song.findOne({ _id: req.params.id }).exec((err, song) => {
			if (err) return o.showView(req, res, { msg: [err.message] });
			if (!song) return o.showView(req, res, { msg: ["Une erreur est survenue."] });
			let file = req.files.file;
			let filePdf = req.files.filePdf;
			let fileName = file ? file.name : null;
			if (file) {
				file.mv(`${__dirname}/../public/audios/${fileName}`, (err) => {
					if (err) return o.showView(req, res, { msg: [err.message] });
					else {
						mp3Duration(`${__dirname}/../public/audios/${fileName}`, function (err, duration) {
							if (err) return o.showView(req, res, { msg: [err.message] });
							song.duration = duration;
							song.fileName = fileName;
							song.save((err) => {
								if (err) return o.showView(req, res, { msg: [err.message] });
								saved = true;
							});
						});
					}
				});
			}
			if (filePdf) {
				filePdf.mv(`${__dirname}/../public/pdfs/${filePdf.name}`, (err) => {
					if (err) return o.showView(req, res, { msg: [err.message] });
					song.pdfName = filePdf.name;
					savedPdf = true;
				});
			}

			song.category = req.body.category;
			song.name = req.body.name;
			song.last = req.body.last == 'true' ? true : false;

			const saveSong = () => {
				if (saved == false || savedPdf == false) {
					setTimeout(saveSong, 1000);
				} else {
					song.save((err) => {
						if (err) return o.showView(req, res, { msg: [err.message] });
						else return o.showView(req, res, { msgOk: [`${req.body.name}.mp3 enregistré avec succès !`] });
					});
				}
			};
			saveSong();
		});
	};

	this.getFile = (req, res) => {
		const filename = __dirname + '/../mp3/' + req.params.filename;
		fs.exists(filename, (fileExist) => {
			if (fileExist) {
				var stat = fs.statSync(filename);
				res.writeHead(200, {
			        'Content-Type': 'audio/mpeg',
			        'Content-Length': stat.size
			    });
				var readStream = fs.createReadStream(filename, { start: 50000 });
				readStream.pipe(res);
			} else {
				res.send("Its a 404");
				res.end();
			}
		});
	};

	this.favoriteSong = (req, res) => {
		if (!req.body.songName) return res.json({ error: "no song name" });
		console.log(req.body.songName.replace(/\s/g,'').split('.')[0]);
		User.findOne({ _id: req.session.user._id }).exec((err, _user) => {
			if (err) return res.json({ error: err });
			if (!_user) return res.json({ error: "no user found" });
			let index = _user.likes.findIndex((elem) => { return elem.name == req.body.songName.replace(/\s/g,'').split('.')[0] });
			if (index > -1) {
				Song.findOne({ fileName: req.body.songName }).exec((err, sng) => {
					console.log("favorite disliked", err, sng);
					if (sng) {
						sng.liked--;
						sng.save();
					}
				});
				_user.likes.splice(index, 1);
				_user.save((err, user) => {
					if (err) { return res.json({ error: err }); }
					else {
						req.session.user = user;
						req.session.save();
						return res.json(user);
					}
				});
			} else {
				_user.likes.push({ name: req.body.songName.replace(/\s/g,'').split('.')[0] });
				Song.findOne({ fileName: req.body.songName }).exec((err, sng) => {
					console.log("favorite added", err, sng);
					if (sng) {
						sng.liked++;
						sng.save();
					}
				});
				_user.save((err, user) => {
					if (err) { return res.json({ error: err }); }
					else {
						req.session.user = user;
						req.session.save();
						return res.json(user);
					}
				});
			}
		});
	};
}

module.exports = new AudioController();
