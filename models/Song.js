const mongoose = require('mongoose');

var SongSchema = new mongoose.Schema({
	name: { type: String, required: true },
	duration: { type: Number, required: true },
	category: { type: String, required: true },
	pdfName: { type: String, required: true },
	fileName: { type: String, required: true },
	liked: { type: Number, default: 0 },
	last: { type: Boolean, default: false }
});

module.exports = mongoose.model('Song', SongSchema);
