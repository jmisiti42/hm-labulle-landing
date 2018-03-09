const mongoose = require('mongoose');

var DeviceSchema = new mongoose.Schema({
	userId: { type: mongoose.Schema.Types.ObjectId, required: true },
	device: { type: String, required: true },
	ipHash: { type: String, required: true }
});

module.exports = mongoose.model('Device', DeviceSchema);
