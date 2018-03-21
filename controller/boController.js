require("../models/User");
require("../models/Device");
require("../models/Listened");
const config 				= require('../config/production.json');
const mongoose 				= require('mongoose');
const User 					= mongoose.model('User');
const Device 				= mongoose.model('Device');
const Listened 				= mongoose.model('Listened');
const hasha 				= require('hasha');
const ipAddress 			= new Array();

const BoController = function () {
	let o = this;

	this.showView = (req, res, params) => {
		if (!params || typeof params == 'function')
			params = {};
		if (req.session && req.session.user)
			params.user = req.session.user;
		Listened.aggregate([{ $group: { _id: '$name', count: { $sum: 1 } } }]).exec((err, result) => {
			params.lectureConcentration += result.find((a) => { return a._id == "Ep. 1 Les connecter à eux-mêmes" }).count;
			params.lectureConcentration += result.find((a) => { return a._id == "Ep. 2 Faire alliance avec votre enfant" }).count;
			params.lectureConcentration += result.find((a) => { return a._id == "Ep. 3 L'importance de l'objectif" }).count;
			params.lectureConcentration += result.find((a) => { return a._id == "Ep. 4 Laissez libre court aux mouvements" }).count;
			params.lectureConcentration += result.find((a) => { return a._id == "Ep. 5 Le récap : tout ce qui est à retenir !" }).count;
			params.lectureAutonomie += result.find((a) => { return a._id == "Ep. 1 L'autonomie, levier clé de la confiance en soi" }).count;
			params.lectureAutonomie += result.find((a) => { return a._id == "Ep. 2 Des missions adaptées" }).count;
			params.lectureAutonomie += result.find((a) => { return a._id == "Ep. 3 Parents, lâchez prise !" }).count;
			params.lectureAutonomie += result.find((a) => { return a._id == "Ep. 4 Responsabilisez-les" }).count;

			if (req && req.session && req.session.user && req.session.user.admin == true)
				res.render('dashboard', params);
			else
				res.render('index', params);
		});
	};

	this.users = (req, res, params) => {
		if (!params || typeof params == 'function')
			params = {};
		if (req.session && req.session.user)
			params.user = req.session.user;
		res.render('users', params);
	};

	this.getViewed = (req, res) => {
		const beginDate = req.query.beginDate ? new Date(parseFloat(req.query.beginDate)) : new Date(1496268000000);
		const endDate = req.query.endDate ? new Date(parseFloat(req.query.endDate)) : new Date(1898550000000);
		User.find().exec((err, users) => {
		    var promises = users.map( user =>
		        Listened.count({ idReader: user._id, timestamp: { $gte: beginDate, $lt: endDate } })
		            .then( count => ({
		                mail: user.mail,
		                count: count
		            }))
		    );
		    Promise.all(promises)
		        .then( result => {
		            res.json({ "aaData" : result, "iTotalRecords": users.length, "iTotalDisplayRecords": users.length });
		        })
		        .catch( err => {
					res.json({ "aaData" : [{name: "empty", count: "empty"}], "iTotalRecords": c, "iTotalDisplayRecords": c});
		        })
		});
	};

	this.getUserInfos = (req, res) => {
		let result = {};
		User.findOne({ mail: req.params.mail }).exec((err, user) => {
			if (err) return res.json({error: err.message});
			if (!user) return res.json({error: "no user found"});
			result.user = user;
			Listened.find({ idReader: user._id }).exec((err, listeneds) => {
				if (err) return res.json({error: err.message});
				result.listeneds = listeneds;
				Device.find({ userId: user._id }).exec((err, devices) => {
					if (err) return res.json({error: err.message});
					result.devices = devices;
					res.json(result);
				});
			});
		});
	};
}

module.exports = new BoController();
