// react-freeze shim — replaces the Suspense-based freeze mechanism
// which crashes on Expo Go SDK 54 (old architecture).
// Screens are never "frozen" but the app runs without errors.
const React = require('react');

function Freeze({ children }) {
  return React.createElement(React.Fragment, null, children);
}

module.exports = { Freeze };
