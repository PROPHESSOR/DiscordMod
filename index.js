/* Discord MOD API
 * Version: 0.1
 * Author: PROPHESSOR: github.com/PROPHESSOR
 * https://github.com/PROPHESSOR/DiscordModAPI
 */

'use strict';

// var _fs = require("fs");
// var _config = require("./config.json");
const _utils = require('./utils');
// var _utils2;
// var _bdIpc = require('electron').ipcMain;
// var _error = false;

// var _eol = require('os').EOL;

var _mainWindow;

class Main {
	constructor (mainWindow) {
		this.mainWindow = mainWindow;
		this.utils = new (require('./utils').Utils(mainWindow))();
	}
}

/* BetterDiscordApp Utils and Helper functions
 * Version: 1.5
 * Author: Jiiks | http://jiiks.net
 * Date: 25/08/2015 - 09:19
 * Last Updated: 06/05/2016
 * https://github.com/Jiiks/BetterDiscordApp
 */

const https = require('https');
const http = require('http');
const _fs = require('fs');
var _mainWindow;
const eol = require('os').EOL;
let logs = '';

function Utils (mainWindow) {
	_mainWindow = mainWindow;
}

// Get browser mainwindow
function getMainWindow () {
	return _mainWindow;
}

class Utils {

	// Download using https
	download (host, path, callback) {
		this.log('Downloading Resource: ' + host + path);
		const options = {
			host,
			path,
			headers: {
				'user-agent': 'Mozilla/5.0'
			}
		};

		https.get(options, function (res) {
			let data = '';
			res.on('data', function (chunk) {
				data += chunk;
			});
			res.on('end', function () {
				callback(data);
			});
		}).on('error', function () {
			callback(null);
		});
	}

	// Download using http
	downloadHttp (url, callback) {
		this.log('Downloading Resource: ' + url);
		http.get(url, function (result) {
			let data = '';
			result.on('data', function (chunk) {
				data += chunk;
			});

			result.on('end', function () {
				callback(data);
			});
		}).on('error', function () {
			callback(null);
		});
	}

	getHash (beta, callback) {
		const branch = beta ? 'beta' : 'master';
		this.download('api.github.com', String('/repos/Jiiks/BetterDiscordApp/commits/' + branch), function (data) {
			callback(JSON.parse(data).sha);
		});
	}

	sendIcpAsync (message) {
		this.execJs('betterDiscordIPC.send("asynchronous-message", "' + message + '");');
	}

	// Get Webcontents
	getWebContents () {
		return getMainWindow().webContents;
	}

	// Js logger
	jsLog (message, type) {

		switch (type) {
			case 'log':
				this.execJs('console.log("BetterDiscord: ' + message + '");');
				break;
			case 'warn':
				this.execJs('console.warn("BetterDiscord: ' + message + '");');
				break;
			case 'error':
				this.execJs('console.error("BetterDiscord: ' + message + '");');
				break;
		}
	}

	updateLoading (message, cur, max) {
		this.log(message);
		this.execJs('document.getElementById("bd-status").innerHTML = "BetterDiscord - ' + message + ' : ";');
		this.execJs('document.getElementById("bd-pbar").value = ' + cur + ';');
		this.execJs('document.getElementById("bd-pbar").max = ' + max + ';');
	}

	// Logger
	log (message) {
		console.log('[BetterDiscord INF] ' + message);
		const d = new Date();
		const ds = ('00' + (d.getDate() + 1)).slice(-2) + '/' +
			('00' + d.getMonth()).slice(-2) + '/' +
			d.getFullYear() + ' ' +
			('00' + d.getHours()).slice(-2) + ':' +
			('00' + d.getMinutes()).slice(-2) + ':' +
			('00' + d.getSeconds()).slice(-2);
		logs += '[INF][' + ds + '] ' + message + eol;
	}

	err (err) {
		console.log('[BetterDiscord ERR] ' + err.message);
		const d = new Date();
		const ds = ('00' + (d.getDate() + 1)).slice(-2) + '/' +
			('00' + d.getMonth()).slice(-2) + '/' +
			d.getFullYear() + ' ' +
			('00' + d.getHours()).slice(-2) + ':' +
			('00' + d.getMinutes()).slice(-2) + ':' +
			('00' + d.getSeconds()).slice(-2);
		logs += '[ERR][' + ds + '] ' + err.message + eol;
	}

	warn (message) {
		console.log('[BetterDiscord WRN] ' + message);
		const d = new Date();
		const ds = ('00' + (d.getDate() + 1)).slice(-2) + '/' +
			('00' + d.getMonth()).slice(-2) + '/' +
			d.getFullYear() + ' ' +
			('00' + d.getHours()).slice(-2) + ':' +
			('00' + d.getMinutes()).slice(-2) + ':' +
			('00' + d.getSeconds()).slice(-2);
		logs += '[WRN][' + ds + '] ' + message + eol;
	}

