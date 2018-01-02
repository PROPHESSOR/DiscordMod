#!/usr/bin/env node
//    Copyright 2018 prophessor
//
//    Licensed under the Apache License, Version 2.0 (the "License");
//    you may not use this file except in compliance with the License.
//    You may obtain a copy of the License at
//
//        http://www.apache.org/licenses/LICENSE-2.0
//
//    Unless required by applicable law or agreed to in writing, software
//    distributed under the License is distributed on an "AS IS" BASIS,
//    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//    See the License for the specific language governing permissions and
//    limitations under the License.


'use strict';

let path = './app.asar';// process.argv[2] || process.argv[1];

if (path === '-h' || path === '--help') path = console.log('It\'s DiscordMod asar injector.');

if (!path) return console.log('Usage:\n node injector.js /path/to/discord/resources/app.asar');

const MD5 = '143853f0c8e97d5f668a074d9976cab9';

const TMP_FOLDER = 'origin2';

/** Алгоритм
 * 1. Скачиваем последний билд
 * 2. Распаковываем во временную папку
 * 3. Бэкапим оригинальный asar файл
 * 4. Распаковываем оригинальный asar файл
 * 5. Заменяем файлы на файлы билда
 * 6. Инжектим код в index.js (пока можно просто заменить index.js)
 * 7. Упаковываем этот мусор в asar
 * 8. Помещаем asar на место оригинала
 */

const asar = require('asar');
const fs = require('fs');
const md5 = require('md5');
const diff = require('diff');

if (md5(fs.readFileSync(path)) !== MD5) return console.log('Download the latest version of Discord and the DiscordMod to continue!');

fs.copyFileSync(path, `${path}_`); //* 3. Бэкапим оригинальный asar файл

asar.extractAll(path, TMP_FOLDER); //* 4. Распаковываем оригинальный asar файл

/*
 * 5. Заменяем файлы на файлы билда
 * 6. Инжектим код в index.js (пока можно просто заменить index.js)
*/
diff.applyPatches(fs.readFileSync('./discordMod.patch', 'utf8'), {
	loadFile: (index, callback) => {
		fs.readFile(`${TMP_FOLDER}/${index.oldFileName.split('/').slice(1).join('/')}`, 'utf8', callback);
	},
	complete (err) {
		if (err) throw err;
	},
	patched (index, data, callback) {
		fs.writeFile(`${TMP_FOLDER}/${index.newFileName.split('/').slice(1).join('/')}`, data, callback);
	}
});

/*
 * 7. Упаковываем этот мусор в asar
 * 8. Помещаем asar на место оригинала
*/
asar.createPackage(TMP_FOLDER, path);
// fs.rmdirSync(TMP_FOLDER);

// asar.createPackage(path, 'her.asar');
