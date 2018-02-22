const mongoose 				= require('mongoose');
const express				= require('express');
const bodyParser			= require('body-parser');
const http					= require('http');
const config				= require('./config/production.json');
const userController		= require('./controller/userController');
const fs 					= require('fs');
const path					= require('path');
const app					= express();

app.use(express.static('public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
mongoose.connect(config.uri);

app.set('view engine', 'ejs');
app.disable('x-powered-by');
app.enable('trust proxy');

app.get('/audio', function (req, res) {
	res.render("index");
});


app.get('/', userController.isLoggedIn);

app.post('/signup', userController.signup);
app.post('/signin', userController.signin);

http.createServer(app).listen(5001, () => console.log(`listening on port 5001`));
