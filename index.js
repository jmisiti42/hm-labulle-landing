const express				= require('express');
const bodyParser			= require('body-parser');
const http					= require('http');
const config				= require('./config/production.json');
const app					= express();
const validateEmail			= (email) => {
	const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
	return re.test(email);
}

app.use(express.static('public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(require('helmet')());

app.set('view engine', 'ejs');
app.disable('x-powered-by');
app.enable('trust proxy');

app.get('/', userController.checkAuth);

http.createServer(app).listen(5001, () => console.log(`listening on port 5001`));
