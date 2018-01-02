'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _electron = require('electron');

var _FileUtils = require('./utils/FileUtils');

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * Used on Windows to set the taskbar icon
 */
var AppBadge = function () {
  function AppBadge() {
    var _this = this;

    _classCallCheck(this, AppBadge);

    this.lastIndex = null;
    this.appIcons = [];

    var asarPath = 'images/badges';
    for (var i = 1; i <= 11; i++) {
      this.appIcons.push((0, _FileUtils.exposeAsarTempFile)(asarPath, 'badge-' + i + '.ico'));
    }

    // TODO remove on or after April 2018
    global.features.declareSupported('new_app_badge');

    _electron.ipcMain.on('APP_BADGE_SET', function (_event, count) {
      return _this.setAppBadge(count);
    });
  }

  _createClass(AppBadge, [{
    key: 'setAppBadge',
    value: function setAppBadge(count) {
      var win = _electron.BrowserWindow.fromId(global.mainWindowId);

      var _getOverlayIconData2 = this._getOverlayIconData(count),
          index = _getOverlayIconData2.index,
          description = _getOverlayIconData2.description;

      // Prevent setting a new icon when the icon is the same


      if (this.lastIndex !== index) {
        if (index == null) {
          win.setOverlayIcon(null, description);
        } else {
          win.setOverlayIcon(this.appIcons[index], description);
        }

        this.lastIndex = index;
      }
    }

    /*
     * -1 is bullet
     * 0 is nothing
     * 1-9 is a number badge
     * 10+ is `9+`
     */

  }, {
    key: '_getOverlayIconData',
    value: function _getOverlayIconData(count) {
      // Unread message badge
      if (count === -1) {
        return {
          index: 10, // this.appIcons.length - 1
          description: 'Unread messages'
        };
      }

      // Clear overlay icon
      if (count === 0) {
        return {
          index: null, // null is used to clear the overlay icon
          description: 'No Notifications'
        };
      }

      // Notification badge
      var index = Math.max(1, Math.min(count, 10)) - 1; // arrays are 0 based
      return {
        index: index,
        description: index + ' notifications'
      };
    }
  }]);

  return AppBadge;
}();

exports.default = process.platform === 'win32' ? AppBadge : null;
module.exports = exports['default'];
