const fs = require('fs');

const AudioController = function () {
	this.getFile = (req, res) => {
		const filename = __dirname + '/../mp3/' + req.params.filename;
		fs.exists(filename, (fileExist) => {
			if (fileExist) {
				var stat = fs.statSync(filename);
				res.writeHead(200, {
			        'Content-Type': 'audio/mpeg',
			        'Content-Length': stat.size
			    });
				var readStream = fs.createReadStream(filename, { start: 50000 });
				readStream.pipe(res);
			} else {
				res.send("Its a 404");
				res.end();
			}
		});
	};
}

module.exports = new AudioController();
