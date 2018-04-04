require("../models/User");
require("../models/Device");
require("../models/Listened");
const config 				= require('../config/production.json');
const mongoose 				= require('mongoose');
const User 					= mongoose.model('User');
const Device 				= mongoose.model('Device');
const Listened 				= mongoose.model('Listened');
const hasha 				= require('hasha');
const dateFormat 			= require('dateformat');
const ipAddress 			= new Array();

const BoController = function () {
	let o = this;

	this.showView = (req, res, params) => {
		if (!params || typeof params == 'function')
			params = {};
		if (req.session && req.session.user)
			params.user = req.session.user;
		Listened.aggregate([{ $group: { _id: '$name', count: { $sum: 1 }, percentage: { $avg: "$readed" } } }]).exec((err, result) => {
			params.counts = result;
			User.aggregate([{ "$project": { "s": { "$size": "$timeRead" } }}, {$group: { _id: '$name', count: {$sum: "$s"}, ct: { $sum: 1 } }}]).exec((err, rs) => {
				let lecture = 0;
				result.forEach((el) => {
					lecture += el.percentage / el.count;
				});
				Device.aggregate([{ $group: { _id: '$device', count: { $sum: 1 } } }]).exec((err, resultat) => {
					params.toPercentage = (number) => {
						return `${number.toString().charAt(0)}${number.toString().charAt(1) == "." ? "" : number.toString().charAt(1)}${number.toString().charAt(2) == "." ? "" : number.toString().charAt(2)}%`
					};
					Listened.count().exec((err, total) => {
						params.listenedsCount = total;
						params.moyenneDevice = toPercentage(resultat[0].count / (resultat[1].count + resultat[0].count) * 100)
						params.moyenneLecture = toPercentage((lecture / result.length) * 100);
						params.moyenneEcoute = ((rs[0].count / rs[0].ct) + "").charAt(0) + ((rs[0].count / rs[0].ct) + "").charAt(1) + ((rs[0].count / rs[0].ct) + "").charAt(2);
						if (req && req.session && req.session.user && req.session.user.admin == true)
							res.render('dashboard', params);
						else
							res.render('index', params);
					});
				});
			});
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
						created_at: dateFormat(user.created_at, 'dd/mm/yyyy'),
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

	const toPercentage = (number) => {
		return `${number.toString().charAt(0)}${number.toString().charAt(1) == "." ? "" : number.toString().charAt(1)}%`
	};
}

module.exports = new BoController();
