'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _electron = require('electron');

var _electron2 = _interopRequireDefault(_electron);

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _url = require('url');

var _url2 = _interopRequireDefault(_url);

var _child_process = require('child_process');

var _child_process2 = _interopRequireDefault(_child_process);

var _bugsnag = require('bugsnag');

var _bugsnag2 = _interopRequireDefault(_bugsnag);

var _Backoff = require('./common/Backoff');

var _Backoff2 = _interopRequireDefault(_Backoff);

var _Settings = require('./common/Settings');

var _Settings2 = _interopRequireDefault(_Settings);

var _SplashWindow = require('./SplashWindow');

var _SplashWindow2 = _interopRequireDefault(_SplashWindow);

var _SystemTray = require('./SystemTray');

var _SystemTray2 = _interopRequireDefault(_SystemTray);

var _AppBadge = require('./AppBadge');

var _AppBadge2 = _interopRequireDefault(_AppBadge);

var _AppConfig = require('./AppConfig');

var _AppConfig2 = _interopRequireDefault(_AppConfig);

var _menu = require('./menu');

var _menu2 = _interopRequireDefault(_menu);

var _Modules = require('./common/Modules');

var _Modules2 = _interopRequireDefault(_Modules);

var _singleInstance = require('./singleInstance');

var _singleInstance2 = _interopRequireDefault(_singleInstance);

var _FeatureFlags = require('./common/FeatureFlags');

var _FeatureFlags2 = _interopRequireDefault(_FeatureFlags);

var _GPUSettings = require('./GPUSettings');

var _GPUSettings2 = _interopRequireDefault(_GPUSettings);

var _Paths = require('./common/Paths');

var _Paths2 = _interopRequireDefault(_Paths);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

global.__SDK__ = false;
global.buildInfo = require('./build_info.json');

_Paths2.default.init(global.buildInfo);

var releaseChannel = global.buildInfo.releaseChannel;
var discordVersion = global.buildInfo.version;
var app = _electron2.default.app,
    BrowserWindow = _electron2.default.BrowserWindow,
    crashReporter = _electron2.default.crashReporter,
    ipcMain = _electron2.default.ipcMain,
    Menu = _electron2.default.Menu,
    shell = _electron2.default.shell;

var APP_ID_BASE = 'com.squirrel.';
var DEFAULT_WIDTH = 1280;
var DEFAULT_HEIGHT = 720;
var MIN_VISIBLE_ON_SCREEN = 32;
var ACCOUNT_GREY = '#282b30';
var lastCrashed = 0;

app.setVersion(discordVersion);

global.mainWindowId = 0;
global.mainAppDirname = __dirname;
global.releaseChannel = releaseChannel;
global.crashReporterMetadata = {
  channel: releaseChannel
};
global.features = new _FeatureFlags2.default();
global.appSettings = new _Settings2.default(_Paths2.default.getUserData());
global.appSettings.migrateLegacySettings(_path2.default.join(_Paths2.default.getUserData(), 'discord_' + global.buildInfo.releaseChannel + '.json'));
global.appSettings.migrateLegacySettings(_path2.default.join(_Paths2.default.getUserData(), 'settings_' + global.buildInfo.releaseChannel + '.json'));

global.features.declareSupported('voice_in_renderer');
global.features.declareSupported('utils_in_renderer');

var MIN_WIDTH = global.appSettings.get('MIN_WIDTH', 940);
var MIN_HEIGHT = global.appSettings.get('MIN_HEIGHT', 500);

_GPUSettings2.default.init();

var rootCertificateAuthorities = void 0;
try {
  rootCertificateAuthorities = _fs2.default.readFileSync(_path2.default.join(__dirname, 'data', 'cacert.pem'));
} catch (e) {
  console.error('Unable to load root certificate authorities.', e);
}

global.requestCA = rootCertificateAuthorities ? { ca: rootCertificateAuthorities } : {};
_bugsnag2.default.register('261992831938f41f01ac83576bec95da', {
  appVersion: app.getVersion(),
  autoNotify: false,
  metaData: {
    channel: releaseChannel
  }
});

