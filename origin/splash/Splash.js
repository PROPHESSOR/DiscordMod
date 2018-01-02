'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _reactDom = require('react-dom');

var _reactDom2 = _interopRequireDefault(_reactDom);

var _reactSelect = require('react-select');

var _reactSelect2 = _interopRequireDefault(_reactSelect);

var _electron = require('electron');

var _IntervalMixin = require('../mixins/IntervalMixin');

var _IntervalMixin2 = _interopRequireDefault(_IntervalMixin);

var _quotes_copy = require('../data/quotes_copy.json');

var _quotes_copy2 = _interopRequireDefault(_quotes_copy);

var _Progress = require('./Progress');

var _Progress2 = _interopRequireDefault(_Progress);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var VIDEO_REF = 'video';
var DOWNLOAD_OPTIONS = [{ value: 'deb', label: 'Ubuntu (deb)' }, { value: 'tar.gz', label: 'Linux (tar.gz)' }, { value: 'nope', label: 'I\'ll figure it out' }];
var RELEASE_CHANNEL = _electron.remote.getGlobal('releaseChannel');
var LINUX_DOWNLOAD_URL_BASE = 'https://discordapp.com/api/download/' + RELEASE_CHANNEL + '?platform=linux&format=';

var Splash = _react2.default.createClass({
  displayName: 'Splash',

  mixins: [_IntervalMixin2.default],

  getInitialState: function getInitialState() {
    return {
      quote: _quotes_copy2.default[Math.floor(Math.random() * _quotes_copy2.default.length)],
      videoLoaded: false,
      status: 'checking-for-updates',
      update: {},
      selectedDownload: 'deb'
    };
  },
  componentDidMount: function componentDidMount() {
    var _this = this;

    _reactDom2.default.findDOMNode(this.refs[VIDEO_REF]).addEventListener('loadeddata', this.handleVideoLoaded);
    this.setInterval(1000, this.updateCountdownSeconds);
    _electron.ipcRenderer.on('UPDATE_STATE', function (_e, state) {
      _this.setState({ update: state });
    });
    _electron.ipcRenderer.send('SPLASH_SCREEN_READY');
  },
  updateCountdownSeconds: function updateCountdownSeconds() {
    if (this.state.update.seconds > 0) {
      var newUpdateState = this.state.update;
      newUpdateState.seconds -= 1;
      this.setState({ update: newUpdateState });
    }
  },
  handleVideoLoaded: function handleVideoLoaded() {
    this.setState({ videoLoaded: true });
  },
  handleDownloadChanged: function handleDownloadChanged(selection) {
    this.setState({ selectedDownload: selection.value });
  },
  handleDownload: function handleDownload() {
    if (this.state.selectedDownload != 'nope') {
      var url = LINUX_DOWNLOAD_URL_BASE + this.state.selectedDownload;
      _electron.shell.openExternal(url, { activate: true });
    }
    _electron.remote.app.quit();
  },
  render: function render() {
    var statusText = void 0;
    var progress = _react2.default.createElement(
      'div',
      { className: 'progress-placeholder' },
      '\xA0'
    );
    switch (this.state.update.status) {
      case 'installing-updates':
        statusText = _react2.default.createElement(
          'span',
          null,
          'Installing Update ',
          this.state.update.current,
          ' of ',
          this.state.update.total
        );
        if (this.state.update.progress > 0) {
          progress = _react2.default.createElement(_Progress2.default, { percent: this.state.update.progress });
        }
        break;
      case 'downloading-updates':
        statusText = _react2.default.createElement(
          'span',
          null,
          'Downloading Update ',
          this.state.update.current,
          ' of ',
          this.state.update.total
        );
        if (this.state.update.progress > 0) {
          progress = _react2.default.createElement(_Progress2.default, { percent: this.state.update.progress });
        }
        break;
      case 'update-failure':
        statusText = _react2.default.createElement(
          'span',
          null,
          'Update Failed \u2014 Retrying in ',
          this.state.update.seconds,
          ' sec'
        );
        break;
      case 'launching':
        statusText = _react2.default.createElement(
          'span',
          null,
          'Starting'
        );
        break;
      case 'update-manually':
        var buttonText = this.state.selectedDownload != 'nope' ? 'Download' : 'Okay';
        return _react2.default.createElement(
          'div',
          { id: 'splash' },
          _react2.default.createElement(
            'div',
            { className: 'splash-inner-dl' },
            _react2.default.createElement('div', { className: 'dice-image' }),
            _react2.default.createElement(
              'div',
              { className: 'dl-update-message' },
              'Must be your lucky day, there\u2019s a new update!'
            ),
            _react2.default.createElement(
              'div',
              { className: 'dl-select-frame' },
              _react2.default.createElement(_reactSelect2.default, { value: this.state.selectedDownload,
                autosize: false,
                clearable: false,
                searchable: false,
                options: DOWNLOAD_OPTIONS,
                disabled: false,
                onChange: this.handleDownloadChanged }),
              _react2.default.createElement(
                'div',
                { className: 'dl-button', onClick: this.handleDownload },
                buttonText
              )
            ),
            _react2.default.createElement(
              'div',
              { className: 'dl-version-message' },
              'Version ',
              this.state.update.newVersion,
              ' available'
            )
          )
        );
      case 'checking-for-updates':
      default:
        statusText = _react2.default.createElement(
          'span',
          null,
          'Checking For Updates'
        );
        break;
    }

    return _react2.default.createElement(
      'div',
      { id: 'splash' },
      _react2.default.createElement(
        'div',
        { className: 'splash-inner' },
        _react2.default.createElement(
          'video',
          { autoPlay: true,
            width: 200,
            height: 200,
            loop: true,
            ref: VIDEO_REF,
            className: this.state.videoLoaded && 'loaded' || undefined },
          _react2.default.createElement('source', { src: '../videos/connecting.webm', type: 'video/webm' })
        ),
        _react2.default.createElement(
          'span',
          { className: 'quote' },
          this.state.quote
        ),
        statusText,
        progress
      )
    );
  }
});

exports.default = Splash;
module.exports = exports['default'];
