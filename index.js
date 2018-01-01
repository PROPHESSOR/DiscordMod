/* Discord MOD API
 * Version: 0.1
 * Author: PROPHESSOR: github.com/PROPHESSOR
 * https://github.com/PROPHESSOR/DiscordModAPI
 */

'use strict';

/*
 * Utils
 * Original code from BetterDiscordApp
 * https://github.com/Jiiks/BetterDiscordApp
 * Modded by PROPHESSOR
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const electron = require('electron');

const eol = require('os').EOL;
let logs = '';

const modules = [];

const Config = {
	appDataFolder: electron.app.getPath('appData'),
	moduleFolder: `${electron.app.getPath('appData')}/DiscordMod/modules`
};

class Utils {

	constructor (mainWindow) {
		this.mainWindow = mainWindow;
	}

	getMainWindow () {
		return this.mainWindow;
	}

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
		this.download('api.github.com', String('/repos/Jiiks/DiscordModApp/commits/' + branch), function (data) {
			callback(JSON.parse(data).sha);
		});
	}

	sendIcpAsync (message) {
		this.execJs('DiscordModIPC.send("asynchronous-message", "' + message + '");');
	}

	// Get Webcontents
	getWebContents () {
		return this.mainWindow.webContents;
	}

	// Js logger
	jsLog (message, type = 'log') {
		this.execJs(`console.${type}("DiscordMod: ${message}");`);
	}

	updateLoading (message, cur, max) {
		this.log(message);
		this.execJs('document.getElementById("bd-status").innerHTML = "DiscordMod - ' + message + ' : ";');
		this.execJs('document.getElementById("bd-pbar").value = ' + cur + ';');
		this.execJs('document.getElementById("bd-pbar").max = ' + max + ';');
	}

	// Logger
	log (message) {
		console.log('[DiscordMod INF] ' + message);
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
		console.log('[DiscordMod ERR] ' + err.message);
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
		console.log('[DiscordMod WRN] ' + message);
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
			fs.writeFileSync(path + '/logs.log', logs);
		} catch (err) {}
	}

	// Execute javascript
	execJs (js) {
		this.getWebContents().executeJavaScript(js);
	}

	// Parse and execute javascript
	execJsParse (js) {
		this.execJs(js); // TODO:
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
		let id = 'dmalert-';
		for (let i = 0; i < 5; i++) id += 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'.charAt(Math.floor(Math.random() * 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'.length));
		const dmAlert = `
	<div id="${id}" class="modal" style="opacity:1">
		<div class="modal-inner">
			<div class="markdown-modal">
				<div class="markdown-modal-header">
					<strong style="float:left">
						<span>DiscordMod - </span><span>${title}</span>
					</strong>
					<span></span>
					<button class="markdown-modal-close" onclick=document.getElementById("${id}").remove();></button>
				</div>
				<div class="scroller-wrap fade">
					<div style="font-weight:700" class="scroller">${message}</div>
				</div>
				<div class="markdown-modal-footer">
					<span style="float:right">You can support our project!</span>
					<a style="float:right" href="https://streamlabs.com/prophessor" target="_blank">Donate</a>
				</div>
			</div>
		</div>
	</div>
	`.replace(/[	\n]/g, '');

		this.execJs(`document.body.insertAdjacentHTML('afterbegin', \`${dmAlert}\`);`);
		// this.jsLog(`document.body.innerHTML += '${bdAlert}';`);
		// console.log(`document.body.innerHTML += '${bdAlert}';`);
	}

	// Css internal style injector
	injectStylesheet (url) {
		// const self = this; TODO: Check
		this.download(url, (data) => {
			const js = 'var style = document.createElement("style"); style.type = "text/css"; style.innerHTML = "' + data + '";';
			this.injectToElementByTag('head', js, 'style');
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
		this.execJs(' (function() { var script = document.createElement("script"); script.type = "text/javascript"; script.onload = function() { DiscordModIPC.send("asynchronous-message", "' + callbackMessage + '"); }; document.getElementsByTagName("body")[0].appendChild(script); script.src = "' + url + '"; })(); ');
	}

	injectJavaScript (url, jquery) {
		if (jquery) {
			this.execJs(' (function() { function injectJs() { var script = document.createElement("script"); script.type = "text/javascript"; document.getElementsByTagName("body")[0].appendChild(script); script.src = "' + url + '"; } function jqDefer() { if(window.jQuery) { injectJs(); }else{ setTimeout(function() { jqDefer(); }, 100) } } jqDefer(); })(); '); // FIXME: ШТАБЛИН?
		} else {
			this.execJs('(function() { var script = document.createElement("script"); script.type = "text/javascript"; document.getElementsByTagName("body")[0].appendChild(script); script.src = "' + url + '"; })();');
		}
	}

	mkdirSync (path) {
		if (!fs.existsSync(path)) {
			this.log('Directory ' + path + ' does not exist. Creating');
			fs.mkdirSync(path);
		}
	}

	attemptSync (func, attempts, attempt, message, success, err) {
		// const self = this; TODO: Check
		attempt = attempt || 0;
		attempt++;

		if (attempt > attempts) {
			err();

			return;
		}

		setTimeout(() => {
			if (!func()) {
				this.warn(message + ', retrying #' + attempt);
				this.try(func, attempts, attempt, message, success, err);

				return;
			}

			success();
		}, 1000);
	}

	attempt (func, attempts, attempt, message, success, err) {
		// const self = this; TODO: Check
		attempt = attempt || 0;
		attempt++;

		if (attempt > attempts) {
			err();

			return;
		}

		setTimeout(() => {
			func((ok) => {
				if (!ok) {
					this.warn(message + ', retrying #' + attempt);
					this.try(func, attempts, attempt, message, success, err);

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
			default:
				console.error(`DiscordMod->openDir: Can't open dir ${path} into your os ${process.platform}!`);
		}
	}
}

class Module {
	/*
	 * TODO: Normalize path
	 * TODO: -> Windows support
	 * TODO: Logger
	 * TODO: Async
	 *
	*/

	constructor (folder) {
		if (!folder) throw new Error('DiscordMod->Module: Error: folder is not defined!');

		const module_json = `${Config.moduleFolder}/${folder}/module.json`;

		let moduleData = null;
		try {
			moduleData = require(module_json);
		} catch (e) {
			throw new Error(`Module in the folder ${module_json} doesn't exist!`);
		}

		this.modulename = moduleData.name || 'name';
		this.author = moduleData.author || 'author';
		this.description = moduleData.description || 'description';
		this.url = moduleData.url || 'url';
		this.type = moduleData.type || 'type';
		this.main = moduleData.main || 'main';
		this.folder = folder;
		this.fullfolder = `${Config.moduleFolder}/${folder}`;
	}

	start (dmodMain) {
		if (this.type === 'backend') {
			const content = fs.readFileSync(`${this.fullfolder}/${this.main}`); // TODO: Async
			try {
				return eval(`(function(__Main, __Utils, __Module){${content.toString()}})(dmodMain, dmodMain.utils, Module);`); //eslint-disable-line
			} catch (e) {
				console.error(e);

				return e;
			}
		} else if (this.type === 'frontend') {
			const content = fs.readFileSync(`${this.fullfolder}/${this.main}`); // TODO: Async
			dmodMain.utils.execJs(content.toString());
		} else {
			throw new Error(`Unknown module type ${this.type}`);
		}
	}

	static loadModules (dmodMain) {
		const modules_json = `${Config.moduleFolder}/modules.json`;
		if (!fs.existsSync(modules_json)) return console.warn(`DiscordMod->loadModules: Can't open ${modules_json}! Abort.`);

		let _modules; //eslint-disable-line
		try {
			_modules = require(modules_json);
		} catch (e) {
			console.error(e);

			return console.warn(`DiscordMod->loadModules: Can't open ${modules_json}! Abort.`);
		}

		for (const _module of _modules) {
			try {
				modules.push(new Module(_module));
				console.log(`DiscordMod: Loaded module from ${_module}`); // TODO: Logger
			} catch (e) {
				console.error(`DiscordMod->loadModules: Can't load module ${_module}; ${e}`);
			}
		}

		console.log(`DiscordMod: Loaded ${modules.length} modules!`);

		for (const _module of modules) {
			try {
				_module.start(dmodMain);
				console.log(`DiscordMod: Started module ${_module.modulename}`); // TODO: Logger
			} catch (e) {
				console.error(`DiscordMod->loadModules: Can't start module ${_module.modulename}; ${e}`);
			}
		}

		console.log('DiscordMod: Modules started successful!');
	}
}

