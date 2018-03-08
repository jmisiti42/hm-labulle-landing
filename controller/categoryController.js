require("../models/Category");
const fs 					= require('fs');
const config 				= require('../config/production.json');
const mongoose 				= require('mongoose');
const path					= require('path');
const Category 				= mongoose.model('Category');

const CategoryController = function () {
	let o = this;

	this.showView = (req, res, params) => {
		if (!params || typeof params == 'function')
			params = {};
		if (req.session && req.session.user)
			params.user = req.session.user;
		if (req && req.session && req.session.user && req.session.user.admin == true) {
			Category.find().exec((err, categorys) => {
				params.categorys = categorys;
				res.render('categorys', params);
			});
		}
		else
			res.render('index', params);
	};

	this.removeCategory = (req, res) => {
		if (!req.params.id) return o.showView(req, res, { msg: ["Categorie non trouvée."] });
		Category.findOneAndRemove({ _id: req.params.id }).exec((err, cat) => {
			if (err) return o.showView(req, res, { msg: [err.message] });
			if (!cat) return o.showView(req, res, { msg: ["Categorie non trouvée."] });
			return o.showView(req, res, { msgOk: [`Categorie supprimée avec succès !`] });
		});
	};

	this.showCreateCategory = (req, res) => {
		res.render('createCategory');
	};

	this.createCategory = (req, res) => {
		if (!req.body.name) return o.showView(req, res, { msg: ["Veuillez renseigner le nom de la categorie."] });
		if (!req.files.image) return o.showView(req, res, { msg: ["Image non trouvé."] });
		if (!req.body.description) return o.showView(req, res, { msg: ["Veuillez renseigner la description."] });

		let file = req.files.image;
		file.mv(`${__dirname}/../public/images/${req.files.image.name}`, (err) => {
			if (err) return o.showView(req, res, { msg: [err.message] });
			else {
				if (err) return o.showView(req, res, { msg: [err.message] });
				let category = new Category();
				category.name = req.body.name;
				category.image = req.files.image.name;
				category.description = req.body.description;
				category.save((err) => {
					if (err) return o.showView(req, res, { msg: [err.message] });
					else return o.showView(req, res, { msgOk: [`Categorie ${req.body.name} créée avec succès !`] });
				});
			}
		});
	};
}

module.exports = new CategoryController();
