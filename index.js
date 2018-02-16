const express				= require('express');
const bodyParser			= require('body-parser');
const http					= require('http');
const mailchimpInstance		= 'us16';
const listUniqueId			= 'f1b321ee6e';
const mailchimpApiKey		= 'fc9db4d21bab5a8d956069a08d730255-us16';
const Mailchimp 			= require('mailchimp-api-v3');
const mailchimp 			= new Mailchimp(mailchimpApiKey);
const app					= express();
const validateEmail			= (email) => {
	const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
	return re.test(email);
}
const nodemailer = require('nodemailer');
const ipAddress = new Array();
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'hellomarcel.contact@gmail.com',
    pass: 'Hellom@rcel1'
  }
});

app.use(express.static('public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(require('helmet')());

app.set('view engine', 'ejs');
app.disable('x-powered-by');
app.enable('trust proxy');

app.get('/', (req, res) => {
	var msg = "Venez discuter !"
	if (req.query.msg)
		msg = req.query.msg;
	res.render('index', { msg });
});

app.post('/mailer', (req, res) => {
	const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
	if (ipAddress[ip])
		res.json({ error: "Veuillez attendre avant d'envoyer un nouveau message." });
	else {
		ipAddress[ip] = setTimeout(() => { ipAddress[ip] = null; }, 120 * 1000 * 60);
		const mailOptions = {
		  from: req.body.email,
		  to: 'contact@hellomarcel.fr',
		  subject: 'Email venant de ' + req.body.email,
		  text: req.body.message
		};
		transporter.sendMail(mailOptions, function(error, info){
			if (error) {
				res.json({ error: 'Une erreur est survenue lors de l\'envoi de votre mail. Veuillez essayer à nouveau dans quelques minutes.' });
			} else {
				res.json({ status: 'OK' });
			}
		});
	}
});

app.post('/signup', (req, res) => {
	if (!req.body || !req.body.email || !validateEmail(req.body.email))
		res.json({ status: 'ERROR', msg: 'Veuillez renseigner une addresse email valide.' });
	const email = req.body.email;
	const part = req.body.part ? req.body.part : 'Inconnu.';
	mailchimp.post('/lists/' + listUniqueId + '/members', {
			email_address : email,
			merge_fields: {
		        "PART": part
		    },
			status : 'subscribed'
		}).then(function(results) {
			res.json({ status: 'OK' });
		}).catch(function (err) {
			if (err.title == "Member Exists")
				res.json({ status: 'ERROR', msg: "Vous êtes déjà inscrit !"});
			else if (err.title == "Invalid Resource")
				res.json({ status: 'ERROR', msg: "Veuillez attendre avant de vous inscrire à une nouvelle newsletter."});
			else {
				res.json({ status: 'ERROR', msg: err.detail });
			}
		});
});

http.createServer(app).listen(5001, () => console.log(`listening on port 5001`));
