const express				= require('express');
const bodyParser			= require('body-parser');
const http					= require('http');
const config				= require('./config/production.json');
const authController		= require('./controller/authController');
const boController			= require('./controller/boController');
const audioController		= require('./controller/audioController');
const categoryController	= require('./controller/categoryController');
const fs 					= require('fs');
const mongoose				= require('mongoose');
const path					= require('path');
const session				= require('express-session');
const cookieParser			= require('cookie-parser');
const fileUpload 			= require('express-fileupload');
const device 				= require('express-device');
const app					= express();

mongoose.connect(config.uri);
let db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
	console.log("Mongoose connected");
});

app.use(express.static('public'));
app.use(fileUpload());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(cookieParser());
app.use(device.capture());
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


app.all('/audios', function (req,res, next) {
	console.log("hello");
   res.status(403).send({
      message: 'Access Forbidden'
   });
});

//backoffice
app.get('/backoffice', authController.isLoggedIn, authController.isAdmin, boController.showView);


//List of all categorys
app.get('/categorys', authController.isLoggedIn, authController.isAdmin, categoryController.showView);
//create new category
app.post('/create/category', authController.isLoggedIn, authController.isAdmin, categoryController.createCategory);
//create new category view
app.get('/create/category', authController.isLoggedIn, authController.isAdmin, categoryController.showFormCategory);
//edit category
app.post('/edit/category/:id', authController.isLoggedIn, authController.isAdmin, categoryController.editCategory);
//edit category view
app.get('/edit/category/:id', authController.isLoggedIn, authController.isAdmin, categoryController.showFormCategory);
//remove a category
app.get('/remove/category/:id', authController.isLoggedIn, authController.isAdmin, categoryController.removeCategory);


//GET VIEWED SONGS
app.get('/getViewed', authController.isLoggedIn, authController.isAdmin, boController.getViewed);
//SEE USER PROFILE
app.get('/user/:mail', authController.isLoggedIn, authController.isAdmin, boController.getUserInfos);

//List of all podcasts
app.get('/songs', authController.isLoggedIn, authController.isAdmin, audioController.showView);
//create new song
app.post('/create/song', authController.isLoggedIn, authController.isAdmin, audioController.createSong);
//create new song
app.post('/lastread/song', authController.isLoggedIn, audioController.lastRead);
//create new song view
app.get('/create/song', authController.isLoggedIn, authController.isAdmin, audioController.showFormSong);
//edit song
app.post('/edit/song/:id', authController.isLoggedIn, authController.isAdmin, audioController.editSong);
//edit song view
app.get('/edit/song/:id', authController.isLoggedIn, authController.isAdmin, audioController.showFormSong);
//remove a category
app.get('/remove/song/:id', authController.isLoggedIn, authController.isAdmin, audioController.removeSong);
//Add a song to favorite
app.post('/favorite/song', authController.isLoggedIn, audioController.favoriteSong);

//reset password
app.get('/reset/:token', authController.resetPassword);
//Logout user
app.get('/logout', authController.isLoggedIn, authController.logout, authController.showView);
//Home GET
app.get('/', authController.showView);
//Signin / Signup handler
app.post('/auth', (req, res) => {
	if (req.body && req.body.button) {
		if (req.body.button == "Connexion")
			authController.signin(req, res);
		else
			authController.signup(req, res);
	}
});
//update password
app.post('/edit/password', authController.isLoggedIn, authController.editPassword);
//update mail
app.post('/edit/mail', authController.isLoggedIn, authController.editMail);
//Send back user's password
app.post('/repassword', authController.getPassword);
//Update time read
app.post('/updateTime', authController.isLoggedIn, audioController.updateTime);

//STATS
app.get('/users', authController.isLoggedIn, authController.isAdmin, boController.users);


http.createServer(app).listen(5001, () => console.log(`Hello Marcel La Bulle listening on port 5001`));