var mainWindow = null;
var notificationWindow = null;
var systemTray = null;
var appBadge = null;
var appConfig = null;
var appSettings = global.appSettings;
var splashWindow = null;
var modules = null;
var connectionBackoff = new _Backoff2.default(1000, 20000);

if (process.platform === 'linux') {
  // Some people are reporting audio problems on Linux that are fixed by setting
  // an environment variable PULSE_LATENCY_MSEC=30 -- the "real" fix is to see
  // what conditions require this and set this then (also to set it directly in
  // our webrtc setup code rather than here) but this should fix the bug for now.
  if (process.env.PULSE_LATENCY_MSEC === undefined) {
    process.env.PULSE_LATENCY_MSEC = 30;
  }

  var XDG_CURRENT_DESKTOP = process.env.XDG_CURRENT_DESKTOP || 'unknown';
  var GDMSESSION = process.env.GDMSESSION || 'unknown';
  global.crashReporterMetadata['wm'] = XDG_CURRENT_DESKTOP + ',' + GDMSESSION;
  try {
    global.crashReporterMetadata['distro'] = _child_process2.default.execFileSync('lsb_release', ['-ds'], { timeout: 100, maxBuffer: 512, encoding: 'utf-8' }).trim();
  } catch (e) {} // just in case lsb_release doesn't exist
}

function configureCrashReporter(extras) {
  extras = extras || {};
  _bugsnag2.default.metaData = _extends({}, _bugsnag2.default.metaData, { extras: extras });
  var extra = _extends({}, global.crashReporterMetadata, extras);
  crashReporter.start({
    productName: 'Discord',
    companyName: 'Discord Inc.',
    submitURL: 'http://crash.discordapp.com:1127/post',
    autoSubmit: true,
    ignoreSystemCrashHandler: false,
    extra: extra
  });
}

function setupNotificationWindow(mainWindow, appID) {
  var NotificationWindow = require('./NotificationWindow');
  if (!notificationWindow) {
    notificationWindow = new NotificationWindow(mainWindow, {
      title: 'Discord Notifications',
      maxVisible: 5,
      screenPosition: 'bottom',
      appID: appID
    });

    notificationWindow.on('notification-click', function () {
      setWindowVisible(true, true);
    });
  }
  notificationWindow.mainWindow = mainWindow;
}

function setupSystemTray() {
  if (systemTray == null) {
    systemTray = new _SystemTray2.default({
      onCheckForUpdates: function onCheckForUpdates() {
        return modules.checkForUpdates();
      },
      onTrayClicked: function onTrayClicked() {
        return setWindowVisible(true, true);
      },
      onOpenVoiceSettings: openVoiceSettings,
      onToggleMute: toggleMute,
      onToggleDeafen: toggleDeafen,
      appSettings: appSettings
    });
  }
}

function setupAppBadge() {
  // the AppBadge class may be null if not in the right environment
  if (appBadge == null && _AppBadge2.default != null) {
    appBadge = new _AppBadge2.default();
  }
}

function setupAppConfig() {
  if (appConfig == null) {
    appConfig = new _AppConfig2.default({
      appSettings: appSettings
    });
  }
}

