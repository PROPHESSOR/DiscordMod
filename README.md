# [WIP] Discord Mod

Если коротко:

1. core.js - Запускается в главном процессе Electron и инжектит client.js в WebView Discord'а
2. client.js - Запускается в WebView окна Discord'а, имеет доступ к window, document, etc.
3. package.json - Указывает Electron'у запускать core.js до самого Discord'а

## Установка (пока только Linux, виндузятники, кидайте PR):

```sh
npm run inject
```

> Линкует текущую папку в /usr/share/discord/resources/app

## Удаление:

```sh
npm run uninstall
```

> Удаляет ссылку в /usr/share/discord/resources/app