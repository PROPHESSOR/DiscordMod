# DiscordMod
TODO: Translate to English

## Что это?
DiscordMod - аналог Better Discord, позволяющий расширять возможности Discord с помощью модулей и тем оформления.

## Как установить DiscordMod?

DiscordMod не устанавливается, а вшивается в Discord.
Не волнуйтесь, сохраняется резервная копия и вы в любой момент сможете вернуть Discord прежний вид ;)

Итак, для установки DiscordMod вам понадобится (https://nodejs.org)[Node.JS].

После установки Node.JS для вашей платформы, скачайте и распакуйте (https://github.com/PROPHESSOR/DiscordMod/archive/injector.zip)[последнюю версию injector'а].

Далее выполните команды в папке, куда распаковали injector:
```
npm i #Инициализация
node injector.js путь_к_asar_файлу```

Путь к asar файлу зависит от операционной системы, вот несколько примеров:
 - Windows: C:/Program Files/Discord/resources/app.asar
 - Linux (Ubuntu): /usr/share/discord/resources/app.asar
 - Linux (Arch): /opt/discord/resources/app.asar
 
Перезагрузите Discord

Всё, DiscordMod установлен! ;)

## Куда устанавливать модули?

 - Windows: %AppData%/DiscordMod/modules
 - Linux: ~/.config/DiscordMod/modules
 
## Лайфхак
Воспользуйтесь поиском, если не можете найти одну из этих папок ;)
