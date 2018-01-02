'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _electron = require('electron');

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _FileUtils = require('./utils/FileUtils');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

// These are lazy loaded into temp files
var TrayIconNames = {
  DEFAULT: 'tray',
  UNREAD: 'tray-unread',
  CONNECTED: 'tray-connected',
  SPEAKING: 'tray-speaking',
  MUTED: 'tray-muted',
  DEAFENED: 'tray-deafened'
};

var trayIcons = void 0;

var MenuItems = {
  SECRET: 'SECRET',
  MUTE: 'MUTE',
  DEAFEN: 'DEAFEN',
  OPEN: 'OPEN',
  VOICE_SETTINGS: 'VOICE_SETTINGS',
  CHECK_UPDATE: 'CHECK_UPDATE',
  QUIT: 'QUIT'
};

// TODO Remove the deprecated tray icons in the image folder on April 1st, 2018

var SystemTray = function () {
  /**
   * args:
   * options {
   *   onCheckForUpdates: Function,
   *   onTrayClicked: Function,
   *   onToggleMute: Function,
   *   onToggleDeafen: Function
   *   appSettings: ¯\_(ツ)_/¯,
   * }
   */
  function SystemTray(options) {
    var _this = this;

    _classCallCheck(this, SystemTray);

    // Get the correct tray icon images first
    this.generateTrayIconPaths();

    this.icon = trayIcons.DEFAULT;
    this.myName = _path2.default.basename(process.execPath, '.exe');
    this.options = options;
    this.appSettings = options.appSettings;
    this.contextMenu = [];

    Object.values(MenuItems).forEach(function (menuItem) {
      _this[menuItem] = {};
    });

    this.setContextMenu = this.setContextMenu.bind(this);

    // Initialize tray menu items
    this.initializeMenuItems();
    // Build the contextMenu
    this.buildContextMenu();

    _electron.ipcMain.on('SYSTEM_TRAY_SET_ICON', function (_event, icon) {
      return _this.setTrayIcon(icon);
    });
  }

  _createClass(SystemTray, [{
    key: 'generateTrayIconPaths',
    value: function generateTrayIconPaths() {
      // Prevent this action if SystemTray gets re-initialized (render process crashes)
      if (trayIcons != null) return;

      // Load in the icons for current platform
      var asarPath = 'images/systemtray/' + process.platform;
      var suffix = process.platform === 'darwin' ? 'Template' : '';

      trayIcons = {};
      for (var key in TrayIconNames) {
        trayIcons[key] = (0, _FileUtils.exposeAsarTempFile)(asarPath, '' + TrayIconNames[key] + suffix + '.png');
      }
    }
  }, {
    key: 'show',
    value: function show() {
      if (this.atomTray != null) {
        return;
      }

      this.atomTray = new _electron.Tray(this.icon); // Initialize with last set icon
      this.atomTray.setToolTip(this.myName);

      // Set tray context menu
      this.setContextMenu();

      // Set Tray click behavior
      this.atomTray.on('click', this.options.onTrayClicked);
    }
  }, {
    key: 'hide',
    value: function hide() {
      if (this.atomTray == null) {
        return;
      }

      this.atomTray.destroy();
      this.atomTray = null;
    }
  }, {
    key: 'initializeMenuItems',
    value: function initializeMenuItems() {
      var _options = this.options,
          onToggleMute = _options.onToggleMute,
          onToggleDeafen = _options.onToggleDeafen,
          onTrayClicked = _options.onTrayClicked,
          onOpenVoiceSettings = _options.onOpenVoiceSettings,
          onCheckForUpdates = _options.onCheckForUpdates;

      var voiceConnected = this.icon !== trayIcons.DEFAULT && this.icon !== trayIcons.UNREAD;

      this[MenuItems.SECRET] = {
        label: 'Top Secret Control Panel',
        icon: trayIcons.DEFAULT,
        enabled: false
      };
      this[MenuItems.MUTE] = {
        label: 'Mute',
        type: 'checkbox',
        checked: this.icon === trayIcons.MUTED || this.icon === trayIcons.DEAFENED,
        visible: voiceConnected,
        click: onToggleMute
      };
      this[MenuItems.DEAFEN] = {
        label: 'Deafen',
        type: 'checkbox',
        checked: this.icon === trayIcons.DEAFENED,
        visible: voiceConnected,
        click: onToggleDeafen
      };
      this[MenuItems.OPEN] = {
        label: 'Open ' + this.myName,
        type: 'normal',
        visible: process.platform === 'linux',
        click: onTrayClicked
      };
      this[MenuItems.VOICE_SETTINGS] = {
        label: 'Voice / Video Settings',
        type: 'normal',
        click: onOpenVoiceSettings
      };
      this[MenuItems.CHECK_UPDATE] = {
        label: 'Check for Updates...',
        type: 'normal',
        visible: process.platform !== 'darwin',
        click: onCheckForUpdates
      };
      this[MenuItems.QUIT] = {
        label: 'Quit ' + this.myName,
        role: 'quit'
      };
    }
  }, {
    key: 'buildContextMenu',
    value: function buildContextMenu() {
      var separator = { type: 'separator' };

      this.contextMenu = [this[MenuItems.SECRET], separator, this[MenuItems.OPEN], this[MenuItems.MUTE], this[MenuItems.DEAFEN], this[MenuItems.VOICE_SETTINGS], this[MenuItems.CHECK_UPDATE], separator, this[MenuItems.QUIT]];
    }
  }, {
    key: 'setContextMenu',
    value: function setContextMenu() {
      this.atomTray != null && this.atomTray.setContextMenu(_electron.Menu.buildFromTemplate(this.contextMenu));
    }
  }, {
    key: 'setTrayIcon',
    value: function setTrayIcon(icon) {
      // Keep track of last set icon
      this.icon = trayIcons[icon];

      // If icon is null, hide the tray icon.  Otherwise show
      // These calls also check for tray existance, so minimal cost.
      if (icon == null) {
        this.hide();
        return;
      } else {
        this.show();
      }

      // Keep mute/deafen menu items in sync with client, based on icon states
      var muteIndex = this.contextMenu.indexOf(this[MenuItems.MUTE]);
      var deafenIndex = this.contextMenu.indexOf(this[MenuItems.DEAFEN]);
      var voiceConnected = this.contextMenu[muteIndex].visible;
      var setContextMenu = false;

      if (this.icon !== trayIcons.DEFAULT && this.icon !== trayIcons.UNREAD) {
        // Show mute/deaf controls
        if (!voiceConnected) {
          this.contextMenu[muteIndex].visible = true;
          this.contextMenu[deafenIndex].visible = true;
          setContextMenu = true;
        }

        if (this.icon === trayIcons.DEAFENED) {
          this.contextMenu[muteIndex].checked = true;
          this.contextMenu[deafenIndex].checked = true;
          setContextMenu = true;
        } else if (this.icon === trayIcons.MUTED) {
          this.contextMenu[muteIndex].checked = true;
          this.contextMenu[deafenIndex].checked = false;
          setContextMenu = true;
        } else if (this.contextMenu[muteIndex].checked || this.contextMenu[deafenIndex].checked) {
          this.contextMenu[muteIndex].checked = false;
          this.contextMenu[deafenIndex].checked = false;
          setContextMenu = true;
        }
      } else if (voiceConnected) {
        this.contextMenu[muteIndex].visible = false;
        this.contextMenu[deafenIndex].visible = false;
        setContextMenu = true;
      }

      setContextMenu && this.setContextMenu();
      this.atomTray != null && this.atomTray.setImage(this.icon);
    }
  }, {
    key: 'displayHowToCloseHint',
    value: function displayHowToCloseHint() {
      if (this.appSettings.get('trayBalloonShown') != null || this.atomTray == null) {
        return;
      }

      // todo: localize
      var balloonMessage = 'Hi! Discord will run in the background to keep you in touch with your friends. You can right-click here to quit.';
      this.appSettings.set('trayBalloonShown', true);
      this.appSettings.save();
      this.atomTray.displayBalloon({
        title: 'Discord',
        content: balloonMessage
      });
    }
  }]);

  return SystemTray;
}();

exports.default = SystemTray;
module.exports = exports['default'];
