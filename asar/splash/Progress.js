"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _react = require("react");

var _react2 = _interopRequireDefault(_react);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var Progress = function Progress(_ref) {
  var _ref$percent = _ref.percent,
      percent = _ref$percent === undefined ? 0 : _ref$percent;
  return _react2.default.createElement(
    "div",
    { className: "progress" },
    _react2.default.createElement(
      "div",
      { className: "progress-bar" },
      _react2.default.createElement("div", { className: "complete", style: { width: percent + "%" } })
    )
  );
};

exports.default = Progress;
module.exports = exports['default'];
