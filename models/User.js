require("../models/Listened");
const mongoose = require('mongoose');
const Listened = mongoose.model('Listened');
const hasha = require('hasha');

var UserSchema = new mongoose.Schema({
	password: { type: String, required: true },
	mail: { type: String, required: true },
	lastRead: { type: String, required: false },
	timeRead: [{
	    name: {type: String},
	    time: {type: Number},
	    duration: {type: Number},
		_id: false
	}],
	admin: { type: Boolean, default: false },
	likes: [{ name: String, _id: false }],
	created_at: { type: Date },
	resetToken: { type: String }
});

const hash = (pwd) => {
	return hasha(pwd, {algorithm: 'whirlpool'});
}

UserSchema.pre('save', function(next) {
    if (!this.created_at) {
		this.created_at = new Date();
	}
	next();
});

UserSchema.methods.updateOrCreate = function (userId, name, time, duration, cb) {
	if (!this.timeRead) this.timeRead = new Array();
	let index = this.timeRead.findIndex((elem) => {
		return elem.name == name;
	});
	if (index > -1)
		this.timeRead[index].time = time;
	else
		this.timeRead.push({ name, time, duration });

	Listened.findOne({ idReader: userId, name }).exec((err, listened) => {
		if (err) console.log(err);
		if (!listened) {
			let lst = new Listened();
			lst.name = name;
			lst.idReader = userId;
			lst.readed = time / duration * 100;
			lst.save((err) => { if (err) console.log("errors :", err); });
		} else {
			listened.readed = (time / duration * 100) > listened.readed ? (time / duration * 100) : listened.readed;
			listened.save((err) => { if (err) console.log("errors :", err); });
		}
	});
	this.save((err, usr) => {
		if (err) console.log(err);
		return cb(usr);
	});
};

UserSchema.methods.getTimeRead = function (name) {
	return this.timeRead.findIndex((elem) => { return elem.name == name; });
};

UserSchema.create = (datas) => {
	this.password = hash(datas.password);
	this.mail = datas.mail;
	return this;
};

module.exports = mongoose.model('User', UserSchema);
