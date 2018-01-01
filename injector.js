#!/usr/bin/env node

'use strict';

let path = process.argv[2] || process.argv[1];

if (path === '-h' || path === '--help') path = console.log('It\'s DiscordMod asar injector.');

if (!path) return console.log('Usage:\n node injector.js /path/to/discord/resources/app.asar');

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
