'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _electron = require('electron');

var _electron2 = _interopRequireDefault(_electron);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = {
  init: function init() {
    global.features.declareSupported('electron_configure_hardware_acceleration');

    var enableHardwareAcceleration = this.getEnableHardwareAcceleration();
    if (!enableHardwareAcceleration) {
      _electron2.default.app.disableHardwareAcceleration();
    }
  },
  getEnableHardwareAcceleration: function getEnableHardwareAcceleration() {
    return global.appSettings.get('enableHardwareAcceleration', true);
  },
  setEnableHardwareAcceleration: function setEnableHardwareAcceleration(enableHardwareAcceleration) {
    global.appSettings.set('enableHardwareAcceleration', enableHardwareAcceleration);
    global.appSettings.save();

    _electron2.default.app.relaunch();
    _electron2.default.app.exit(0);
  }
};
module.exports = exports['default'];