function initModules(endpoint) {
  modules = new _Modules2.default(endpoint, global.appSettings, global.buildInfo);
  var updaterState = 'UPDATE_NOT_AVAILABLE';
  modules.on('checking-for-updates', function () {
    updaterState = 'CHECKING_FOR_UPDATES';
    webContentsSend(updaterState);
  });
  modules.on('update-check-finished', function (succeeded, updateCount, manualRequired) {
    if (!succeeded) {
      updaterState = 'UPDATE_NOT_AVAILABLE';
      webContentsSend('UPDATE_ERROR');
      return;
    }

    if (updateCount === 0) {
      updaterState = 'UPDATE_NOT_AVAILABLE';
    } else if (manualRequired) {
      updaterState = 'UPDATE_MANUALLY';
    } else {
      updaterState = 'UPDATE_AVAILABLE';
    }
    webContentsSend(updaterState);
  });
  modules.on('downloading-module-progress', function (name, progress) {
    if (mainWindow) {
      mainWindow.setProgressBar(progress);
    }
    webContentsSend('MODULE_INSTALL_PROGRESS', name, progress);
  });
  modules.on('downloading-modules-finished', function (succeeded, failed) {
    if (mainWindow) {
      mainWindow.setProgressBar(-1);
    }

    if (updaterState == 'UPDATE_AVAILABLE') {
      if (failed > 0) {
        updaterState = 'UPDATE_NOT_AVAILABLE';
        webContentsSend('UPDATE_ERROR');
      } else {
        updaterState = 'UPDATE_DOWNLOADED';
        webContentsSend(updaterState);
      }
    }
  });
  modules.on('installed-module', function (name, current, total, succeeded) {
    if (mainWindow) {
      mainWindow.setProgressBar(-1);
    }
    webContentsSend('MODULE_INSTALLED', name, succeeded);
  });

  ipcMain.on('CHECK_FOR_UPDATES', function () {
    if (updaterState === 'UPDATE_NOT_AVAILABLE') {
      modules.checkForUpdates();
    } else {
      webContentsSend(updaterState);
    }
  });
  ipcMain.on('QUIT_AND_INSTALL', function () {
    saveWindowConfig(mainWindow);
    mainWindow = null;
    modules.quitAndInstallUpdates();
  });
  ipcMain.on('MODULE_INSTALL', function (_event, name) {
    modules.install(name);
  });
  ipcMain.on('MODULE_QUERY', function (_event, name) {
    webContentsSend('MODULE_INSTALLED', name, modules.isInstalled(name));
  });
}

function saveWindowConfig(browserWindow) {
  try {
    if (!browserWindow) {
      return;
    }

    appSettings.set('IS_MAXIMIZED', browserWindow.isMaximized());
    appSettings.set('IS_MINIMIZED', browserWindow.isMinimized());
    if (!appSettings.get('IS_MAXIMIZED') && !appSettings.get('IS_MINIMIZED')) {
      appSettings.set('WINDOW_BOUNDS', browserWindow.getBounds());
    }

    appSettings.save();
  } catch (e) {
    console.error(e);
  }
}

function doAABBsOverlap(a, b) {
  var ax1 = a.x + a.width;
  var bx1 = b.x + b.width;
  var ay1 = a.y + a.height;
  var by1 = b.y + b.height;
  // clamp a to b, see if it is non-empty
  var cx0 = a.x < b.x ? b.x : a.x;
  var cx1 = ax1 < bx1 ? ax1 : bx1;
  if (cx1 - cx0 > 0) {
    var cy0 = a.y < b.y ? b.y : a.y;
    var cy1 = ay1 < by1 ? ay1 : by1;
    if (cy1 - cy0 > 0) {
      return true;
    }
  }
  return false;
}

function loadWindowConfig(mainWindowOptions) {
  if (!appSettings.get('WINDOW_BOUNDS')) {
    mainWindowOptions.center = true;
    return;
  }

  var bounds = appSettings.get('WINDOW_BOUNDS');
  bounds.width = Math.max(MIN_WIDTH, bounds.width);
  bounds.height = Math.max(MIN_HEIGHT, bounds.height);

  var isVisibleOnAnyScreen = false;
  var screen = _electron2.default.screen;
  var displays = screen.getAllDisplays();
  displays.forEach(function (display) {
    if (isVisibleOnAnyScreen) {
      return;
    }
    var displayBound = display.workArea;
    displayBound.x += MIN_VISIBLE_ON_SCREEN;
    displayBound.y += MIN_VISIBLE_ON_SCREEN;
    displayBound.width -= 2 * MIN_VISIBLE_ON_SCREEN;
    displayBound.height -= 2 * MIN_VISIBLE_ON_SCREEN;
    isVisibleOnAnyScreen = doAABBsOverlap(bounds, displayBound);
  });

  if (isVisibleOnAnyScreen) {
    mainWindowOptions.width = bounds.width;
    mainWindowOptions.height = bounds.height;
    mainWindowOptions.x = bounds.x;
    mainWindowOptions.y = bounds.y;
  } else {
    mainWindowOptions.center = true;
  }
}

