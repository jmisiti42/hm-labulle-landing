const mongoose = require('mongoose');
const hasha = require('hasha');

var UserSchema = new mongoose.Schema({
	password: { type: String, required: true },
	mail: { type: String, required: true },
	lastRead: { type: String, required: false },
	timeRead: [{ name: String, time: Number }],
	admin: { type: Boolean, default: false },
	resetToken: { type: String },
    childs: [Number]
});

const hash = (pwd) => {
	return hasha(pwd, {algorithm: 'whirlpool'});
}

UserSchema.create = (datas) => {
	this.password = hash(datas.password);
	this.mail = datas.mail;
	this.childs = datas.childs ? datas.childs : null;
	return this;
};

module.exports = mongoose.model('User', UserSchema);