	saveLogs (path) {
		try {
			_fs.writeFileSync(path + '/logs.log', logs);
		} catch (err) {}
	}

	// Execute javascript
	execJs (js) {
		this.getWebContents().executeJavaScript(js);
	}

	// Parse and execute javascript
	execJsParse (js) {
		this.execJs(js); // TODO
	}

	// Inject variable
	injectVar (variable, data) {
		this.execJs('var ' + variable + ' = "' + data + '";');
	}

	injectVarRaw (variable, data) {
		this.execJs('var ' + variable + ' = ' + data + ';');
	}

	// Alert
	alert (title, message) {
		let id = 'bdalert-';
		for (let i = 0; i < 5; i++) id += 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'.charAt(Math.floor(Math.random() * 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'.length));
		const bdAlert = '\
	<div id=\'' + id + '\' class=\'modal\' style=\'opacity:1\'>\
		<div class=\'modal-inner\'>\
			<div class=\'markdown-modal\'>\
				<div class=\'markdown-modal-header\'>\
					<strong style=\'float:left\'><span>BetterDiscord - </span><span>' + title + '</span></strong>\
					<span></span>\
					<button class=\'markdown-modal-close\' onclick=document.getElementById(\'' + id + '\').remove();></button>\
				</div>\
				<div class=\'scroller-wrap fade\'>\
					<div style=\'font-weight:700\' class=\'scroller\'>' + message + '</div>\
				</div>\
				<div class=\'markdown-modal-footer\'>\
					<span style=\'float:right\'> for support.</span>\
					<a style=\'float:right\' href=\'https://discord.gg/0Tmfo5ZbOR9NxvDd\' target=\'_blank\'>#support</a>\
					<span style=\'float:right\'>Join </span>\
				</div>\
			</div>\
		</div>\
	</div>\
	';

		this.execJs('document.body.insertAdjacentHTML(\'afterbegin\', "' + bdAlert + '");');
	}

	// Css internal style injector
	injectStylesheet (url) {
		const self = this;
		this.download(url, function (data) {
			const js = 'var style = document.createElement("style"); style.type = "text/css"; style.innerHTML = "' + data + '";';
			self.injectToElementByTag('head', js, 'style');
		});
	}

	injectStylesheetSync (url, callbackMessage) {
		this.execJs('$("head").append(" <link rel=\'stylesheet\' href=\'' + url + '\'> ");');
		this.sendIcpAsync(callbackMessage);
	}

	headStyleSheet (url) {
		this.execJs('(function() { var stylesheet = document.createElement("link"); stylesheet.type = "text/css"; document.getElementsByTagName("head")[0].appendChild(stylesheet); stylesheet.href = "' + url + '" })();');
	}

	injectJavaScriptSync (url, callbackMessage) {
		this.execJs(' (function() { var script = document.createElement("script"); script.type = "text/javascript"; script.onload = function() { betterDiscordIPC.send("asynchronous-message", "' + callbackMessage + '"); }; document.getElementsByTagName("body")[0].appendChild(script); script.src = "' + url + '"; })(); ');
	}

	injectJavaScript (url, jquery) {
		if (!jquery) {
			this.execJs('(function() { var script = document.createElement("script"); script.type = "text/javascript"; document.getElementsByTagName("body")[0].appendChild(script); script.src = "' + url + '"; })();');
		} else {
			this.execJs(' (function() { function injectJs() { var script = document.createElement("script"); script.type = "text/javascript"; document.getElementsByTagName("body")[0].appendChild(script); script.src = "' + url + '"; } function jqDefer() { if(window.jQuery) { injectJs(); }else{ setTimeout(function() { jqDefer(); }, 100) } } jqDefer(); })(); ');
		}
	}

	mkdirSync (path) {
		if (!_fs.existsSync(path)) {
			this.log('Directory ' + path + ' does not exist. Creating');
			_fs.mkdirSync(path);
		}
	}

	attemptSync (func, attempts, attempt, message, success, err) {
		const self = this;
		attempt = attempt || 0;
		attempt++;

		if (attempt > attempts) {
			err();

			return;
		}

		setTimeout(function () {
			if (!func()) {
				self.warn(message + ', retrying #' + attempt);
				self.try(func, attempts, attempt, message, success, err);

				return;
			}

			success();
		}, 1000);
	}

	attempt (func, attempts, attempt, message, success, err) {
		const self = this;
		attempt = attempt || 0;
		attempt++;

		if (attempt > attempts) {
			err();

			return;
		}

		setTimeout(function () {
			func(function (ok) {
				if (!ok) {
					self.warn(message + ', retrying #' + attempt);
					self.try(func, attempts, attempt, message, success, err);

					return;
				}
				success();
			});
		}, 1000);
	}

	openDir (path) {
		switch (process.platform) {
			case 'win32':
				require('child_process').exec('start "" "' + path + '"');
				break;
			case 'darwin':
				require('child_process').exec('open ' + path);
				break;
		}
	}
}

module.exports = Main;
