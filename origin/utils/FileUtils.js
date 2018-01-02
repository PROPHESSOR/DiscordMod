'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.exposeAsarTempFile = exposeAsarTempFile;

var _electron = require('electron');

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function exposeAsarTempFile(asarPath, fileName) {
  var fullPathToAsarFile = _path2.default.join(_electron.app.getAppPath(), asarPath, fileName);
  var data = _fs2.default.readFileSync(fullPathToAsarFile);
  var nativeFilePath = _path2.default.join(_electron.app.getPath('userData'), fileName);
  _fs2.default.writeFileSync(nativeFilePath, data);
  return nativeFilePath;
}
