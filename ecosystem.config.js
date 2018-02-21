module.exports = {
	apps: [{
		name: 'server',
		script: './index.js'
	}],
	deploy: {
		production: {
		  user: 'ubuntu',
		  host: '52.59.16.166',
		  key: '.ssh/hm-bulle.pem',
		  ref: 'origin/master',
		  repo: 'git@github.com:jmisiti42/hm-labulle-landing.git',
		  path: '/home/ubuntu/server',
		  'post-deploy': 'npm install && pm2 startOrRestart ecosystem.config.js'
		}
	}
}
