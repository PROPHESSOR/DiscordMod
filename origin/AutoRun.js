'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _electron = require('electron');

var _WindowsSystem = require('./WindowsSystem.js');

var _WindowsSystem2 = _interopRequireDefault(_WindowsSystem);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var NOOP = function NOOP() {};

var autoRun = {
  update: NOOP,
  install: NOOP,
  isAutoRunning: NOOP,
  clear: NOOP
};

var appName = _path2.default.basename(process.execPath, '.exe');

if (process.platform === 'win32') {
  autoRun.install = function (callback) {
    var startMinimized = global.appSettings.get('START_MINIMIZED', false);
    var _process = process,
        execPath = _process.execPath;

    if (startMinimized) {
      execPath = execPath + ' --start-minimized';
    }
    var queue = [['HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run', '/v', appName, '/d', execPath]];
    _WindowsSystem2.default.addToRegistry(queue, callback);
  };

  autoRun.update = function (callback) {
    autoRun.isAutoRunning(function (willRun) {
      if (willRun) {
        autoRun.install(callback);
      } else {
        callback();
      }
    });
  };

  autoRun.isAutoRunning = function (callback) {
    var queryValue = ['HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run', '/v', appName];
    queryValue.unshift('query');
    _WindowsSystem2.default.spawnReg(queryValue, function (error, stdout) {
      var doesOldKeyExist = stdout.indexOf(appName) >= 0;
      callback(doesOldKeyExist);
    });
  };

  autoRun.clear = function (callback) {
    var queryValue = ['HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run', '/v', appName, '/f'];
    queryValue.unshift('delete');
    _WindowsSystem2.default.spawnReg(queryValue, function (error, stdout) {
      callback();
    });
  };
} else if (process.platform === 'linux') {
  var ensureDir = function ensureDir() {
    try {
      _fs2.default.mkdirSync(autostartDir);
      return true;
    } catch (e) {
      // catch for when it already exists.
    }
    return false;
  };

  var writeStartupFile = function writeStartupFile(enabled, callback) {
    ensureDir();
    var desktopFile = desktopFileBase + ('X-GNOME-Autostart-enabled=' + enabled + '\n');
    try {
      _fs2.default.writeFile(autostartFileName, desktopFile, callback);
    } catch (e) {
      // I guess we don't autostart then
      callback();
    }
  };

  var exePath = _electron.app.getPath('exe');
  var exeDir = _path2.default.dirname(exePath);
  var iconPath = _path2.default.join(exeDir, 'discord.png');
  var autostartDir = _path2.default.join(_electron.app.getPath('appData'), 'autostart');
  var autostartFileName = _path2.default.join(autostartDir, _electron.app.getName() + '-' + global.releaseChannel + '.desktop');
  var desktopFileBase = '[Desktop Entry]\nType=Application\nExec=' + exePath + '\nHidden=false\nNoDisplay=false\nName=' + appName + '\nIcon=' + iconPath + '\nComment=Text and voice chat for gamers.\n';

  autoRun.install = function (callback) {
    writeStartupFile(true, callback);
  };

  autoRun.update = function (callback) {
    // do I need this?
    callback();
  };

  autoRun.isAutoRunning = function (callback) {
    try {
      _fs2.default.readFile(autostartFileName, 'utf8', function (err, data) {
        if (err) {
          callback(false);
          return;
        }
        var res = /X-GNOME-Autostart-enabled=true/.test(data);
        callback(res);
      });
    } catch (e) {
      callback(false);
    }
  };

  autoRun.clear = function (callback) {
    writeStartupFile(false, callback);
  };
}

exports.default = autoRun;
module.exports = exports['default'];
