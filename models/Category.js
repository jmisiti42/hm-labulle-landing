const mongoose = require('mongoose');

var CategorySchema = new mongoose.Schema({
	name: { type: String, required: true },
	image: { type: String, required: true },
	description: { type: String, required: true }
});

module.exports = mongoose.model('Category', CategorySchema);
