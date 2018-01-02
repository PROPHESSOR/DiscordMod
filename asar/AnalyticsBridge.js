'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _electron = require('electron');

var _Backoff = require('./common/Backoff');

var _Backoff2 = _interopRequireDefault(_Backoff);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _Paths = require('./common/Paths');

var _Paths2 = _interopRequireDefault(_Paths);

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _log(_msg) {
  // console.log('[AnalyticsBridge] ' + _msg);
}

var SEND_WAIT_INTERVAL = 5000;

var inflight = null;
var sendTimeout = null;
var backoff = new _Backoff2.default(30000, 60000);
var events = [];

function eventsFile() {
  return _path2.default.join(_Paths2.default.getUserData(), 'queued_analytics_events.json');
}

function saveEvents() {
  var EVENTS_FILE = eventsFile();
  var collect = events.concat(inflight || []);

  return new Promise(function (resolve) {
    _fs2.default.writeFile(EVENTS_FILE, JSON.stringify(collect), resolve);
  });
}

function loadEvents() {
  var EVENTS_FILE = eventsFile();
  return new Promise(function (resolve) {
    if (!_fs2.default.existsSync(EVENTS_FILE)) {
      return resolve([]);
    }

    _fs2.default.readFile(EVENTS_FILE, function (error, contents) {
      if (error) {
        return resolve([]);
      }

      resolve(JSON.parse(contents));
    });
  });
}

function send() {
  if (events.length == 0) {
    _log('nothing to send');
    return;
  }

  if (inflight !== null) {
    _log('send already in progress, waiting');
    return;
  }

  if (backoff.pending) {
    _log('backoff in progress, waiting');
    return;
  }

  function tryAgain() {
    if (!backoff.pending) {
      backoff.fail(function () {
        return process.nextTick(send);
      });
    }
  }

  var win = _electron.BrowserWindow.fromId(global.mainWindowId);
  if (win && win.webContents) {
    inflight = events;
    events = [];
    _log('sending events ' + JSON.stringify(inflight) + ')');
    win.webContents.send('TRACK_ANALYTICS_EVENT', inflight);
    sendTimeout = setTimeout(function () {
      if (inflight !== null) {
        _log('Timeout, resending uncommitted events ' + JSON.stringify(inflight));
        events = events.concat(inflight);
        inflight = null;
        tryAgain();
      }
    }, SEND_WAIT_INTERVAL);
  } else {
    _log('window not ready yet');
    tryAgain();
  }
}

_electron.ipcMain.on('TRACK_ANALYTICS_EVENT_COMMIT', function (_e) {
  _log('committed events ' + JSON.stringify(inflight) + ')');
  backoff.succeed();
  clearTimeout(sendTimeout);
  inflight = null;
  saveEvents().then(send).catch(_log);
});

function track() {
  for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
    args[_key] = arguments[_key];
  }

  events.push(args);
  saveEvents();
  send();
}

_electron.app.once('ready', function () {
  loadEvents().then(function (loadedEvents) {
    _log('Loaded events ' + JSON.stringify(loadedEvents));
    events = events.concat(loadedEvents);
    send();
  }).catch(_log);
});

exports.default = { track: track };
module.exports = exports['default'];
