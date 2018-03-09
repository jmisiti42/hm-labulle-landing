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
			Song.find().exec((err, songs) => {
				params.songs = songs;
				res.render('songs', params);
			});
		}
		else
			res.render('index', params);
	};

	this.updateTime = (req, res) => {
		User.findOne({ _id: req.session.user._id }).exec((err, _user) => {
			if (err) return res.json({ "error": true });
			if (!_user) return res.json({ "error": "no user"});
			Device.find({ userId: req.session.user._id }).exec((err, devices) => {
				if (devices.findIndex((elem) => { return elem.ipHash == hasha(req.ip, { algorithm: "whirlpool" }); }) > -1) {
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

	this.showCreateSong = (req, res) => {
		let params = {};
		Category.find().exec((err, categorys) => {
			params.categorys = categorys;
			res.render('createSong', params);
		});
	};

	this.createSong = (req, res) => {
		if (!req.files.file) return o.showView(req, res, { msg: ["Fichier non trouvé."] });
		if (!req.body.name) return o.showView(req, res, { msg: ["Veuillez renseigner le nom du podcast."] });
		if (req.files.file.mimetype.split('/')[1] != "mp3") return o.showView(req, res, { msg: ["Mauvais format de fichier."] });
		if (!req.body.category) return o.showView(req, res, { msg: ["Veuillez renseigner la categori du podcast."] });
		let file = req.files.file;
		file.mv(`${__dirname}/../public/audios/${req.body.name}.mp3`, (err) => {
			if (err) return o.showView(req, res, { msg: [err.message] });
			else {
				mp3Duration(`${__dirname}/../public/audios/${req.body.name}.mp3`, function (err, duration) {
					if (err) return o.showView(req, res, { msg: [err.message] });
					let song = new Song();
					song.category = req.body.category;
					song.name = req.body.name;
					song.duration = duration;
					song.last = req.body.last == 'true' ? true : false;
					song.save((err) => {
						if (err) return o.showView(req, res, { msg: [err.message] });
						else return o.showView(req, res, { msgOk: [`${req.body.name}.mp3 enregistré avec succès !`] });
					});
				});
			}
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
		User.findOne({ _id: req.session.user._id }).exec((err, _user) => {
			if (err) return res.json({ error: err });
			if (!_user) return res.json({ error: "no user found" });
			let index = _user.likes.findIndex((elem) => { return elem.name == req.body.songName });
			if (index > -1) {
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
				_user.likes.push({ name: req.body.songName });
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
