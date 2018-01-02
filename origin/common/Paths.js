'use strict';

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _mkdirp = require('mkdirp');

var _mkdirp2 = _interopRequireDefault(_mkdirp);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _rimraf = require('rimraf');

var _rimraf2 = _interopRequireDefault(_rimraf);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var Paths = {};

var UserData = void 0;
var UserDataVersioned = void 0;
var Resources = void 0;

Paths.init = function (buildInfo) {
  var userDataRoot = void 0;
  if (__SDK__) {
    switch (process.platform) {
      case 'darwin':
        userDataRoot = _path2.default.join(process.env.HOME, 'Library', 'Application Support');
        break;
      case 'win32':
        userDataRoot = process.env.APPDATA;
        break;
      case 'linux':
        userDataRoot = process.env.XDG_CONFIG_HOME || _path2.default.join(process.env.HOME, '.config');
        break;
    }

    Resources = __dirname;
  } else {
    var _require = require('electron'),
        app = _require.app;

    userDataRoot = app.getPath('appData');

    Resources = _path2.default.join(__dirname, '..', '..');
  }

  var legacyUserDataPath = userDataRoot;
  UserData = _path2.default.join(userDataRoot, 'discord' + (buildInfo.releaseChannel == 'stable' ? '' : buildInfo.releaseChannel));

  if (buildInfo.userDataSuffix) {
    UserData = _path2.default.join(UserData, buildInfo.userDataSuffix);
  }

  if (!__SDK__) {
    var _require2 = require('electron'),
        _app = _require2.app;

    _app.setPath('userData', UserData);
  }

  UserDataVersioned = _path2.default.join(UserData, buildInfo.version);
  _mkdirp2.default.sync(UserDataVersioned);

  // migration path from shared /discord/ userData paths to /discord{releaseChannel}/
  // only applicable to the desktop app -- the sdk has no legacy here.
  if (buildInfo.releaseChannel === 'canary' || buildInfo.releaseChannel === 'ptb') {
    var storageFile = 'https_' + buildInfo.releaseChannel + '.discordapp.com_0.localstorage';
    var legacyStorage = _path2.default.join(legacyUserDataPath, 'Local Storage', storageFile);
    var localStorage = _path2.default.join(UserData, 'Local Storage', storageFile);
    if (_fs2.default.existsSync(legacyStorage) && !_fs2.default.existsSync(localStorage)) {
      try {
        _mkdirp2.default.sync(_path2.default.dirname(localStorage));
        _fs2.default.writeFileSync(localStorage, _fs2.default.readFileSync(legacyStorage));
      } catch (e) {
        console.warn('Failed to migrate local storage: ', e);
      }
    }
  }

  // clean old versions
  var entries = _fs2.default.readdirSync(UserData) || [];
  entries.forEach(function (entry) {
    var fullPath = _path2.default.join(UserData, entry);
    if (_fs2.default.statSync(fullPath).isDirectory() && entry.indexOf(buildInfo.version) === -1) {
      if (entry.match('^[0-9]+\.[0-9]+\.[0-9]+') != null) {
        console.log('Removing old directory ', entry);
        (0, _rimraf2.default)(fullPath, {}, function (error) {
          if (error) {
            console.warn('...failed with error: ', error);
          }
        });
      }
    }
  });
};

Paths.getUserData = function () {
  return UserData;
};

Paths.getUserDataVersioned = function () {
  return UserDataVersioned;
};

Paths.getResources = function () {
  return Resources;
};

module.exports = Paths;
