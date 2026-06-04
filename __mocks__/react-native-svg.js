'use strict';
const React = require('react');
const { View } = require('react-native');

function Svg({ children, testID }) {
  return React.createElement(View, { testID }, children);
}

function G({ children }) {
  return React.createElement(View, null, children);
}

const noop = () => null;

module.exports = {
  __esModule: true,
  default: Svg,
  Svg,
  G,
  Path: noop,
  Circle: noop,
  Line: noop,
  Rect: noop,
  Ellipse: noop,
  Polygon: noop,
  Polyline: noop,
  Text: noop,
  Defs: noop,
  ClipPath: noop,
  Use: noop,
};
