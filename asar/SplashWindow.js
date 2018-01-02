'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _electron = require('electron');

var _events = require('events');

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _url = require('url');

var _url2 = _interopRequireDefault(_url);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var RETRY_CAP_SECONDS = 60;

// citron note: atom seems to add about 50px height to the frame on mac but not windows
var LOADING_WINDOW_WIDTH = 300;
var LOADING_WINDOW_HEIGHT = process.platform == 'darwin' ? 300 : 350;

var SplashWindow = function (_EventEmitter) {
  _inherits(SplashWindow, _EventEmitter);

  function SplashWindow(updater) {
    var startMinimized = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;

    _classCallCheck(this, SplashWindow);

    var _this = _possibleConstructorReturn(this, (SplashWindow.__proto__ || Object.getPrototypeOf(SplashWindow)).call(this));

    _this._window = null;
    _this._state = {};
    _this._updateAttempt = 0;
    _this._updateTimeout = null;
    _this._launchedMainWindow = false;
    _this._updater = updater;
    _this._updateListeners = {};

    _this._addUpdateListener('checking-for-updates', function () {
      _this._startUpdateTimeout();
      _this._updateComponentState('checking-for-updates');
    });
    _this._addUpdateListener('update-check-finished', function (succeeded, updateCount, _manualRequired) {
      _this._cancelUpdateTimeout();
      if (!succeeded) {
        _this._scheduleUpdateCheck();
        _this._updateComponentState('update-failure');
      } else if (updateCount === 0) {
        _this._launchMainWindow();
        _this._updateComponentState('launching');
      }
    });
    _this._addUpdateListener('downloading-module', function (_name, current, total) {
      _this._cancelUpdateTimeout();
      _this._state = { current: current, total: total };
      _this._updateComponentState('downloading-updates');
    });
    _this._addUpdateListener('downloading-module-progress', function (_name, progress) {
      _this._state.progress = progress * 100;
      _this._updateComponentState('downloading-updates');
    });
    _this._addUpdateListener('downloaded-module', function (_name, _current, _total, _succeeded) {
      return delete _this._state.progress;
    });
    _this._addUpdateListener('downloading-modules-finished', function (succeeded, failed) {
      if (failed > 0) {
        _this._scheduleUpdateCheck();
        _this._updateComponentState('update-failure');
      } else {
        process.nextTick(function () {
          return _this._updater.quitAndInstallUpdates();
        });
      }
    });

    _this._addUpdateListener('no-pending-updates', function () {
      return _this._updater.checkForUpdates();
    });
    _this._addUpdateListener('installing-module', function (name, current, total) {
      _this._state = { current: current, total: total };
      _this._updateComponentState('installing-updates');
    });
    _this._addUpdateListener('installed-module', function (name, _current, _total, _succeeded) {
      return delete _this._state.progress;
    });
    _this._addUpdateListener('installing-module-progress', function (name, progress) {
      _this._state.progress = progress * 100;
      _this._updateComponentState('installing-updates');
    });
    _this._addUpdateListener('installing-modules-finished', function (_succeeded, _failed) {
      return _this._updater.checkForUpdates();
    });
    _this._addUpdateListener('update-manually', function (newVersion) {
      _this._state.newVersion = newVersion;
      _this._updateComponentState('update-manually');
    });

    _this._launchSplashWindow(startMinimized);
    return _this;
  }

  _createClass(SplashWindow, [{
    key: '_destructor',
    value: function _destructor() {
      var _this2 = this;

      this._removeUpdateListeners();
      this._cancelUpdateTimeout();

      if (this._window) {
        this._window.setSkipTaskbar(true);
        // defer the window hiding for a short moment so it gets covered by the main window
        var _nukeWindow = function _nukeWindow() {
          _this2._window.hide();
          _this2._window.close();
          _this2._window = null;
        };
        setTimeout(_nukeWindow, 100);
      }
    }
  }, {
    key: 'focus',
    value: function focus() {
      if (this._window != null) {
        this._window.focus();
      }
    }
  }, {
    key: '_addUpdateListener',
    value: function _addUpdateListener(event, listener) {
      this._updateListeners[event] = listener;
      this._updater.addListener(event, listener);
    }
  }, {
    key: '_removeUpdateListeners',
    value: function _removeUpdateListeners() {
      for (var event in this._updateListeners) {
        this._updater.removeListener(event, this._updateListeners[event]);
      }
      this._updateListeners = {};
    }
  }, {
    key: '_updateComponentState',
    value: function _updateComponentState(event) {
      if (this != null && this._window != null && this._window.webContents != null) {
        this._window.webContents.send('UPDATE_STATE', _extends({ status: event }, this._state));
      }
    }
  }, {
    key: '_startUpdateTimeout',
    value: function _startUpdateTimeout() {
      var _this3 = this;

      if (!this._updateTimeout) {
        this._updateTimeout = setTimeout(function () {
          return _this3._scheduleUpdateCheck();
        }, 10000);
      }
    }
  }, {
    key: '_cancelUpdateTimeout',
    value: function _cancelUpdateTimeout() {
      if (this._updateTimeout) {
        clearTimeout(this._updateTimeout);
        this._updateTimeout = null;
      }
    }
  }, {
    key: '_scheduleUpdateCheck',
    value: function _scheduleUpdateCheck() {
      var _this4 = this;

      this._updateAttempt += 1;
      var retryInSeconds = Math.min(this._updateAttempt * 10, RETRY_CAP_SECONDS);
      this._state.seconds = retryInSeconds;
      setTimeout(function () {
        return _this4._updater.checkForUpdates();
      }, retryInSeconds * 1000);
    }
  }, {
    key: '_launchSplashWindow',
    value: function _launchSplashWindow(startMinimized) {
      var _this5 = this;

      var windowConfig = {
        width: LOADING_WINDOW_WIDTH,
        height: LOADING_WINDOW_HEIGHT,
        transparent: false,
        frame: false,
        resizable: false,
        center: true,
        show: false
      };
      if (process.platform == 'linux') {
        windowConfig.type = 'splash';
      }
      this._window = new _electron.BrowserWindow(windowConfig);

      // prevent users from dropping links to navigate in splash window
      this._window.webContents.on('will-navigate', function (evt) {
        return evt.preventDefault();
      });

      this._window.webContents.on('new-window', function (e, windowURL) {
        e.preventDefault();
        _electron.shell.openExternal(windowURL);
        // exit, but delay half a second because openExternal is about to fire
        // some events to things that are freed by app.quit.
        setTimeout(_electron.app.quit, 500);
      });

      if (process.platform != 'darwin') {
        // citron note: this causes a crash on quit while the window is open on osx
        this._window.on('closed', function () {
          _this5._window = null;
          if (!_this5._launchedMainWindow) {
            // user has closed this window before we launched the app, so let's quit
            _electron.app.quit();
          }
        });
      }

      _electron.ipcMain.on('SPLASH_SCREEN_READY', function () {
        if (_this5._window && !startMinimized) {
          _this5._window.show();
        }

        _this5._updater.installPendingUpdates();
      });

      var splashUrl = _url2.default.format({
        protocol: 'file',
        slashes: true,
        pathname: _path2.default.join(__dirname, 'splash', 'index.html')
      });
      this._window.loadURL(splashUrl);
    }
  }, {
    key: '_launchMainWindow',
    value: function _launchMainWindow() {
      if (!this._launchedMainWindow && this._window) {
        this._launchedMainWindow = true;
        this.emit(SplashWindow.EVENT_APP_SHOULD_LAUNCH);
      }
    }
  }, {
    key: 'pageReady',
    value: function pageReady() {
      var _this6 = this;

      this._destructor();
      process.nextTick(function () {
        return _this6.emit(SplashWindow.EVENT_APP_SHOULD_SHOW);
      });
    }
  }]);

  return SplashWindow;
}(_events.EventEmitter);

exports.default = SplashWindow;


SplashWindow.EVENT_APP_SHOULD_LAUNCH = 'appLaunch';
SplashWindow.EVENT_APP_SHOULD_SHOW = 'appShow';
module.exports = exports['default'];
