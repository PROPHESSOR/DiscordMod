'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _electron = require('electron');

var _AutoRun = require('./AutoRun');

var _AutoRun2 = _interopRequireDefault(_AutoRun);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var NOOP = function NOOP() {};

var AppConfig = function () {
  function AppConfig(options) {
    var _this = this;

    _classCallCheck(this, AppConfig);

    this.appSettings = options.appSettings;

    // TODO remove on or after March 2018
    global.features.declareSupported('app_configs');

    this.setMinimizeOnClose = this.setMinimizeOnClose.bind(this);
    this.toggleRunOnStartup = this.toggleRunOnStartup.bind(this);
    this.toggleStartMinimized = this.toggleStartMinimized.bind(this);

    _electron.ipcMain.on('TOGGLE_MINIMIZE_TO_TRAY', function (_event, value) {
      return _this.setMinimizeOnClose(value);
    });
    _electron.ipcMain.on('TOGGLE_OPEN_ON_STARTUP', function (_event, value) {
      return _this.toggleRunOnStartup(value);
    });
    _electron.ipcMain.on('TOGGLE_START_MINIMIZED', function (_event, value) {
      return _this.toggleStartMinimized(value);
    });
  }

  _createClass(AppConfig, [{
    key: 'setMinimizeOnClose',
    value: function setMinimizeOnClose(minimizeToTray) {
      this.appSettings.set('MINIMIZE_TO_TRAY', minimizeToTray);
    }
  }, {
    key: 'toggleRunOnStartup',
    value: function toggleRunOnStartup(openOnStartup) {
      this.appSettings.set('OPEN_ON_STARTUP', openOnStartup);

      if (openOnStartup) {
        _AutoRun2.default.install(NOOP);
      } else {
        _AutoRun2.default.clear(NOOP);
      }
    }
  }, {
    key: 'toggleStartMinimized',
    value: function toggleStartMinimized(startMinimized) {
      this.appSettings.set('START_MINIMIZED', startMinimized);
      _AutoRun2.default.isAutoRunning(function (doesOldKeyExist) {
        // Only update the registry for this toggle if the app was already set to autorun
        if (doesOldKeyExist) {
          _AutoRun2.default.install(NOOP);
        }
      });
    }
  }]);

  return AppConfig;
}();

exports.default = AppConfig;
module.exports = exports['default'];
