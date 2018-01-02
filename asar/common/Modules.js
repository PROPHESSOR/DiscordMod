'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

var _Backoff = require('./Backoff');

var _Backoff2 = _interopRequireDefault(_Backoff);

var _events = require('events');

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _mkdirp = require('mkdirp');

var _mkdirp2 = _interopRequireDefault(_mkdirp);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _Paths = require('./Paths');

var _Paths2 = _interopRequireDefault(_Paths);

var _yauzl = require('yauzl');

var _yauzl2 = _interopRequireDefault(_yauzl);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var REQUEST_TIMEOUT = 15000;

var Modules = function (_EventEmitter) {
  _inherits(Modules, _EventEmitter);

  function Modules(endpoint, settings, buildInfo) {
    _classCallCheck(this, Modules);

    var _this = _possibleConstructorReturn(this, (Modules.__proto__ || Object.getPrototypeOf(Modules)).call(this));

    var logPath = _path2.default.join(_Paths2.default.getUserData(), 'modules.log');
    try {
      _this.logStream = _fs2.default.createWriteStream(logPath, { flags: 'a' });
    } catch (e) {
      console.error('Failed to create ' + logPath + ': ' + JSON.stringify(e));
    }
    _this.request = __SDK__ ? require('request') : require('../Request');
    _this.settings = settings;
    _this.updatable = buildInfo.version != '0.0.0' && !buildInfo.debug || _this.settings.get('ALWAYS_ALLOW_UPDATES');
    _this.skipHostUpdate = _this.settings.get('SKIP_HOST_UPDATE') || __SDK__ || !_this.updatable;
    _this.skipModuleUpdate = _this.settings.get('SKIP_MODULE_UPDATE') || buildInfo.localModulesRoot || !_this.updatable;
    _this.fakeInstalledModules = false;
    _this.updating = false;
    _this.hostUpdateAvailable = false;
    _this.remoteModuleVersions = {};
    _this.newInstallInProgress = {};
    _this.installedModules = {};
    _this.bootstrapping = false;
    _this.backoff = new _Backoff2.default(1000, 20000);
    _this.download = {
      active: false,
      queue: [],
      next: 0,
      failures: 0
    };
    _this.unzip = {
      active: false,
      queue: [],
      next: 0,
      failures: 0
    };

    _this._log('Modules initializing');
    _this._log('Distribution: ' + (buildInfo.localModulesRoot ? 'local' : 'remote'));
    _this._log('Host updates: ' + (_this.skipHostUpdate ? 'disabled' : 'enabled'));
    _this._log('Module updates: ' + (_this.skipModuleUpdate ? 'disabled' : 'enabled'));

    var module = require('module');
    if (buildInfo.localModulesRoot) {
      _this.fakeInstalledModules = true;
      if (module.globalPaths.indexOf(buildInfo.localModulesRoot) === -1) {
        module.globalPaths.push(buildInfo.localModulesRoot);
      }
    } else {
      _this.moduleInstallPath = _path2.default.join(_Paths2.default.getUserDataVersioned(), 'modules');
      if (module.globalPaths.indexOf(_this.moduleInstallPath) === -1) {
        module.globalPaths.push(_this.moduleInstallPath);
      }
      _this.installedModulesPath = _path2.default.join(_this.moduleInstallPath, 'installed.json');
      _this.moduleDownloadPath = _path2.default.join(_this.moduleInstallPath, 'pending');
      _mkdirp2.default.sync(_this.moduleDownloadPath);

      _this._log('Install path: ' + _this.moduleInstallPath);

      var failedLoadingInstalledModules = false;
      try {
        _this.installedModules = JSON.parse(_fs2.default.readFileSync(_this.installedModulesPath));
      } catch (e) {
        failedLoadingInstalledModules = true;
      }

      try {
        var entries = _fs2.default.readdirSync(_this.moduleDownloadPath) || [];
        entries.forEach(function (entry) {
          var entryPath = _path2.default.join(_this.moduleDownloadPath, entry);
          var isStale = true;
          for (var _module in _this.installedModules) {
            if (entryPath === _this.installedModules[_module].updateZipfile) {
              isStale = false;
              break;
            }
          }

          if (isStale) {
            _fs2.default.unlinkSync(_path2.default.join(_this.moduleDownloadPath, entry));
          }
        });
      } catch (e) {}

      _this.bootstrapping = failedLoadingInstalledModules || _this.settings.get('ALWAYS_BOOTSTRAP_MODULES');
    }

    var setFeedURL = function setFeedURL(_) {};
    if (!__SDK__) {
      _this.hostUpdater = require('../HostUpdater');
      _this.hostUpdater.on('checking-for-update', function () {
        return _this._emit('checking-for-updates');
      });
      _this.hostUpdater.on('update-available', function () {
        return _this._hostUpdateAvailable();
      });
      _this.hostUpdater.on('update-not-available', function () {
        return _this._hostUpToDate();
      });
      _this.hostUpdater.on('update-manually', function (newVersion) {
        return _this._hostRequireManualUpdate(newVersion);
      });
      _this.hostUpdater.on('update-downloaded', function () {
        return _this._hostUpdateDownloaded();
      });
      _this.hostUpdater.on('error', function (_e, error) {
        return _this._hostUpdateError(error);
      });
      setFeedURL = _this.hostUpdater.setFeedURL.bind(_this.hostUpdater);
    }

    _this.remoteBaseUrl = endpoint + '/modules/' + buildInfo.releaseChannel;
    _this.remoteQuery = { host_version: buildInfo.version }; // eslint-disable-line camelcase

    switch (process.platform) {
      case 'darwin':
        setFeedURL(endpoint + '/updates/' + buildInfo.releaseChannel + '?platform=osx&version=' + buildInfo.version);
        _this.remoteQuery.platform = 'osx';
        break;
      case 'win32':
        // Squirrel for Windows can't handle query params
        // https://github.com/Squirrel/Squirrel.Windows/issues/132
        setFeedURL(endpoint + '/updates/' + buildInfo.releaseChannel);
        _this.remoteQuery.platform = 'win';
        break;
      case 'linux':
        setFeedURL(endpoint + '/updates/' + buildInfo.releaseChannel + '?platform=linux&version=' + buildInfo.version);
        _this.remoteQuery.platform = 'linux';
        break;
    }
    return _this;
  }

  _createClass(Modules, [{
    key: 'installPendingUpdates',
    value: function installPendingUpdates() {
      var _this2 = this;

      var updatesToInstall = [];
      if (this.bootstrapping) {
        var modules = {};
        try {
          modules = JSON.parse(_fs2.default.readFileSync(_path2.default.join(_Paths2.default.getResources(), 'bootstrap', 'manifest.json')));
        } catch (e) {}

        for (var module in modules) {
          this.installedModules[module] = { installedVersion: 0 };
          var zipfile = _path2.default.join(_Paths2.default.getResources(), 'bootstrap', module + '.zip');
          updatesToInstall.push({ module: module, update: modules[module], zipfile: zipfile });
        }
      }

      for (var _module2 in this.installedModules) {
        var update = this.installedModules[_module2].updateVersion || 0;
        var _zipfile = this.installedModules[_module2].updateZipfile;
        if (update > 0 && _zipfile != null) {
          updatesToInstall.push({ module: _module2, update: update, zipfile: _zipfile });
        }
      }

      if (updatesToInstall.length > 0) {
        this._log((this.bootstrapping ? 'Bootstrapping' : 'Installing updates') + '...');
        updatesToInstall.forEach(function (e) {
          return _this2._unzip(e.module, e.update, e.zipfile);
        });
      } else {
        this._log('No updates to install');
        this._emit('no-pending-updates');
      }
    }
  }, {
    key: 'checkForUpdates',
    value: function checkForUpdates() {
      if (this.updating) {
        return;
      }

      this.updating = true;
      this.hostUpdateAvailable = false;
      if (this.skipHostUpdate) {
        this._emit('checking-for-updates');
        this._hostUpToDate();
      } else {
        this._log('Checking for host updates.');
        this.hostUpdater.checkForUpdates();
      }
    }
  }, {
    key: 'quitAndInstallUpdates',
    value: function quitAndInstallUpdates() {
      if (__SDK__) {
        // no-op
      } else {
        this._log('Relaunching to install ' + (this.hostUpdateAvailable ? 'host' : 'module') + ' updates...');
        if (this.hostUpdateAvailable) {
          this.hostUpdater.quitAndInstall();
        } else {
          this.logStream.end();
          this.logStream = null;

          var _require = require('electron'),
              app = _require.app;

          app.relaunch();
          app.quit();
        }
      }
    }
  }, {
    key: 'install',
    value: function install(name, defer) {
      if (this.isInstalled(name)) {
        if (!defer) {
          this._emit('installed-module', name, 1, 1, true);
        }
      } else {
        if (this.newInstallInProgress[name]) {
          return;
        }

        if (!this.updatable) {
          this._log('Not updatable; ignoring request to install ' + name + '...');
          return;
        }

        if (defer) {
          this._log('Deferred install for ' + name + '...');
          this.installedModules[name] = { installedVersion: 0 };
          this._commitInstalledModules();
        } else {
          this._log('Starting to install ' + name + '...');
          var version = this.remoteModuleVersions[name] || 0;
          this.newInstallInProgress[name] = version;
          this._download(name, version);
        }
      }
    }
  }, {
    key: 'isInstalled',
    value: function isInstalled(name) {
      var metadata = this.installedModules[name];
      return metadata && metadata.installedVersion > 0 || this.fakeInstalledModules;
    }
  }, {
    key: 'getInstalled',
    value: function getInstalled() {
      return _extends({}, this.installedModules);
    }
  }, {
    key: '_getRemoteModuleName',
    value: function _getRemoteModuleName(name) {
      if (process.platform === 'win32' && process.arch === 'x64') {
        return name + '.x64';
      }

      return name;
    }
  }, {
    key: '_log',
    value: function _log(message) {
      message = '[Modules] ' + message;
      console.log(message);
      if (this.logStream) {
        this.logStream.write(message);
        this.logStream.write('\r\n');
      }
    }
  }, {
    key: '_emit',
    value: function _emit() {
      var _this3 = this,
          _arguments = arguments;

      process.nextTick(function () {
        return _get(Modules.prototype.__proto__ || Object.getPrototypeOf(Modules.prototype), 'emit', _this3).apply(_this3, _arguments);
      });
    }
  }, {
    key: '_hostUpdateAvailable',
    value: function _hostUpdateAvailable() {
      this._log('Host update is available.');
      this.hostUpdateAvailable = true;
      this._emit('update-check-finished', true, 1, false);
      this._emit('downloading-module', 'host', 1, 1);
    }
  }, {
    key: '_hostRequireManualUpdate',
    value: function _hostRequireManualUpdate(newVersion) {
      this._log('Host update is available. Manual update required!');
      this.hostUpdateAvailable = true;
      this.updating = false;
      this._emit('update-manually', newVersion);
      this._emit('update-check-finished', true, 1, true);
    }
  }, {
    key: '_hostUpToDate',
    value: function _hostUpToDate() {
      this._log('Host is up to date.');
      if (!this.skipModuleUpdate) {
        this._checkForModuleUpdates();
      } else {
        this._emit('update-check-finished', true, 0, false);
      }
    }
  }, {
    key: '_hostUpdateDownloaded',
    value: function _hostUpdateDownloaded() {
      this._log('Host update downloaded.');
      this._emit('downloaded-module', 'host', 1, 1, true);
      this.updating = false;
      this._emit('downloading-modules-finished', 1, 0);
    }
  }, {
    key: '_hostUpdateError',
    value: function _hostUpdateError(error) {
      this._log('Host update failed: ' + error);

      // [adill] osx unsigned builds will fire this code signing error inside setFeedURL and
      // if we don't do anything about it this.hostUpdater.checkForUpdates() will never respond.
      if (error && error.indexOf('Could not get code signature for running application') != -1) {
        console.warn('Skipping host updates due to code signing failure.');
        this.skipHostUpdate = true;
      }

      this.updating = false;
      if (!this.hostUpdateAvailable) {
        this._emit('update-check-finished', false, 0, false);
      } else {
        this._emit('downloaded-module', 'host', 1, 1, false);
        this._emit('downloading-modules-finished', 0, 1);
      }
    }
  }, {
    key: '_checkForModuleUpdates',
    value: function _checkForModuleUpdates() {
      var _this4 = this;

      var query = _extends({}, this.remoteQuery, { _: Date.now() / 1000 / 60 / 5 | 0 });
      var url = this.remoteBaseUrl + '/versions.json';
      this._log('Checking for module updates at ' + url);
      this.request.get({ url: url, agent: false, encoding: null, qs: query, timeout: REQUEST_TIMEOUT, strictSSL: false }, function (error, response, body) {
        if (!error && response.statusCode == 200) {
          _this4.remoteModuleVersions = JSON.parse(body);
          if (_this4.settings.get('USE_LOCAL_MODULE_VERSIONS')) {
            try {
              _this4.remoteModuleVersions = JSON.parse(_fs2.default.readFileSync(_path2.default.join(_Paths2.default.getUserData(), 'local_module_versions.json')));
              console.log('Using local module versions: ', _this4.remoteModuleVersions);
            } catch (e) {
              console.warn('Failed to parse local module versions: ', e);
            }
          }

          var updatesToDownload = [];
          for (var module in _this4.installedModules) {
            var installed = _this4.installedModules[module].installedVersion;
            if (installed === null) {
              continue;
            }

            var update = _this4.installedModules[module].updateVersion || 0;
            var remote = _this4.remoteModuleVersions[_this4._getRemoteModuleName(module)] || 0;
            if (installed != remote && update != remote) {
              _this4._log('Module update available: ' + module + '@' + remote + ' [installed: ' + installed + ']');
              updatesToDownload.push({ name: module, version: remote });
            }
          }

          _this4.updating = false;
          _this4._emit('update-check-finished', true, updatesToDownload.length, false);
          updatesToDownload.forEach(function (e) {
            return _this4._download(e.name, e.version);
          });
          if (updatesToDownload.length === 0) {
            _this4._log('No module updates available.');
          }
        } else {
          _this4._log('Failed fetching module versions: ' + JSON.stringify(error));
          _this4.updating = false;
          _this4._emit('update-check-finished', false, 0, false);
        }
      });
    }
  }, {
    key: '_download',
    value: function _download(name, version) {
      var _this5 = this;

      this.download.queue.push({ name: name, version: version });
      process.nextTick(function () {
        return _this5._serviceDownloadQueue();
      });
    }
  }, {
    key: '_finishDownload',
    value: function _finishDownload(name, version, zipfile, succeeded) {
      var _this6 = this;

      if (!this.installedModules[name]) {
        this.installedModules[name] = {};
      }

      if (succeeded) {
        this.installedModules[name].updateVersion = version;
        this.installedModules[name].updateZipfile = zipfile;
        this._commitInstalledModules();
      } else {
        this.download.failures += 1;
      }

      this._emit('downloaded-module', name, this.download.next, this.download.queue.length, succeeded);

      if (this.download.next >= this.download.queue.length) {
        var successes = this.download.queue.length - this.download.failures;
        this.download.queue = [];
        this.download.next = 0;
        this._log('Finished module downloads. [success: ' + successes + '] [failure: ' + this.download.failures + ']');
        this._emit('downloading-modules-finished', successes, this.download.failures);
        this.download.failures = 0;
      }

      var continueDownloads = function continueDownloads() {
        _this6.download.active = false;
        _this6._serviceDownloadQueue();
      };

      if (succeeded) {
        this.backoff.succeed();
        process.nextTick(continueDownloads);
      } else {
        this._log('Waiting ' + (this.backoff.current | 0) + 'ms before next download.');
        this.backoff.fail(continueDownloads);
      }

      if (this.newInstallInProgress[name]) {
        this._unzip(name, version, zipfile);
      }
    }
  }, {
    key: '_serviceDownloadQueue',
    value: function _serviceDownloadQueue() {
      var _this7 = this;

      if (this.download.active) {
        return;
      }
      if (this.download.queue.length === 0) {
        return;
      }

      this.download.active = true;
      var module = this.download.queue[this.download.next];
      this.download.next += 1;

      this._emit('downloading-module', module.name, this.download.next, this.download.queue.length);

      var totalBytes = 1;
      var receivedBytes = 0;
      var progress = 0;

      var hasErrored = false;

      var url = this.remoteBaseUrl + '/' + this._getRemoteModuleName(module.name) + '/' + module.version;
      this._log('Fetching ' + module.name + '@' + module.version + ' from ' + url);
      this.request.get({ url: url, agent: false, encoding: null, followAllRedirects: true, qs: this.remoteQuery, timeout: REQUEST_TIMEOUT, strictSSL: false }).on('error', function (error) {
        if (!hasErrored) {
          hasErrored = true;
          _this7._log('Failed fetching ' + module.name + '@' + module.version + ': ' + JSON.stringify(error));
          _this7._finishDownload(module.name, module.version, null, false);
        }
      }).on('response', function (response) {
        totalBytes = response.headers['content-length'] || 1;

        var moduleZipPath = _path2.default.join(_this7.moduleDownloadPath, module.name + '-' + module.version + '.zip');
        _this7._log('Streaming ' + module.name + '@' + module.version + ' [' + totalBytes + ' bytes] to ' + moduleZipPath);

        var stream = _fs2.default.createWriteStream(moduleZipPath);
        stream.on('finish', function () {
          return _this7._finishDownload(module.name, module.version, moduleZipPath, response.statusCode === 200);
        });

        response.on('data', function (chunk) {
          receivedBytes += chunk.length;
          stream.write(chunk);
          var fraction = receivedBytes / totalBytes;
          var newProgress = 100 * fraction | 0;
          if (progress != newProgress) {
            progress = newProgress;
            _this7._emit('downloading-module-progress', module.name, fraction);
          }
        });
        response.on('end', function () {
          return stream.end();
        });
      });
    }
  }, {
    key: '_unzip',
    value: function _unzip(name, version, zipfile) {
      var _this8 = this;

      this.unzip.queue.push({ name: name, version: version, zipfile: zipfile });
      process.nextTick(function () {
        return _this8._serviceUnzipQueue();
      });
    }
  }, {
    key: '_finishUnzip',
    value: function _finishUnzip(module, succeeded) {
      var _this9 = this;

      delete this.newInstallInProgress[module.name];
      delete this.installedModules[module.name].updateZipfile;
      delete this.installedModules[module.name].updateVersion;
      this._commitInstalledModules();

      if (!succeeded) {
        this.unzip.failures += 1;
      }

      process.nextTick(function () {
        _this9.unzip.active = false;
        _this9._serviceUnzipQueue();
      });

      this._emit('installed-module', module.name, this.unzip.next, this.unzip.queue.length, succeeded);
    }
  }, {
    key: '_serviceUnzipQueue',
    value: function _serviceUnzipQueue() {
      var _this10 = this;

      if (this.unzip.active) {
        return;
      }
      if (this.unzip.queue.length === 0) {
        return;
      }
      if (this.unzip.next >= this.unzip.queue.length) {
        var successes = this.unzip.queue.length - this.unzip.failures;
        this.bootstrapping = false;
        this.unzip.queue = [];
        this.unzip.next = 0;
        this._log('Finished module installations. [success: ' + successes + '] [failure: ' + this.unzip.failures + ']');
        this._emit('installing-modules-finished', successes, this.unzip.failures);
        this.unzip.failures = 0;
        return;
      }

      this.unzip.active = true;
      var module = this.unzip.queue[this.unzip.next];
      this.unzip.next += 1;

      this._emit('installing-module', module.name, this.unzip.next, this.unzip.queue.length);

      var onError = function onError(error, zipfile) {
        _this10._log('Failed installing ' + module.name + '@' + module.version + ': ' + JSON.stringify(error));
        succeeded = false;
        if (zipfile) {
          zipfile.readEntry();
        } else {
          _this10._finishUnzip(module, succeeded);
        }
      };

      var succeeded = true;
      var extractRoot = _path2.default.join(this.moduleInstallPath, module.name);
      this._log('Installing ' + module.name + '@' + module.version + ' from ' + module.zipfile);
      try {
        _yauzl2.default.open(module.zipfile, { lazyEntries: true, autoClose: true }, function (error, zipfile) {
          if (error) {
            onError(error, null);
            return;
          }

          var totalEntries = zipfile.entryCount;
          var processedEntries = 0;

          zipfile.on('entry', function (entry) {
            processedEntries += 1;
            _this10._emit('installing-module-progress', module.name, processedEntries / totalEntries);

            // skip directories
            if (/\/$/.test(entry.fileName)) {
              zipfile.readEntry();
              return;
            }

            zipfile.openReadStream(entry, function (error, stream) {
              if (error) {
                onError(error, zipfile);
                return;
              }

              (0, _mkdirp2.default)(_path2.default.join(extractRoot, _path2.default.dirname(entry.fileName)), function (error) {
                if (error) {
                  onError(error, zipfile);
                  return;
                }

                var ws = _fs2.default.createWriteStream(_path2.default.join(extractRoot, entry.fileName)).on('error', function (e) {
                  stream.destroy();
                  onError(e, zipfile);
                });

                stream.on('error', function (e) {
                  return onError(e, zipfile);
                });
                ws.on('finish', function () {
                  return zipfile.readEntry();
                });
                stream.pipe(ws);
              });
            });
          });
          zipfile.on('error', function (error) {
            succeeded = false;
          });
          zipfile.on('end', function () {
            if (succeeded) {
              _this10.installedModules[module.name].installedVersion = module.version;
            }

            _this10._finishUnzip(module, succeeded);
          });
          zipfile.readEntry();
        });
      } catch (e) {
        onError(e, null);
      }
    }
  }, {
    key: '_commitInstalledModules',
    value: function _commitInstalledModules() {
      var data = JSON.stringify(this.installedModules, null, 2);
      _fs2.default.writeFileSync(this.installedModulesPath, data);
    }
  }]);

  return Modules;
}(_events.EventEmitter);

exports.default = Modules;
module.exports = exports['default'];
