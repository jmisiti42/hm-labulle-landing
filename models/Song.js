const mongoose = require('mongoose');

var SongSchema = new mongoose.Schema({
	name: { type: String, required: true },
	duration: { type: Number, required: true },
	category: { type: String, required: true },
	last: { type: Boolean, default: false }
});

module.exports = mongoose.model('Song', SongSchema);
