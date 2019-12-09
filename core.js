// /usr/share/discord/resources/app/core.js
// /usr/share/discord/resources/app/package.json
// /usr/share/discord/resources/app/client.js

const DEBUG = false; // Verbose

const fs = require('fs');
const path = require('path');
const electron = require('electron');

// Launch Discord
{
    const Module = require('module');
    const basePath = '/usr/share/discord/resources/app.asar'; // __dirname не работает из-за символической ссылки
    electron.app.getAppPath = () => basePath;
    Module._load(basePath, null, true);
}

electron.app.on('web-contents-created', ev => {
	return filterUpdaterWindow();
});

function filterUpdaterWindow() {
	if (DEBUG) console.log('filterUpdaterWindow');
	const all = electron.webContents.getAllWebContents().filter(x => x.getTitle() === 'Discord Updater');

	if (all.length) {
		if (DEBUG) console.log('Found Updater Window');
		const [a] = all;
		a.on('destroyed', () => filterDiscordWindow());
	}
}

function filterDiscordWindow() {
	if (DEBUG) console.log('filterDiscordWindow');
	const all = electron.webContents.getAllWebContents().filter(x => x.getTitle() === 'Discord');

	if (all.length) {
		if (DEBUG) console.log('Found Discord Window');
		const [a] = all;
        a.executeJavaScript(fs.readFileSync(path.join(__dirname, 'client.js'), 'utf-8'));
        console.info('[DiscordMod] Injected! :)');
	}
}