function webContentsSend() {
  if (mainWindow != null && mainWindow.webContents != null) {
    var _mainWindow$webConten;

    (_mainWindow$webConten = mainWindow.webContents).send.apply(_mainWindow$webConten, arguments);
  }
}

function extractPath(args, fallbackPath) {
  if (args[0] === '--url') {
    var parsedURL = _url2.default.parse(args[1]);
    if (parsedURL.protocol === 'discord:') {
      return parsedURL.path;
    }
  }
  return fallbackPath;
}

function setWindowVisible(isVisible, andUnminimize) {
  if (mainWindow == null) {
    return;
  }

  if (isVisible) {
    if (andUnminimize || !mainWindow.isMinimized()) {
      mainWindow.show();
      webContentsSend('MAIN_WINDOW_FOCUS');
    }
  } else {
    webContentsSend('MAIN_WINDOW_BLUR');
    mainWindow.hide();
    if (systemTray) {
      systemTray.displayHowToCloseHint();
    }
  }

  mainWindow.setSkipTaskbar(!isVisible);
}

function openVoiceSettings() {
  setWindowVisible(true, true);
  webContentsSend('SYSTEM_TRAY_OPEN_VOICE_SETTINGS');
}

function toggleMute() {
  webContentsSend('SYSTEM_TRAY_TOGGLE_MUTE');
}

function toggleDeafen() {
  webContentsSend('SYSTEM_TRAY_TOGGLE_DEAFEN');
}

