'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _events = require('events');

var _electron = require('electron');

var _electron2 = _interopRequireDefault(_electron);

var _discord_toaster = require('discord_toaster');

var _discord_toaster2 = _interopRequireDefault(_discord_toaster);

var _url = require('url');

var _url2 = _interopRequireDefault(_url);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var BrowserWindow = _electron2.default.BrowserWindow,
    ipcMain = _electron2.default.ipcMain;

// TODO: transparency detection?
// TODO: SHQueryUserNotificationState

var nativeSupported = _discord_toaster2.default.supported();

var VARIABLES = JSON.parse(_fs2.default.readFileSync(_path2.default.join(__dirname, 'notifications', 'variables.json')));

var NotificationWindow = function (_EventEmitter) {
  _inherits(NotificationWindow, _EventEmitter);

  function NotificationWindow(mainWindow, _ref) {
    var title = _ref.title,
        maxVisible = _ref.maxVisible,
        screenPosition = _ref.screenPosition,
        appID = _ref.appID;

    _classCallCheck(this, NotificationWindow);

    var _this = _possibleConstructorReturn(this, (NotificationWindow.__proto__ || Object.getPrototypeOf(NotificationWindow)).call(this));

    if (nativeSupported) {
      nativeSupported = _discord_toaster2.default.init();
      // https://msdn.microsoft.com/en-us/library/windows/desktop/dd378459(v=vs.85).aspx
      // plus see: discord_desktop\tools\squirrel_src\src\Squirrel\UpdateManager.ApplyReleases.cs
      _discord_toaster2.default.setAppID(appID);
    }

    _this.mainWindow = mainWindow;

    if (!nativeSupported) {
      _this.notifications = [];
      _this.title = title;
      _this.maxVisible = maxVisible;
      _this.screenPosition = screenPosition;
      _this.hideTimeout = null;
    }

    _this.handleNotificationsClear = _this.handleNotificationsClear.bind(_this);
    _this.handleNotificationShow = _this.handleNotificationShow.bind(_this);
    _this.handleNotificationClick = _this.handleNotificationClick.bind(_this);
    _this.handleNotificationClose = _this.handleNotificationClose.bind(_this);

    ipcMain.on('NOTIFICATIONS_CLEAR', _this.handleNotificationsClear);
    ipcMain.on('NOTIFICATION_SHOW', _this.handleNotificationShow);
    ipcMain.on('NOTIFICATION_CLICK', _this.handleNotificationClick);
    ipcMain.on('NOTIFICATION_CLOSE', _this.handleNotificationClose);
    return _this;
  }

  _createClass(NotificationWindow, [{
    key: 'close',
    value: function close() {
      this.mainWindow = null;

      this.destroyWindow();

      ipcMain.removeListener('NOTIFICATIONS_CLEAR', this.handleNotificationsClear);
      ipcMain.removeListener('NOTIFICATION_SHOW', this.handleNotificationShow);
      ipcMain.removeListener('NOTIFICATION_CLICK', this.handleNotificationClick);
      ipcMain.removeListener('NOTIFICATION_CLOSE', this.handleNotificationClose);
    }
  }, {
    key: 'handleNotificationsClear',
    value: function handleNotificationsClear() {
      this.notifications = [];
      this.update();
    }
  }, {
    key: 'handleNotificationShow',
    value: function handleNotificationShow(e, notification) {
      var _this2 = this;

      if (nativeSupported) {
        notification.onClick = function (notificationId) {
          _this2.handleNotificationClick(null, notificationId);
        };
        if (notification.silent === undefined) {
          notification.silent = true;
        }
        _discord_toaster2.default.show(notification);
      } else {
        this.notifications.push(notification);
        this.update();
      }
    }
  }, {
    key: 'handleNotificationClick',
    value: function handleNotificationClick(e, notificationId) {
      this.mainWindow.webContents.send('NOTIFICATION_CLICK', notificationId);
      this.emit('notification-click');
    }
  }, {
    key: 'handleNotificationClose',
    value: function handleNotificationClose(e, notificationId) {
      var _this3 = this;

      if (nativeSupported) {
        this.notifications = this.notifications.filter(function (notification) {
          if (notification.id === notificationId) {
            _discord_toaster2.default.hide(notification);
            return false;
          }
          return true;
        });
      } else {
        if (this.notificationWindow) {
          this.notificationWindow.webContents.send('FADE_OUT', notificationId);
        }
        setTimeout(function () {
          _this3.notifications = _this3.notifications.filter(function (notification) {
            return notification.id !== notificationId;
          });
          _this3.update();
        }, VARIABLES.outDuration);
      }
    }

    // Private

  }, {
    key: 'createWindow',
    value: function createWindow() {
      var _this4 = this;

      if (nativeSupported || this.notificationWindow != null) {
        return;
      }

      this.notificationWindow = new BrowserWindow({
        title: this.title,
        frame: false,
        resizable: false,
        show: false,
        acceptFirstMouse: true,
        alwaysOnTop: true,
        skipTaskbar: true,
        transparent: true
      });
      var notificationUrl = _url2.default.format({
        protocol: 'file',
        slashes: true,
        pathname: _path2.default.join(__dirname, 'notifications', 'index.html')
      });
      this.notificationWindow.loadURL(notificationUrl);
      this.notificationWindow.webContents.on('did-finish-load', function () {
        return _this4.update();
      });
    }
  }, {
    key: 'destroyWindow',
    value: function destroyWindow() {
      if (this.notificationWindow == null) {
        return;
      }

      this.notificationWindow.hide();
      this.notificationWindow.close();
      this.notificationWindow = null;
    }
  }, {
    key: 'update',
    value: function update() {
      var _this5 = this;

      if (nativeSupported) {
        return;
      }
      if (this.notifications.length > 0) {
        clearTimeout(this.hideTimeout);
        this.hideTimeout = null;

        if (this.notificationWindow != null) {
          var _calculateBoundingBox = this.calculateBoundingBox(),
              width = _calculateBoundingBox.width,
              height = _calculateBoundingBox.height,
              x = _calculateBoundingBox.x,
              y = _calculateBoundingBox.y;

          this.notificationWindow.setPosition(x, y);
          this.notificationWindow.setSize(width, height);
          this.notificationWindow.showInactive();
        } else {
          this.createWindow();
          return;
        }
      } else if (this.hideTimeout == null) {
        this.hideTimeout = setTimeout(function () {
          return _this5.destroyWindow();
        }, VARIABLES.outDuration * 1.1);
      }

      if (this.notificationWindow != null) {
        this.notificationWindow.webContents.send('UPDATE', this.notifications.slice(0, this.maxVisible));
      }
    }
  }, {
    key: 'calculateBoundingBox',
    value: function calculateBoundingBox() {
      var _mainWindow$getPositi = this.mainWindow.getPosition(),
          _mainWindow$getPositi2 = _slicedToArray(_mainWindow$getPositi, 2),
          positionX = _mainWindow$getPositi2[0],
          positionY = _mainWindow$getPositi2[1];

      var _mainWindow$getSize = this.mainWindow.getSize(),
          _mainWindow$getSize2 = _slicedToArray(_mainWindow$getSize, 2),
          windowWidth = _mainWindow$getSize2[0],
          windowHeight = _mainWindow$getSize2[1];

      var centerPoint = {
        x: Math.round(positionX + windowWidth / 2),
        y: Math.round(positionY + windowHeight / 2)
      };

      var activeDisplay = _electron2.default.screen.getDisplayNearestPoint(centerPoint) || _electron2.default.screen.getPrimaryDisplay();
      var workArea = activeDisplay.workArea;

      var width = VARIABLES.width;
      //const height = (Math.min(this.notifications.length, this.maxVisible) + 1) * VARIABLES.height;
      var height = (this.maxVisible + 1) * VARIABLES.height;

      var x = workArea.x + workArea.width - width;
      var y = void 0;
      switch (this.screenPosition) {
        case 'top':
          y = workArea.y;
          break;
        case 'bottom':
          y = workArea.y + workArea.height - height;
          break;
      }

      return { x: x, y: y, width: width, height: height };
    }
  }]);

  return NotificationWindow;
}(_events.EventEmitter);

exports.default = NotificationWindow;
module.exports = exports['default'];