class Main extends require('events') {
	constructor (mainWindow) {
		if (!mainWindow) return console.error('DiscordMod kernel panic! Code: 1');
		super();
		this.test();
		this.mainWindow = mainWindow;
		this.utils = new Utils(mainWindow);
		this.Utils = Utils;

		this.init();

		Main.child = this;

		Module.loadModules(this);
	}

	test () {
		// console.log(Config.moduleFolder);
	}

	init () {

		this.utils.jsLog('Loading Resource (jQuery)', 0, 100);
		this.utils.injectJavaScriptSync('//ajax.googleapis.com/ajax/libs/jquery/2.0.0/jquery.min.js', 'load-jQueryCookie');
		this.utils.jsLog('DiscordMod installed!');
		console.log('DiscordMod installed!');
	}

	/** Добавляет пункт DiscordMod в настройки
	 * @returns {undefined} void
	 */
	injectSettings () {
		// this.utils.
	}

	/** Выполняет код от имени DiscordMod. Для теста API!
	 * @param  {string} code - JavaScript код
	 * @returns {*} Результат eval, или ошибка
	 */
	eval (code) {
		try {
			return eval(code); //eslint-disable-line
		} catch (e) {
			return e;
		}
	}
}

Main.Utils = Utils;
Main.Module = Module;

module.exports = Main;