function capitalizeFirstLetter(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function isSafeToSuppress(error) {
  return (/attempting to call a function in a renderer window/i.test(error.message)
  );
}

function generateGroupingHash(error) {
  var stripWindowsPathRegex = /\\?\\?\??\\?(?:[a-zA-Z]+\:+\\+.*).*\b/g;
  var stripFunctionReferenceRegex = /Function provided here: .*/g;

  var groupingHash = error.message || '';
  groupingHash = groupingHash.replace(stripWindowsPathRegex, '');
  groupingHash = groupingHash.replace(stripFunctionReferenceRegex, '');
  return groupingHash;
}

function main() {
  var appName = 'Discord' + (releaseChannel === 'stable' ? '' : capitalizeFirstLetter(releaseChannel));
  console.log(appName + ' ' + app.getVersion());

  configureCrashReporter();

  ipcMain.on('UPDATE_CRASH_REPORT', function (_event, extras) {
    configureCrashReporter(extras);
  });

  var appID = APP_ID_BASE + appName + '.' + appName;

  if (process.platform === 'win32') {
    // this tells Windows (in particular Windows 10) which icon to associate your app with, important for correctly
    // pinning app to task bar.
    app.setAppUserModelId(appID);

    var _require = require('./SquirrelUpdate'),
        handleStartupEvent = _require.handleStartupEvent;

    var squirrelCommand = process.argv[1];
    if (handleStartupEvent('Discord', app, squirrelCommand)) {
      return;
    }
  }

  process.on('uncaughtException', function (error) {
    var stack = error.stack ? error.stack : error.name + ': ' + error.message;
    var message = 'Uncaught exception:\n ' + stack;
    console.warn(message);
    _bugsnag2.default.notify(error, { groupingHash: generateGroupingHash(error) });

    if (!isSafeToSuppress(error)) {
      _electron2.default.dialog.showErrorBox('A JavaScript error occurred in the main process', message);
    }
  });

  var getWebappEndpoint = function getWebappEndpoint() {
    var endpoint = appSettings.get('WEBAPP_ENDPOINT');
    if (!endpoint) {
      if (releaseChannel === 'stable') {
        endpoint = 'https://discordapp.com';
      } else {
        endpoint = 'https://' + releaseChannel + '.discordapp.com';
      }
    }
    return endpoint;
  };

  var API_ENDPOINT = appSettings.get('API_ENDPOINT') || 'https://discordapp.com/api';
  var WEBAPP_ENDPOINT = getWebappEndpoint();
  var UPDATE_ENDPOINT = appSettings.get('UPDATE_ENDPOINT') || API_ENDPOINT;

  var appPath = extractPath(process.argv.slice(1), '/activity');
  var WEBAPP_PATH = appSettings.get('WEBAPP_PATH') || appPath + '?_=' + Date.now();

  var urlToLoad = '' + WEBAPP_ENDPOINT + WEBAPP_PATH;
  var lastPageLoadFailed = false;
  var loadMainPage = function loadMainPage() {
    lastPageLoadFailed = false;
    mainWindow.loadURL(urlToLoad);
  };
  var insideAuthFlow = false;

  app.on('open-url', function (event, openURL) {
    var parsedURL = _url2.default.parse(openURL);
    if (parsedURL.protocol === 'discord:') {
      if (mainWindow == null) {
        appPath = parsedURL.path;
      } else {
        webContentsSend('PATH', parsedURL.path);
      }
    } else if (parsedURL.protocol === 'steam:') {
      shell.openExternal(openURL);
    }
  });

  app.on('menu:open-help', function () {
    return webContentsSend('HELP_OPEN');
  });
  app.on('menu:open-settings', function () {
    return webContentsSend('USER_SETTINGS_OPEN');
  });
  app.on('menu:check-for-updates', function () {
    return modules.checkForUpdates();
  });

  app.on('before-quit', function () {
    saveWindowConfig(mainWindow);
    mainWindow = null;
    if (notificationWindow != null) {
      notificationWindow.close();
    }
  });

  app.on('gpu-process-crashed', function (e, killed) {
    if (killed) {
      app.quit();
    }
  });

  function launchMainAppWindow(isVisible) {
    // want to be able to re-run this and set things up again
    if (mainWindow) {
      // message here?
      mainWindow.destroy();
    }

    var mainWindowOptions = {
      title: 'Discord',
      backgroundColor: ACCOUNT_GREY,
      width: DEFAULT_WIDTH,
      height: DEFAULT_HEIGHT,
      minWidth: MIN_WIDTH,
      minHeight: MIN_HEIGHT,
      transparent: false,
      frame: false,
      resizable: true,
      show: isVisible,
      webPreferences: {
        blinkFeatures: 'EnumerateDevices,AudioOutputDevices'
      }
    };

    if (process.platform === 'linux') {
      mainWindowOptions.icon = _path2.default.join(_path2.default.dirname(app.getPath('exe')), 'discord.png');
      mainWindowOptions.frame = true;
    }

    loadWindowConfig(mainWindowOptions);

    mainWindow = new BrowserWindow(mainWindowOptions);
    global.mainWindowId = mainWindow.id;

    mainWindow.setMenuBarVisibility(false);

    if (appSettings.get('IS_MAXIMIZED')) {
      mainWindow.maximize();
    }

    if (appSettings.get('IS_MINIMIZED')) {
      mainWindow.minimize();
    }

    mainWindow.webContents.on('new-window', function (e, windowURL) {
      e.preventDefault();
      shell.openExternal(windowURL);
    });

    mainWindow.webContents.on('did-fail-load', function (e, errCode, errDesc) {
      if (insideAuthFlow) {
        return;
      }

      lastPageLoadFailed = true;
      console.error('[WebContents] did-fail-load', errCode, errDesc, 'retry in ' + connectionBackoff.current + ' ms');
      connectionBackoff.fail(function () {
        console.log('[WebContents] retrying load', urlToLoad);
        loadMainPage();
      });
    });

    mainWindow.webContents.on('did-finish-load', function () {
      if (insideAuthFlow && mainWindow.webContents && mainWindow.webContents.getURL().startsWith(WEBAPP_ENDPOINT)) {
        insideAuthFlow = false;
      }

      webContentsSend(mainWindow.isFocused() ? 'MAIN_WINDOW_FOCUS' : 'MAIN_WINDOW_BLUR');
      if (!lastPageLoadFailed) {
        connectionBackoff.succeed();
        if (splashWindow) {
          splashWindow.pageReady();
        }
      }
    });

    mainWindow.webContents.on('crashed', function (e, killed) {
      if (killed) {
        app.quit();
        return;
      }

      // if we just crashed under 5 seconds ago, we are probably in a loop, so just die.
      var crashTime = Date.now();
      if (crashTime - lastCrashed < 5 * 1000) {
        app.quit();
        return;
      }
      lastCrashed = crashTime;
      console.error('[WebContents] crashed... reloading');
      launchMainAppWindow(true);
    });

    mainWindow.webContents.on('dom-ready', function () {});

    // Prevent navigation when links or files are dropping into the app, turning it into a browser.
    // https://github.com/discordapp/discord/pull/278
    mainWindow.webContents.on('will-navigate', function (evt, url) {
      if (!insideAuthFlow && !url.startsWith(WEBAPP_ENDPOINT)) {
        evt.preventDefault();
      }
    });

    mainWindow.webContents.on('did-get-redirect-request', function (event, oldUrl, newUrl) {
      if (oldUrl.startsWith(WEBAPP_ENDPOINT) && newUrl.startsWith('https://accounts.google.com/')) {
        insideAuthFlow = true;
      }
    });

    mainWindow.on('focus', function () {
      webContentsSend('MAIN_WINDOW_FOCUS');
    });

    mainWindow.on('blur', function () {
      webContentsSend('PURGE_MEMORY');
      webContentsSend('MAIN_WINDOW_BLUR');
    });

    mainWindow.on('page-title-updated', function (e, title) {
      if (mainWindow === null) {
        return;
      }
      e.preventDefault();
      if (!title.endsWith('Discord')) {
        title += ' - Discord';
      }
      mainWindow.setTitle(title);
    });

    mainWindow.on('leave-html-full-screen', function () {
      // fixes a bug wherein embeded videos returning from full screen cause our menu to be visible.
      mainWindow.setMenuBarVisibility(false);
    });

    if (process.platform === 'win32') {
      setupNotificationWindow(mainWindow, appID);
    }

    setupSystemTray();
    setupAppBadge();
    setupAppConfig();

    if (process.platform === 'linux' || process.platform === 'win32') {
      systemTray.show();

      mainWindow.on('close', function (e) {
        if (mainWindow === null) {
          // this means we're quitting
          return;
        }

        // Save our app settings
        saveWindowConfig(mainWindow);

        // Quit app if that's the setting
        if (!appSettings.get('MINIMIZE_TO_TRAY', true)) {
          app.quit();
          return;
        }

        // Minimize to tray
        webContentsSend('MAIN_WINDOW_BLUR');
        setWindowVisible(false);
        e.preventDefault();
      });
    }

    loadMainPage();
  }

  var startApp = function startApp() {
    var startMinimized = (process.argv || []).indexOf('--start-minimized') !== -1;
    initModules(UPDATE_ENDPOINT);
    splashWindow = new _SplashWindow2.default(modules, startMinimized);
    splashWindow.once(_SplashWindow2.default.EVENT_APP_SHOULD_LAUNCH, function () {
      return launchMainAppWindow(false);
    });
    splashWindow.once(_SplashWindow2.default.EVENT_APP_SHOULD_SHOW, function () {
      return setWindowVisible(!startMinimized);
    });
  };

  app.on('ready', function () {
    Menu.setApplicationMenu(_menu2.default);

    if (process.argv.slice(1).includes('--multi-instance')) {
      startApp();
    } else {
      _singleInstance2.default.create(startApp, function (args) {
        if (args != null && args.length > 0 && args[0] === '--squirrel-uninstall') {
          app.quit();
          return;
        }

        if (mainWindow != null) {
          appPath = extractPath(args);
          if (appPath != null) {
            webContentsSend('PATH', appPath);
          }
          setWindowVisible(true, false);
          mainWindow.focus();
        } else if (splashWindow != null) {
          splashWindow.focus();
        }
      });
    }
  });
}

main();
