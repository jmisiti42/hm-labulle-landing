const express				= require('express');
const bodyParser			= require('body-parser');
const http					= require('http');
const config				= require('./config/production.json');
const authController		= require('./controller/authController');
const boController			= require('./controller/boController');
const audioController		= require('./controller/audioController');
const fs 					= require('fs');
const mongoose				= require('mongoose');
const path					= require('path');
const session				= require('express-session');
const cookieParser			= require('cookie-parser')
const app					= express();

mongoose.connect(config.uri);
let db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
	console.log("Mongoose connected");
});

app.use(express.static('public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(cookieParser());
let MemoryStore = session.MemoryStore;
app.use(session({
	secret: config.secretSession,
	resave: true,
	store: new MemoryStore(),
	saveUninitialized: true
}));

app.set('view engine', 'ejs');
app.disable('x-powered-by');
app.enable('trust proxy');

//backoffice
app.get('/backoffice', authController.isLoggedIn, authController.isAdmin, boController.showView);

//reset password
app.get('/reset/:token', authController.resetPassword);

//update password
app.post('/edit/password', authController.isLoggedIn, authController.editPassword);

//update mail
app.post('/edit/mail', authController.isLoggedIn, authController.editMail);

//Audio GET
app.get('/audio/:filename', audioController.getFile);

//Home GET
app.get('/', authController.showView);

//Send back user's password
app.post('/repassword', authController.getPassword);

//Logout user
app.get('/logout', authController.isLoggedIn, authController.logout, authController.showView);

//Signin / Signup handler
app.post('/auth', (req, res) => {
	if (req.body && req.body.button) {
		if (req.body.button == "Connexion")
			authController.signin(req, res);
		else
			authController.signup(req, res);
	}
});

http.createServer(app).listen(5001, () => console.log(`listening on port 5001`));
