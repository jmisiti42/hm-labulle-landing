const mongoose = require('mongoose');

var ListenedSchema = new mongoose.Schema({
	name: { type: String, required: true },
	idReader: { type: mongoose.Schema.Types.ObjectId, required: true },
	readed: { type: Number, required: true },
	timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Listened', ListenedSchema);
